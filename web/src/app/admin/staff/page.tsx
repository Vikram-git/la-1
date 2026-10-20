import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { Alert, Card, PageHeader } from "@/components/ui";
import { createStaff, resetStaffPassword, updateKitchen, updateStaff } from "./actions";
import { KitchenForm, NewStaffForm, StaffRow, type StaffMember } from "./staff-forms";

export const metadata: Metadata = { title: "Staff" };

async function loadEmails(): Promise<Map<string, string>> {
  if (!env.supabaseSecretKey) return new Map();
  const { data } = await createAdminClient().auth.admin.listUsers({ perPage: 1000 });
  return new Map((data?.users ?? []).flatMap((u) => (u.email ? [[u.id, u.email] as const] : [])));
}

export default async function StaffPage() {
  const me = await requireRole(["admin"]);
  const supabase = await createClient();

  const [{ data: profiles }, { data: kitchens }, emails] = await Promise.all([
    supabase.from("staff_profiles").select("user_id, full_name, role, is_active, staff_kitchens(kitchen_id)").order("full_name"),
    supabase.from("kitchens").select("id, code, name, is_active").order("sort_order"),
    loadEmails(),
  ]);

  const members: StaffMember[] = (profiles ?? []).map((p) => ({
    user_id: p.user_id,
    full_name: p.full_name,
    role: p.role,
    is_active: p.is_active,
    email: emails.get(p.user_id) ?? null,
    kitchen_ids: p.staff_kitchens.map((sk) => sk.kitchen_id),
  }));
  const chefsWithoutKitchen = members.filter((m) => m.is_active && m.role === "chef" && m.kitchen_ids.length === 0);

  return (
    <>
      <PageHeader title="Staff" description="Individual logins for every admin, counter staff member and chef." />

      <div className="flex flex-col gap-6">
        {!env.supabaseSecretKey && (
          <Alert title="Staff logins are read-only">
            To create logins and reset passwords, add <code className="font-mono">SUPABASE_SECRET_KEY</code> to{" "}
            <code className="font-mono">web/.env.local</code> (Supabase dashboard → Project Settings → API Keys) and restart the app.
          </Alert>
        )}
        {chefsWithoutKitchen.length > 0 && (
          <Alert tone="warn" title="Chefs without a kitchen">
            {chefsWithoutKitchen.map((c) => c.full_name).join(", ")} see only items that have no kitchen yet. Edit them and tick their kitchens.
          </Alert>
        )}

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Add staff member</h2>
          <NewStaffForm kitchens={kitchens ?? []} action={createStaff} disabledReason={env.supabaseSecretKey ? undefined : "Needs SUPABASE_SECRET_KEY."} />
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Staff ({members.length})</h2>
          <ul className="flex flex-col gap-3">
            {members.map((m) => (
              <StaffRow
                key={m.user_id}
                kitchens={kitchens ?? []}
                member={m}
                isSelf={m.user_id === me.userId}
                saveAction={updateStaff.bind(null, m.user_id)}
                resetAction={resetStaffPassword.bind(null, m.user_id)}
              />
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Kitchens</h2>
          <p className="mb-4 mt-1 text-sm text-muted">Rename them to match your bakery. Each product is made in one kitchen (Products → product → Kitchen).</p>
          <div className="flex flex-col gap-3">
            {(kitchens ?? []).map((k) => (
              <KitchenForm key={k.id} kitchen={k} action={updateKitchen.bind(null, k.id)} />
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
