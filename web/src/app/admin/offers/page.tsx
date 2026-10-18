import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getBusinessTimezone } from "@/lib/settings";
import { offerState } from "@/lib/offers";
import { zonedDayKey } from "@/lib/time";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { OfferForm } from "./offer-form";
import { deleteOffer, saveOffer } from "./actions";

export const metadata: Metadata = { title: "Offers & Banners" };

const STATE = {
  live: { label: "On the website", tone: "ok" },
  scheduled: { label: "Scheduled", tone: "info" },
  ended: { label: "Ended", tone: "neutral" },
  off: { label: "Switched off", tone: "neutral" },
} as const;

function day(d: string) {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

// Offers shown in the "Current offers" section of the website, between the dates given.
export default async function OffersPage() {
  await requireRole(["admin"]);
  const tz = await getBusinessTimezone();
  const today = zonedDayKey(new Date(), tz);
  const supabase = await createClient();
  const { data } = await supabase.from("offers").select("*").order("sort_order").order("created_at", { ascending: false });
  const offers = data ?? [];

  return (
    <>
      <PageHeader title="Offers & Banners" description="Offers appear in the “Current offers” section of the website while they are on and within their dates." />
      <div className="flex flex-col gap-6">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">New offer</h2>
          <OfferForm action={saveOffer.bind(null, null)} submitLabel="Add offer" />
        </Card>
        {offers.length === 0 ? (
          <EmptyState title="No offers yet">For example: festival sweet boxes, a weekend cake discount, or a new flavour.</EmptyState>
        ) : (
          offers.map((o) => {
            const state = STATE[offerState(o, today)];
            return (
              <Card key={o.id}>
                <details>
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
                    {o.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Storage URL
                      <img src={o.image_url} alt="" className="h-14 w-20 rounded-lg object-cover" />
                    ) : (
                      <div className="h-14 w-20 rounded-lg bg-brand-soft" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{o.title}</p>
                      <p className="text-xs text-muted">
                        {o.starts_on || o.ends_on
                          ? `${o.starts_on ? day(o.starts_on) : "Now"} – ${o.ends_on ? day(o.ends_on) : "no end date"}`
                          : "No dates"}
                      </p>
                    </div>
                    <Badge tone={state.tone}>{state.label}</Badge>
                    <span className="text-sm font-medium text-brand">Edit</span>
                  </summary>
                  <div className="mt-5 border-t border-line pt-5">
                    <OfferForm offer={o} action={saveOffer.bind(null, o.id)} submitLabel="Save" />
                    <form action={deleteOffer.bind(null, o.id)} className="mt-4">
                      <Button type="submit" variant="danger">Delete offer</Button>
                    </form>
                  </div>
                </details>
              </Card>
            );
          })
        )}
      </div>
    </>
  );
}
