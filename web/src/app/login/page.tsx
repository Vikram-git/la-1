import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaff, homeFor } from "@/lib/auth";
import Image from "next/image";
import { Brand, ScriptText } from "@/components/ui";
import { LoginForm, type DemoLogin } from "./login-form";

export const metadata: Metadata = { title: "Staff sign in" };

// Demo logins appear as "fill" buttons only while their DEMO_* variables are set (owner's choice: including production).
// Unset the variables to turn this off.
function demoLogins(): DemoLogin[] {
  const accounts = [
    { label: "Demo admin", email: process.env.DEMO_ADMIN_EMAIL, password: process.env.DEMO_ADMIN_PASSWORD },
  ];
  return accounts.filter((a): a is DemoLogin => Boolean(a.email && a.password));
}

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

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <Brand />
            <h1 className="mt-8 text-2xl font-semibold">Staff sign in</h1>
            <p className="mt-1 text-sm text-muted">Admins, counter staff and chefs.</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-[0_8px_30px_-16px_rgba(176,58,94,0.28)]">
            <LoginForm next={typeof next === "string" ? next : undefined} demoLogins={demoLogins()} />
          </div>
          <p className="mt-6 text-center text-xs text-muted">Forgot your password? Ask an admin to reset it.</p>
          <ScriptText className="mt-8 block text-center text-3xl">Baked with Love, Always ♥</ScriptText>
        </div>
      </div>
    </main>
  );
}
