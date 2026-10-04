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

// Indian food mark: square outline with a dot; the text label keeps it readable without colour.
export function VegMark({ isVeg }: { isVeg: boolean }) {
  const color = isVeg ? "var(--color-veg)" : "var(--color-nonveg)";
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color }}>
      <span
        aria-hidden
        className="inline-flex size-3.5 items-center justify-center rounded-[2px] border-[1.5px]"
        style={{ borderColor: color }}
      >
        <span className="size-1.5 rounded-full" style={{ background: color }} />
      </span>
      {isVeg ? "Veg" : "Non-veg"}
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

// Chef-hat mark used in the logo.
export function ChefHat({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M14 30c-4.4 0-8-3.4-8-7.8 0-4.2 3.3-7.6 7.6-7.8C14.9 9.6 19 6 24 6s9.1 3.6 10.4 8.4c4.3.2 7.6 3.6 7.6 7.8 0 4.4-3.6 7.8-8 7.8" />
      <path d="M14 26v14h20V26" />
      <path d="M14 34h20" />
    </svg>
  );
}

// "La Patisserie" wordmark with the chef hat and tagline.
export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cx("flex flex-col items-center text-center", className)}>
      <ChefHat className={cx("text-brand", compact ? "size-7" : "size-10")} />
      <span className={cx("font-display font-medium leading-none text-ink", compact ? "mt-1 text-2xl" : "mt-1.5 text-4xl")}>La Patisserie</span>
      {!compact && <span className="mt-1.5 whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.18em] text-muted">More than cakes, sweeter moments</span>}
    </div>
  );
}
