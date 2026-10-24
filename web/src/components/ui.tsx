import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const buttonVariants = {
  primary: "bg-brand text-white shadow-sm shadow-brand/25 hover:bg-brand-strong disabled:opacity-60",
  secondary: "bg-surface text-ink border border-line hover:border-brand/40 hover:bg-brand-soft disabled:opacity-60",
  danger: "bg-surface text-danger border border-danger/40 hover:bg-danger-soft disabled:opacity-60",
  ghost: "text-brand hover:bg-brand-soft disabled:opacity-60",
};

type ButtonVariant = keyof typeof buttonVariants;

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed";

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button className={cx(buttonBase, buttonVariants[variant], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={cx(buttonBase, buttonVariants[variant], className)} {...props} />;
}

const fieldBase =
  "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-canvas";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(fieldBase, className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cx(fieldBase, "pr-8", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cx(fieldBase, "min-h-20", className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-danger" id={`${htmlFor}-error`}>
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Checkbox({
  label,
  hint,
  ...props
}: ComponentProps<"input"> & { label: string; hint?: string }) {
  return (
    <label className="flex items-start gap-2.5 text-sm">
      <input type="checkbox" className="mt-0.5 size-4 accent-brand" {...props} />
      <span>
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cx("rounded-2xl border border-line/80 bg-surface p-5 shadow-[0_8px_30px_-16px_rgba(176,58,94,0.28)]", className)}
      {...props}
    />
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const badgeTones = {
  neutral: "bg-canvas text-muted border-line",
  brand: "bg-brand-soft text-brand-strong border-brand/20",
  info: "bg-info-soft text-info border-info/20",
  ok: "bg-ok-soft text-ok border-ok/20",
  warn: "bg-warn-soft text-warn border-warn/30",
  danger: "bg-danger-soft text-danger border-danger/20",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: keyof typeof badgeTones;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Alert({
  tone = "warn",
  title,
  children,
}: {
  tone?: "warn" | "danger" | "ok" | "brand";
  title?: string;
  children?: ReactNode;
}) {
  const tones = {
    warn: "border-warn/30 bg-warn-soft text-warn",
    danger: "border-danger/30 bg-danger-soft text-danger",
    ok: "border-ok/30 bg-ok-soft text-ok",
    brand: "border-brand/20 bg-brand-soft text-brand-strong",
  };
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("rounded-2xl border px-4 py-3 text-sm", tones[tone])}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? "mt-1" : undefined}>{children}</div>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-brand/30 bg-surface px-6 py-10 text-center">
      <p className="font-display text-lg">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}

// Handwritten accent lines ("Baked with Love, Always"). Decorative: hidden from screen readers.
export function ScriptText({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span aria-hidden className={cx("font-script text-script leading-tight", className)}>
      {children}
    </span>
  );
}

// "LP" monogram in a fine double ring, rose-gold gradient. Strokes only (no text), so it renders the
// same without fonts: the favicon (app/icon.svg) and the quotation file draw the same paths.
export const LOGO_PATHS = {
  ring: "M32 3.5a28.5 28.5 0 1 1 0 57a28.5 28.5 0 1 1 0-57",
  innerRing: "M32 7.5a24.5 24.5 0 1 1 0 49a24.5 24.5 0 1 1 0-49",
  l: "M21.5 19.5h6M24.5 19.5v24.5h12.5",
  p: "M30 19.5h7.25a6.25 6.25 0 0 1 0 12.5H33M33 19.5v24.5M30 44h6",
  sparkle: "M32 11.2l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z",
} as const;

export function LogoMark({ className, glow = true }: { className?: string; glow?: boolean }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      className={cx(glow && "drop-shadow-[0_6px_14px_rgba(185,63,99,0.28)]", className)}
    >
      <defs>
        <linearGradient id="lp-rose-gold" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e7b99a" />
          <stop offset="0.5" stopColor="#c7837a" />
          <stop offset="1" stopColor="#b93f63" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="31" fill="#fffafb" />
      <path d={LOGO_PATHS.ring} stroke="url(#lp-rose-gold)" strokeWidth="1.6" />
      <path d={LOGO_PATHS.innerRing} stroke="url(#lp-rose-gold)" strokeWidth="0.6" opacity="0.7" />
      <path d={LOGO_PATHS.l} stroke="url(#lp-rose-gold)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={LOGO_PATHS.p} stroke="url(#lp-rose-gold)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={LOGO_PATHS.sparkle} fill="url(#lp-rose-gold)" />
    </svg>
  );
}

// "MADRAS" between two thin rose-gold rules, under the wordmark.
export function CityLine({ className }: { className?: string }) {
  return (
    <span className={cx("flex items-center justify-center gap-3", className)}>
      <span aria-hidden className="h-px w-8 bg-gradient-to-r from-transparent to-gold" />
      <span className="text-[10px] font-medium uppercase tracking-[0.42em] text-gold [font-variant:small-caps]">Madras</span>
      <span aria-hidden className="h-px w-8 bg-gradient-to-l from-transparent to-gold" />
    </span>
  );
}

// "La Patisserie" wordmark with the LP mark and "MADRAS".
export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cx("flex flex-col items-center text-center", className)}>
      <LogoMark className={compact ? "size-10" : "size-16"} />
      <span className={cx("font-display font-medium leading-none text-ink", compact ? "mt-2 text-2xl" : "mt-3 text-4xl")}>La Patisserie</span>
      <CityLine className={compact ? "mt-1.5" : "mt-2.5"} />
    </div>
  );
}
