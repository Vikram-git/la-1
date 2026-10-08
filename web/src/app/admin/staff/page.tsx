import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { Alert, Card, PageHeader } from "@/components/ui";
import { createStaff, resetStaffPassword, updateStaff } from "./actions";
import { NewStaffForm, StaffRow, type StaffMember } from "./staff-forms";

export const metadata: Metadata = { title: "Staff" };

async function loadEmails(): Promise<Map<string, string>> {
  if (!env.supabaseSecretKey) return new Map();
  const { data } = await createAdminClient().auth.admin.listUsers({ perPage: 1000 });
  return new Map((data?.users ?? []).flatMap((u) => (u.email ? [[u.id, u.email] as const] : [])));
}

export default async function StaffPage() {
  const me = await requireRole(["admin"]);
  const supabase = await createClient();

  const [{ data: profiles }, emails] = await Promise.all([
    supabase.from("staff_profiles").select("user_id, full_name, role, is_active").order("full_name"),
    loadEmails(),
  ]);

  const members: StaffMember[] = (profiles ?? []).map((p) => ({
    user_id: p.user_id,
    full_name: p.full_name,
    role: p.role,
    is_active: p.is_active,
    email: emails.get(p.user_id) ?? null,
  }));
  const formerChefs = members.filter((m) => m.is_active && m.role === "chef");

  return (
    <>
      <PageHeader title="Staff" description="Individual logins for every admin and counter staff member." />

      <div className="flex flex-col gap-6">
        {!env.supabaseSecretKey && (
          <Alert title="Staff logins are read-only">
            To create logins and reset passwords, add <code className="font-mono">SUPABASE_SECRET_KEY</code> to{" "}
            <code className="font-mono">web/.env.local</code> (Supabase dashboard → Project Settings → API Keys) and restart the app.
          </Alert>
        )}
        {formerChefs.length > 0 && (
          <Alert tone="warn" title="Chef logins no longer work">
            {formerChefs.map((c) => c.full_name).join(", ")} cannot use the app now that the kitchen screen is gone. Give them a new role or
            untick Active.
          </Alert>
        )}

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Add staff member</h2>
          <NewStaffForm action={createStaff} disabledReason={env.supabaseSecretKey ? undefined : "Needs SUPABASE_SECRET_KEY."} />
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Staff ({members.length})</h2>
          <ul className="flex flex-col gap-3">
            {members.map((m) => (
              <StaffRow
                key={m.user_id}
                member={m}
                isSelf={m.user_id === me.userId}
                saveAction={updateStaff.bind(null, m.user_id)}
                resetAction={resetStaffPassword.bind(null, m.user_id)}
              />
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
