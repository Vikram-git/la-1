// Admin shell: the sidebar's menu per role and the bell's count. Pure: imported by unit tests, so
// keep any imports from "@/" type-only.
import type { Enums } from "@/lib/database.types";

type Role = Exclude<Enums<"staff_role">, "chef">;

export type NavIcon =
  | "dashboard" | "orders" | "counter" | "calendar" | "kot" | "products" | "customers" | "analytics"
  | "staff" | "settings" | "cake" | "bell" | "offers" | "reviews";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  roles: Role[];
  badge?: "pending" | "kitchen"; // filled from the shell counts
  soon?: boolean; // a "Coming soon" placeholder page
};

export type NavSection = { title: string | null; items: NavItem[] };

const BOTH: Role[] = ["admin", "counter"];
const ADMIN: Role[] = ["admin"];

const SECTIONS: NavSection[] = [
  {
    title: null,
    items: [
      { href: "/admin", label: "Dashboard", icon: "dashboard", roles: BOTH },
      { href: "/admin/orders", label: "Orders", icon: "orders", roles: BOTH, badge: "pending" },
      { href: "/admin/counter", label: "Counter Sale", icon: "counter", roles: BOTH },
      { href: "/admin/calendar", label: "Calendar", icon: "calendar", roles: BOTH },
      { href: "/admin/kot", label: "KOT", icon: "kot", roles: BOTH, badge: "kitchen" },
      { href: "/admin/products", label: "Products", icon: "products", roles: BOTH },
      { href: "/admin/customers", label: "Customers", icon: "customers", roles: ADMIN },
      { href: "/admin/reports", label: "Analytics", icon: "analytics", roles: ADMIN },
      { href: "/admin/staff", label: "Staff & Kitchens", icon: "staff", roles: ADMIN },
      { href: "/admin/settings", label: "Shop Settings", icon: "settings", roles: ADMIN },
    ],
  },
  {
    title: "Coming soon",
    items: [
      { href: "/admin/soon/custom-cakes", label: "Custom Cake Requests", icon: "cake", roles: BOTH, soon: true },
      { href: "/admin/soon/notifications", label: "Notifications", icon: "bell", roles: BOTH, soon: true },
      { href: "/admin/soon/offers", label: "Offers & Banners", icon: "offers", roles: ADMIN, soon: true },
      { href: "/admin/soon/reviews", label: "Reviews", icon: "reviews", roles: ADMIN, soon: true },
    ],
  },
];

export function navSections(role: Role): NavSection[] {
  return SECTIONS.map((s) => ({ ...s, items: s.items.filter((i) => i.roles.includes(role)) })).filter((s) => s.items.length > 0);
}

export function isActivePath(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

// What the bell counts until real notifications exist (piece 5): orders awaiting confirmation,
// kitchen alerts (unacknowledged changes, stop-work, open issues) and late pickups.
export function attentionCount(c: { pending?: number | null; kitchenAlerts?: number | null; latePickups?: number | null }): number {
  return [c.pending, c.kitchenAlerts, c.latePickups].reduce<number>((sum, n) => sum + Math.max(0, n ?? 0), 0);
}

// The placeholder pages behind the "Coming soon" items.
export const SOON_PAGES: Record<string, { title: string; text: string }> = {
  "custom-cakes": {
    title: "Custom Cake Requests",
    text: "Flavour, size, tiers, theme, cream, filling, toppings, message and a reference photo for each custom cake, shown to the kitchen as a note card. Coming next, after product photos.",
  },
  notifications: {
    title: "Notifications",
    text: "New orders waiting, kitchen issues, changes the kitchen has not seen and late pickups, in one list. Until then the bell opens the Dashboard, which shows the same alerts.",
  },
  offers: {
    title: "Offers & Banners",
    text: "Promotions and banners for the public website. They come with the website.",
  },
  reviews: {
    title: "Reviews",
    text: "Customer reviews from the public website. They come with the website.",
  },
};
