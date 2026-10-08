"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertRole } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { checkbox, dbError, text, zodErrors } from "@/lib/form";
import type { ActionState } from "@/components/form-status";

const NO_SECRET_KEY: ActionState = {
  message: "Staff logins need SUPABASE_SECRET_KEY in web/.env.local. Add it and restart the app.",
};

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

// Chef logins are no longer used (KOT removed 2026-10-09); only admin and counter staff are made.
const roleSchema = z.enum(["admin", "counter"], { error: "Choose a role." });
const password = z.string().min(10, "Use at least 10 characters.").max(72, "Use at most 72 characters.");

const createSchema = z.object({
  full_name: z.string().min(1, "Enter the staff member's name.").max(80),
  email: z.email("Enter a valid email address."),
  password,
  role: roleSchema,
});

const updateSchema = z.object({
  full_name: z.string().min(1, "Enter the staff member's name.").max(80),
  role: roleSchema,
  is_active: z.boolean(),
});

export async function createStaff(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await assertRole(["admin"]);
  if (!env.supabaseSecretKey) return NO_SECRET_KEY;

  const parsed = createSchema.safeParse({
    full_name: text(formData, "full_name"),
    email: text(formData, "email").toLowerCase(),
    password: formData.get("password"),
    role: text(formData, "role"),
  });
  if (!parsed.success) return zodErrors(parsed.error);
  const { full_name, email, role } = parsed.data;

  const admin = createAdminClient();
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password: parsed.data.password,
    email_confirm: true,
  });
  if (authError || !created.user) {
    const exists = authError?.code === "email_exists" || /already/i.test(authError?.message ?? "");
    return { message: exists ? "A login with that email already exists." : `Could not create the login. ${authError?.message ?? ""}` };
  }

  // Write the profile as the signed-in admin so the audit log records who did it.
  const supabase = await createClient();
  const userId = created.user.id;
  const { error: profileError } = await supabase.from("staff_profiles").insert({ user_id: userId, full_name, role });
  if (profileError) {
    // Do not leave a login without a staff profile.
    await admin.auth.admin.deleteUser(userId);
    return dbError(profileError, "staff member");
  }

  revalidatePath("/admin/staff");
  return { ok: true, message: `Created a login for ${full_name}. Share the password with them privately.` };
}

export async function updateStaff(userId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await assertRole(["admin"]);
  const parsed = updateSchema.safeParse({
    full_name: text(formData, "full_name"),
    role: text(formData, "role"),
    is_active: checkbox(formData, "is_active"),
  });
  if (!parsed.success) return zodErrors(parsed.error);
  const { full_name, role, is_active } = parsed.data;

  if (userId === me.userId && (role !== "admin" || !is_active)) {
    return { message: "You cannot remove your own admin access. Ask another admin." };
  }

  const supabase = await createClient();
  const { data: before } = await supabase.from("staff_profiles").select("is_active").eq("user_id", userId).single();

  const { error } = await supabase.from("staff_profiles").update({ full_name, role, is_active }).eq("user_id", userId);
  if (error) {
    if (error.message.includes("At least one active admin")) {
      return { message: "At least one active admin is required." };
    }
    return dbError(error, "staff member");
  }

  // The inactive profile already blocks all data access; banning also stops new sign-ins.
  let note = "";
  if (before && before.is_active !== is_active) {
    if (env.supabaseSecretKey) {
      const { error: banError } = await createAdminClient().auth.admin.updateUserById(userId, {
        ban_duration: is_active ? "none" : "876000h",
      });
      if (banError) note = " Access is blocked, but the login could not be locked; check Supabase Auth.";
    } else {
      note = " Access is blocked. Add SUPABASE_SECRET_KEY to also lock the login.";
    }
  }

  revalidatePath("/admin/staff");
  return { ok: true, message: `Saved.${note}` };
}

export async function resetStaffPassword(userId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await assertRole(["admin"]);
  if (!env.supabaseSecretKey) return NO_SECRET_KEY;

  const parsed = password.safeParse(formData.get("password"));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message, fieldErrors: { password: parsed.error.issues[0]?.message ?? "" } };

  const { error } = await createAdminClient().auth.admin.updateUserById(userId, { password: parsed.data });
  if (error) return { message: `Could not reset the password. ${error.message}` };
  return { ok: true, message: "Password reset. Share it with them privately." };
}
