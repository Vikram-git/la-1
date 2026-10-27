import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaff, homeFor } from "@/lib/auth";
import Image from "next/image";
import Link from "next/link";
import { Wordmark } from "@/components/ui";
import { SHOP_NAME } from "@/lib/brand";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Staff sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const staff = await getStaff();
  if (staff) redirect(homeFor(staff.role));

  const { next } = await searchParams;

  return (
    <main className="grid flex-1 lg:grid-cols-[1.1fr_1fr]">
      {/* Brand side: the icing drip with the shop's name in its cream centre (hidden on phones). */}
      <div className="relative hidden items-center justify-center overflow-hidden bg-cream lg:flex">
        <Image src="/brand/drip-background.png" alt="" fill fetchPriority="high" sizes="55vw" className="object-cover" />
        <Wordmark className="relative" />
      </div>

      <div className="flex items-center justify-center px-5 py-10 sm:py-16">
        <div className="w-full max-w-sm">
          <h1 className="sr-only">{SHOP_NAME} staff sign in</h1>
          <div className="flex justify-center lg:hidden">
            <Wordmark />
          </div>
          <div className="mt-10 text-center lg:mt-0">
            <p className="font-caps text-[11px] uppercase tracking-[0.3em] text-chocolate">Staff portal</p>
            <p className="mt-2 font-display text-3xl">Welcome back</p>
          </div>
          <div className="mt-8 rounded-3xl border border-line/90 bg-surface p-6 shadow-[0_1px_2px_rgba(17,17,17,0.04),0_18px_40px_-24px_rgba(74,36,24,0.3)] sm:p-7">
            <LoginForm next={typeof next === "string" ? next : undefined} />
          </div>
          <p className="mt-6 text-center text-sm">
            <Link href="/forgot-password" className="font-medium text-brand hover:underline">Forgot password?</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
