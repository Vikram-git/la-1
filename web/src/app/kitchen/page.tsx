import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";
import { getBusinessTimezone } from "@/lib/settings";
import { formatDayHeading, formatTime, zonedDayKey } from "@/lib/time";
import { fulfilmentLabel } from "@/lib/orders";
import {
  KITCHEN_TABS,
  cakeRows,
  groupChefWork,
  itemTotals,
  kitchenTab,
  tabRange,
  type ChefLine,
  type ChefOrder,
} from "@/lib/kitchen";
import { ProductThumb } from "@/components/product-thumb";
import { Alert, Badge, ChefHat, EmptyState, ScriptText, VegMark, cx } from "@/components/ui";
import { AutoRefresh } from "./auto-refresh";

export const metadata: Metadata = { title: "Kitchen" };

// The chef screen (owner, 2026-10-20): what to make, per kitchen, with no amounts, payments or customer
// details. Everything comes from public.chef_work; chefs cannot read orders or prices directly.

function str(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

function Chip({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cx(
        "rounded-full border px-4 py-2 text-base font-medium",
        active ? "border-brand bg-brand-soft text-brand-strong" : "border-line bg-surface hover:border-brand",
      )}
    >
      {children}
    </Link>
  );
}

function OrderStatusBadge({ status }: { status: ChefOrder["status"] }) {
  if (status === "cancelled") return <Badge tone="danger">Cancelled — stop</Badge>;
  if (status === "ready") return <Badge tone="ok">Packed ✓</Badge>;
  if (status === "preparing") return <Badge tone="warn">Preparing</Badge>;
  return <Badge tone="info">To make</Badge>;
}

function FulfilmentTag({ fulfilment }: { fulfilment: ChefOrder["fulfilment"] }) {
  const setup = fulfilment === "setup";
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-sm font-semibold",
        setup ? "border-danger/40 bg-danger-soft text-danger" : "border-ok/40 bg-ok-soft text-ok",
      )}
    >
      <span aria-hidden>{setup ? "🚚" : "🏪"}</span>
      {fulfilmentLabel[fulfilment]}
    </span>
  );
}

function CakeNote({ line, photoUrl }: { line: ChefLine; photoUrl: string | null }) {
  const rows = cakeRows(line.cake ?? {});
  return (
    <div className="rounded-sm border border-note-line bg-note p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-lg font-semibold">🎂 Custom cake · {line.size}</p>
        {line.cake?.is_eggless && <Badge tone="ok">Eggless</Badge>}
      </div>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row">
        {photoUrl && (
          <a href={photoUrl} target="_blank" rel="noreferrer" className="shrink-0" title="Open the reference photo">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URL */}
            <img src={photoUrl} alt="Reference photo" className="h-40 w-40 rounded-lg border border-note-line bg-surface object-cover" />
          </a>
        )}
        <dl className="grid flex-1 grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-base">
          {rows.map((r) => (
            <div key={r.label} className="contents">
              <dt className="text-muted">{r.label}</dt>
              <dd className="font-medium whitespace-pre-line">{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      {line.notes && <p className="mt-3 text-base"><span className="text-muted">Note:</span> {line.notes}</p>}
    </div>
  );
}

function OrderCard({ order, tz, showDay, photos, multiKitchen }: {
  order: ChefOrder;
  tz: string;
  showDay: boolean;
  photos: Map<string, string>;
  multiKitchen: boolean;
}) {
  const closed = order.status === "cancelled";
  const packed = order.status === "ready";
  return (
    <article
      className={cx(
        "flex flex-col gap-4 rounded-2xl border bg-surface p-5 shadow-[0_8px_30px_-20px_rgba(176,58,94,0.35)]",
        closed ? "border-danger/40 opacity-80" : packed ? "border-ok/40 opacity-75" : "border-line",
        order.fulfilment === "setup" && !closed && "border-l-4 border-l-danger",
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-3xl font-semibold tabular-nums">
            {order.isImmediate ? "Now" : formatTime(order.dueAt, tz)}
            {showDay && <span className="ml-2 text-base font-normal text-muted">{formatDayHeading(zonedDayKey(order.dueAt, tz))}</span>}
          </p>
          <p className="mt-0.5 text-base text-muted">Order {order.reference}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FulfilmentTag fulfilment={order.fulfilment} />
          <OrderStatusBadge status={order.status} />
        </div>
      </header>

      {closed && (
        <Alert tone="danger" title="This order was cancelled">Stop work on it. Ask the counter what to do with anything already made.</Alert>
      )}

      <ul className="flex flex-col gap-3">
        {order.lines.map((l) =>
          l.cake ? (
            <li key={l.id}>
              <CakeNote line={l} photoUrl={l.cake.photo_path ? (photos.get(l.cake.photo_path) ?? null) : null} />
              {!l.kitchenId && <p className="mt-1 text-sm font-medium text-warn">No kitchen set yet — check with the counter who makes it.</p>}
            </li>
          ) : (
            <li key={l.id} className={cx("flex items-start gap-3", closed && "line-through decoration-danger/60")}>
              <ProductThumb url={l.imageUrl} name={l.name} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-lg leading-snug">
                  <span className="font-bold tabular-nums">{l.quantity} ×</span> <span className="font-semibold">{l.name}</span>{" "}
                  <span className="text-muted">· {l.size}</span>
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <VegMark isVeg={l.isVeg} />
                  {l.isEggless && <Badge tone="ok">Eggless</Badge>}
                  {multiKitchen && l.kitchenName && <Badge>{l.kitchenName}</Badge>}
                  {!l.kitchenId && <Badge tone="warn">No kitchen set</Badge>}
                </div>
                {l.notes && <p className="mt-1 text-base"><span className="text-muted">Note:</span> {l.notes}</p>}
              </div>
            </li>
          ),
        )}
      </ul>
    </article>
  );
}

export default async function KitchenPage({ searchParams }: PageProps<"/kitchen">) {
  const staff = await requireRole(["chef", "admin", "counter"]);
  const params = await searchParams;
  const tab = kitchenTab(str(params.tab));
  const tz = await getBusinessTimezone();
  const now = new Date();
  const todayKey = zonedDayKey(now, tz);
  const range = tabRange(tab, todayKey);

  const supabase = await createClient();
  const [{ data: rows, error }, { data: kitchenRows }, { data: mine }] = await Promise.all([
    supabase.rpc("chef_work", { p_from: range.from, p_to: range.to }),
    supabase.from("kitchens").select("id, name").eq("is_active", true).order("sort_order"),
    supabase.from("staff_kitchens").select("kitchen_id").eq("user_id", staff.userId),
  ]);
  // Chefs switch between their own kitchens; admins and counter staff (checking the screen) between all.
  const myIds = new Set((mine ?? []).map((m) => m.kitchen_id));
  const kitchens = (kitchenRows ?? []).filter((k) => staff.role !== "chef" || myIds.has(k.id));
  const kitchenId = kitchens.some((k) => k.id === str(params.k)) ? str(params.k) : null;
  const orders = groupChefWork(rows ?? [], kitchenId);
  const totals = itemTotals(orders);
  const open = orders.filter((o) => o.status !== "cancelled" && o.status !== "ready").length;

  // Reference photos of custom cakes: short-lived signed links (storage lets a chef open only cakes on this screen).
  const photoPaths = [...new Set(orders.flatMap((o) => o.lines.flatMap((l) => (l.cake?.photo_path ? [l.cake.photo_path] : []))))];
  const photos = new Map<string, string>();
  if (photoPaths.length) {
    const { data: signed } = await supabase.storage.from("custom-cake-photos").createSignedUrls(photoPaths, 3600);
    for (const s of signed ?? []) if (s.path && s.signedUrl) photos.set(s.path, s.signedUrl);
  }

  const link = (overrides: Record<string, string>) => {
    const q = new URLSearchParams({ tab, ...(kitchenId ? { k: kitchenId } : {}), ...overrides });
    if (!q.get("k")) q.delete("k");
    return `/kitchen?${q}`;
  };
  const heading = staff.role === "chef"
    ? (kitchens.length ? kitchens.map((k) => k.name).join(" + ") : "No kitchen ticked")
    : "Chef screen (all kitchens)";

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-surface px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <ChefHat className="size-9 text-brand" />
          <div>
            <p className="font-display text-lg leading-none">La Patisserie <span className="text-sm text-muted">· Kitchen</span></p>
            <h1 className="mt-1 text-xl font-semibold">{heading}</h1>
          </div>
        </div>
        <AutoRefresh loadedAt={now.toISOString()} tz={tz} />
        <div className="flex items-center gap-3">
          {staff.role !== "chef" && (
            <Link href="/admin" className="rounded-xl border border-line bg-surface px-4 py-2.5 text-base font-medium hover:bg-brand-soft">
              Back to admin
            </Link>
          )}
          <span className="text-base">{staff.fullName}</span>
          <form action={signOut}>
            <button type="submit" className="rounded-xl border border-line bg-surface px-4 py-2.5 text-base font-medium hover:bg-brand-soft">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-5 px-4 py-5 sm:px-5">
        {staff.role === "chef" && kitchens.length === 0 && (
          <Alert tone="warn" title="No kitchen ticked for you">
            You see only items that have no kitchen yet. Ask an admin to tick your kitchen on the Staff page.
          </Alert>
        )}
        {error && <Alert tone="danger" title="Could not load the kitchen list">{error.message}</Alert>}

        <nav aria-label="Days" className="flex flex-wrap items-center gap-2">
          {KITCHEN_TABS.map((t) => (
            <Chip key={t.key} href={link({ tab: t.key })} active={tab === t.key}>{t.label}</Chip>
          ))}
          {kitchens.length > 1 && (
            <>
              <span className="mx-2 h-6 w-px bg-line" aria-hidden />
              <Chip href={link({ k: "" })} active={!kitchenId}>All kitchens</Chip>
              {kitchens.map((k) => (
                <Chip key={k.id} href={link({ k: k.id })} active={kitchenId === k.id}>{k.name}</Chip>
              ))}
            </>
          )}
        </nav>

        <p className="text-base text-muted">
          {tab === "later" ? "Next two weeks" : formatDayHeading(range.from)} · {open} order{open === 1 ? "" : "s"} to make
        </p>

        {totals.length > 0 && (
          <section aria-label="Totals" className="rounded-2xl border border-brand/20 bg-brand-soft/50 p-4">
            <h2 className="mb-2 text-base font-semibold">Total to make</h2>
            <ul className="flex flex-wrap gap-x-6 gap-y-1 text-base">
              {totals.map((t) => (
                <li key={`${t.name}-${t.size}`}>
                  <span className="font-bold tabular-nums">{t.quantity} ×</span> {t.name} <span className="text-muted">· {t.size}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {orders.length === 0 ? (
          <EmptyState title="Nothing to make here">Orders appear as soon as the counter confirms them.</EmptyState>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {orders.map((o) => (
              <OrderCard key={o.id} order={o} tz={tz} showDay={tab === "later"} photos={photos} multiKitchen={kitchens.length > 1 && !kitchenId} />
            ))}
          </div>
        )}
      </main>
      <footer className="px-5 pb-6 text-center">
        <ScriptText className="text-3xl">Handle with care, it&apos;s someone&apos;s happiness ♥</ScriptText>
      </footer>
    </div>
  );
}
