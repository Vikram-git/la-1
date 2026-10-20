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
        "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium sm:text-base",
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
            <img src={photoUrl} alt="Reference photo" className="h-56 w-full rounded-lg border border-note-line bg-surface object-cover sm:h-40 sm:w-40" />
          </a>
        )}
        <dl className="grid min-w-0 flex-1 grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-base">
          {rows.map((r) => (
            <div key={r.label} className="contents">
              <dt className="text-muted">{r.label}</dt>
              <dd className="min-w-0 break-words font-medium whitespace-pre-line">{r.value}</dd>
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
        "flex min-w-0 flex-col gap-4 rounded-2xl border bg-surface p-4 shadow-[0_8px_30px_-20px_rgba(176,58,94,0.35)] sm:p-5",
        closed ? "border-danger/40 opacity-80" : packed ? "border-ok/40 opacity-75" : "border-line",
        order.fulfilment === "setup" && !closed && "border-l-4 border-l-danger",
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tabular-nums sm:text-3xl">
            {order.isImmediate ? "Now" : formatTime(order.dueAt, tz)}
          </p>
          {showDay && <p className="text-base font-medium text-ink">{formatDayHeading(zonedDayKey(order.dueAt, tz))}</p>}
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
                <p className="break-words text-base leading-snug sm:text-lg">
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
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 items-center gap-3">
            <ChefHat className="size-8 shrink-0 text-brand sm:size-9" />
            <div className="min-w-0">
              <p className="font-display text-base leading-none sm:text-lg">La Patisserie <span className="text-sm text-muted">· Kitchen</span></p>
              <h1 className="mt-1 truncate text-lg font-semibold sm:text-xl">{heading}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:order-last sm:gap-3">
            {staff.role !== "chef" && (
              <Link href="/admin" className="rounded-xl border border-line bg-surface px-3 py-2 text-sm font-medium hover:bg-brand-soft sm:px-4 sm:py-2.5 sm:text-base">
                Admin
              </Link>
            )}
            <span className="hidden text-base lg:inline">{staff.fullName}</span>
            <form action={signOut}>
              <button type="submit" className="rounded-xl border border-line bg-surface px-3 py-2 text-sm font-medium hover:bg-brand-soft sm:px-4 sm:py-2.5 sm:text-base">
                Sign out
              </button>
            </form>
          </div>
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:flex-1 sm:justify-center">
            <span className="text-sm text-muted lg:hidden">{staff.fullName}</span>
            <AutoRefresh loadedAt={now.toISOString()} tz={tz} />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-5">
        {staff.role === "chef" && kitchens.length === 0 && (
          <Alert tone="warn" title="No kitchen ticked for you">
            You see only items that have no kitchen yet. Ask an admin to tick your kitchen on the Staff page.
          </Alert>
        )}
        {error && <Alert tone="danger" title="Could not load the kitchen list">{error.message}</Alert>}

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
          <nav aria-label="Days" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {KITCHEN_TABS.map((t) => (
              <Chip key={t.key} href={link({ tab: t.key })} active={tab === t.key}>{t.label}</Chip>
            ))}
          </nav>
          {kitchens.length > 1 && (
            <nav aria-label="Kitchens" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 lg:border-l lg:border-line lg:pl-4">
              <Chip href={link({ k: "" })} active={!kitchenId}>All kitchens</Chip>
              {kitchens.map((k) => (
                <Chip key={k.id} href={link({ k: k.id })} active={kitchenId === k.id}>{k.name}</Chip>
              ))}
            </nav>
          )}
        </div>

        <p className="text-base text-muted">
          {tab === "later" ? "Next two weeks" : formatDayHeading(range.from)} · {open} order{open === 1 ? "" : "s"} to make
        </p>

        {totals.length > 0 && (
          <section aria-label="Totals" className="rounded-2xl border border-brand/20 bg-brand-soft/50 p-4">
            <h2 className="mb-2 text-base font-semibold">Total to make</h2>
            <ul className="grid gap-x-6 gap-y-1 text-base sm:flex sm:flex-wrap">
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
          <div className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {orders.map((o) => (
              <OrderCard key={o.id} order={o} tz={tz} showDay={tab === "later"} photos={photos} multiKitchen={kitchens.length > 1 && !kitchenId} />
            ))}
          </div>
        )}
      </main>
      <footer className="px-5 pb-6 text-center">
        <ScriptText className="text-2xl sm:text-3xl">Handle with care, it&apos;s someone&apos;s happiness ♥</ScriptText>
      </footer>
    </div>
  );
}
