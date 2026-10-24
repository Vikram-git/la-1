import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaff, homeFor } from "@/lib/auth";
import Image from "next/image";
import Link from "next/link";
import { Brand, ScriptText } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Staff sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const staff = await getStaff();
  if (staff) redirect(homeFor(staff.role));

  const { next } = await searchParams;

  return (
    <main className="grid flex-1 lg:grid-cols-[1.1fr_1fr]">
      {/* Brand side: the patisserie photo with the script line (hidden on phones). */}
      <div className="relative hidden overflow-hidden lg:block">
        <Image src="/brand/hero.jpg" alt="" fill fetchPriority="high" sizes="55vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <ScriptText className="block text-6xl text-white">Good Cakes, Better Days ♥</ScriptText>
          <p className="mt-4 max-w-md font-display text-lg italic text-white/90">Cakes don&apos;t just fill stomachs, they fill hearts.</p>
        </div>
      </div>

      <div className="flex items-center justify-center px-5 py-10 sm:py-16">
        <div className="w-full max-w-sm">
          <Brand />
          <div className="mt-10 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand">Staff portal</p>
            <h1 className="mt-2 text-3xl font-semibold">Welcome back</h1>
            <p className="mt-2 text-sm text-muted">Sign in to manage orders, production and deliveries.</p>
          </div>
          <div className="mt-8 rounded-3xl border border-line/90 bg-surface p-6 shadow-[0_1px_2px_rgba(58,42,48,0.04),0_18px_40px_-24px_rgba(185,63,99,0.35)] sm:p-7">
            <LoginForm next={typeof next === "string" ? next : undefined} />
          </div>
          <p className="mt-6 text-center text-sm">
            <Link href="/forgot-password" className="font-medium text-brand hover:underline">Forgot password?</Link>
          </p>
          <ScriptText className="mt-8 block text-center text-3xl">Baked with Love, Always ♥</ScriptText>
        </div>
      </div>
    </main>
  );
}
