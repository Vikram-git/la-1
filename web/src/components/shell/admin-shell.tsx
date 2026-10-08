"use client";

import { useRef, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ChartLine,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Package,
  Search,
  Settings,
  ShoppingCart,
  Star,
  Store,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Brand, ScriptText, cx } from "@/components/ui";
import { isActivePath, type NavIcon, type NavSection } from "@/lib/shell";
import { signOut } from "@/app/login/actions";

const ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  orders: ShoppingCart,
  counter: Store,
  calendar: CalendarDays,
  products: Package,
  customers: Users,
  analytics: ChartLine,
  staff: UserCog,
  settings: Settings,
  bell: Bell,
  offers: Megaphone,
  reviews: Star,
};

type Counts = { pending: number; attention: number };

function SidebarContent({ sections, counts, onNavigate }: { sections: NavSection[]; counts: Counts; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <Link href="/admin" onClick={onNavigate} className="px-4 pb-5 pt-6" aria-label="La Patisserie, Dashboard">
        <Brand />
      </Link>
      <nav aria-label="Admin" className="flex flex-1 flex-col gap-4 px-3">
        {sections.map((section) => (
          <div key={section.title ?? "main"}>
            {section.title && <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted">{section.title}</p>}
            <ul className="flex flex-col gap-1">
              {section.items.map((item) => {
                const Icon = ICONS[item.icon];
                const active = isActivePath(pathname, item.href);
                const badge = item.badge === "pending" ? counts.pending : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] transition-colors",
                        active ? "bg-brand font-medium text-white shadow-sm shadow-brand/30" : item.soon ? "text-muted hover:bg-brand-soft" : "text-ink hover:bg-brand-soft",
                      )}
                    >
                      <Icon aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
                      <span className="flex-1">{item.label}</span>
                      {badge > 0 && (
                        <span
                          className={cx(
                            "min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs font-semibold",
                            active ? "bg-white text-brand-strong" : "bg-brand text-white",
                          )}
                        >
                          {badge}
                          <span className="sr-only"> waiting</span>
                        </span>
                      )}
                      {item.soon && !active && <span className="text-[10px] uppercase tracking-wide text-muted">Soon</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="relative mt-4 h-40 shrink-0 overflow-hidden">
        <ScriptText className="absolute left-5 top-1 z-10 block -rotate-6 text-[26px]">
          Baked with Love,
          <br />
          &nbsp;&nbsp;Always ♥
        </ScriptText>
        <Image src="/brand/chocolate.jpg" alt="" fill sizes="256px" className="object-cover object-[50%_70%] opacity-90 [mask-image:linear-gradient(to_bottom,transparent,black_45%)]" />
      </div>
    </div>
  );
}

function UserMenu({ name, roleLabel }: { name: string; roleLabel: string }) {
  return (
    <details className="group relative">
      <summary
        aria-label={`Account menu, ${name}`}
        className="flex cursor-pointer list-none items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-brand-soft [&::-webkit-details-marker]:hidden"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-brand font-display text-lg text-white">{name.slice(0, 1).toUpperCase()}</span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium leading-tight">{name}</span>
          <span className="block text-xs text-muted">{roleLabel}</span>
        </span>
        <ChevronDown aria-hidden className="size-4 text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-48 rounded-2xl border border-line bg-surface p-2 shadow-lg">
        <form action={signOut}>
          <button type="submit" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-brand-soft">
            <LogOut aria-hidden className="size-4" /> Sign out
          </button>
        </form>
      </div>
    </details>
  );
}

export function AdminShell({
  sections,
  counts,
  name,
  roleLabel,
  children,
}: {
  sections: NavSection[];
  counts: Counts;
  name: string;
  roleLabel: string;
  children: ReactNode;
}) {
  // Phone and tablet menu: a modal <dialog>, so focus moves into it, Escape closes it and the page
  // behind is inert. It also closes when a menu link is tapped.
  const menu = useRef<HTMLDialogElement>(null);
  const openMenu = () => menu.current?.showModal();
  const closeMenu = () => menu.current?.close();

  return (
    <div className="relative min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-line bg-surface/95 lg:block">
        <SidebarContent sections={sections} counts={counts} />
      </aside>

      {/* Phone and tablet menu */}
      <dialog
        ref={menu}
        aria-label="Menu"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeMenu(); // a tap on the dimmed backdrop
        }}
        className="m-0 h-dvh max-h-none w-72 max-w-[85vw] bg-surface p-0 shadow-xl backdrop:bg-ink/30 lg:hidden"
      >
        <button type="button" aria-label="Close menu" onClick={closeMenu} className="absolute right-3 top-3 z-10 rounded-full p-2 hover:bg-brand-soft">
          <X aria-hidden className="size-5" />
        </button>
        <SidebarContent sections={sections} counts={counts} onNavigate={closeMenu} />
      </dialog>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-line/70 bg-canvas/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-8">
            <button type="button" aria-label="Open menu" onClick={openMenu} className="rounded-xl p-2 hover:bg-brand-soft lg:hidden">
              <Menu aria-hidden className="size-6" />
            </button>
            <form action="/admin/orders" role="search" className="relative max-w-xl flex-1">
              <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
              {/* Searches both order lists, every status and date (see searchEverywhere). */}
              <input type="hidden" name="scope" value="all" />
              <input type="hidden" name="when" value="all" />
              <input
                name="q"
                type="search"
                aria-label="Search orders by number, customer name or phone"
                placeholder="Search orders, customers, phone…"
                className="w-full rounded-2xl border border-line bg-surface py-2.5 pl-10 pr-4 text-sm placeholder:text-muted/80 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </form>
            <ScriptText className="ml-auto hidden -rotate-3 whitespace-nowrap text-3xl xl:block">Good Cakes, Better Days ♥</ScriptText>
            <div className="ml-auto flex items-center gap-2 xl:ml-4">
              <Link
                href="/admin"
                aria-label={counts.attention > 0 ? `${counts.attention} things need attention` : "Nothing needs attention"}
                className="relative rounded-full p-2.5 hover:bg-brand-soft"
              >
                <Bell aria-hidden className="size-6 text-ink" strokeWidth={1.75} />
                {counts.attention > 0 && (
                  <span className="absolute right-1 top-1 flex min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-semibold text-white">
                    {counts.attention > 99 ? "99+" : counts.attention}
                  </span>
                )}
              </Link>
              <UserMenu name={name} roleLabel={roleLabel} />
            </div>
          </div>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>

        <footer className="px-4 pb-8 pt-4 text-center">
          <p className="font-display text-sm italic text-muted">
            Cakes don&apos;t just fill stomachs, they fill hearts. <span className="text-brand">♥</span>
          </p>
          <p className="mt-1 font-display text-sm uppercase tracking-[0.3em] text-ink">La Patisserie</p>
        </footer>
      </div>
    </div>
  );
}
