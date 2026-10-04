import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { SOON_PAGES } from "@/lib/shell";
import { Card, PageHeader, ScriptText } from "@/components/ui";

export async function generateMetadata({ params }: PageProps<"/admin/soon/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: Object.hasOwn(SOON_PAGES, slug) ? SOON_PAGES[slug].title : "Coming soon" };
}

// Placeholder for menu items in the owner's mock-up that are not built yet.
export default async function ComingSoonPage({ params }: PageProps<"/admin/soon/[slug]">) {
  await requireRole(["admin", "counter"]);
  const { slug } = await params;
  // hasOwn: names like "constructor" are not pages.
  if (!Object.hasOwn(SOON_PAGES, slug)) notFound();
  const page = SOON_PAGES[slug];

  return (
    <>
      <PageHeader title={page.title} description="Coming soon" />
      <Card className="flex flex-col items-center gap-3 px-8 py-14 text-center">
        <ScriptText className="text-4xl">Something sweet is on its way ♥</ScriptText>
        <p className="max-w-xl text-muted">{page.text}</p>
        <Link href="/admin" className="mt-2 text-sm font-medium text-brand hover:underline">Back to the Dashboard</Link>
      </Card>
    </>
  );
}
