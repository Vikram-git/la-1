"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Badge, Button, Checkbox, Field, Input, Select } from "@/components/ui";
import { FormMessage, SubmitButton, type ActionState } from "@/components/form-status";

type SaveAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;
export type StaffMember = {
  user_id: string;
  full_name: string;
  role: "admin" | "counter" | "chef";
  is_active: boolean;
  email: string | null;
};

const roleLabels = { admin: "Admin", counter: "Counter staff", chef: "Chef (no access)" };

// Chef logins are no longer used (KOT removed 2026-10-09): a former chef is given a new role or disabled.
function RoleSelect({ defaultRole, error, prefix }: { defaultRole: StaffMember["role"]; error?: string; prefix: string }) {
  return (
    <Field label="Role" htmlFor={`${prefix}-role`} error={error}>
      <Select id={`${prefix}-role`} name="role" defaultValue={defaultRole === "chef" ? "" : defaultRole} required>
        {defaultRole === "chef" && <option value="" disabled>Choose a new role</option>}
        <option value="counter">Counter staff</option>
        <option value="admin">Admin</option>
      </Select>
    </Field>
  );
}

export function NewStaffForm({ action, disabledReason }: { action: SaveAction; disabledReason?: string }) {
  const [state, formAction] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  const err = state.fieldErrors ?? {};
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={formAction}>
      <fieldset disabled={Boolean(disabledReason)} className="grid gap-4 md:grid-cols-2">
        <Field label="Full name" htmlFor="new-staff-name" error={err.full_name}>
          <Input id="new-staff-name" name="full_name" required maxLength={80} />
        </Field>
        <Field label="Email (used to sign in)" htmlFor="new-staff-email" error={err.email}>
          <Input id="new-staff-email" name="email" type="email" required autoComplete="off" />
        </Field>
        <Field label="Temporary password" htmlFor="new-staff-password" error={err.password} hint="At least 10 characters. Share it privately.">
          <Input id="new-staff-password" name="password" type="password" required minLength={10} autoComplete="new-password" />
        </Field>
        <RoleSelect defaultRole="counter" error={err.role} prefix="new-staff" />
      </fieldset>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <SubmitButton pendingText="Creating…" disabled={Boolean(disabledReason)}>
          Create staff login
        </SubmitButton>
        {disabledReason ? <p className="text-sm text-warn">{disabledReason}</p> : <FormMessage state={state} />}
      </div>
    </form>
  );
}

export function StaffRow({
  member,
  isSelf,
  saveAction,
  resetAction,
}: {
  member: StaffMember;
  isSelf: boolean;
  saveAction: SaveAction;
  resetAction: SaveAction;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "password">("view");
  const [state, formAction] = useActionState<ActionState, FormData>(async (prev, formData) => {
    const result = await saveAction(prev, formData);
    if (result.ok) setMode("view");
    return result;
  }, {});
  const [resetState, resetFormAction] = useActionState(resetAction, {});
  const err = state.fieldErrors ?? {};

  return (
    <li className="rounded-lg border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{member.full_name}</span>
            {isSelf && <Badge tone="brand">You</Badge>}
            <Badge>{roleLabels[member.role]}</Badge>
            {!member.is_active && <Badge tone="danger">Disabled</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted">
            {member.email ?? "Email hidden (secret key not set)"}
          </p>
        </div>
        {mode === "view" && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setMode("edit")}>Edit</Button>
            <Button variant="ghost" onClick={() => setMode("password")}>Reset password</Button>
          </div>
        )}
      </div>
      {mode === "view" && state.ok && state.message && <p className="mt-2 text-sm text-ok">{state.message}</p>}

      {mode === "edit" && (
        <form action={formAction} className="mt-4 border-t border-line pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full name" htmlFor={`staff-${member.user_id}-name`} error={err.full_name}>
              <Input id={`staff-${member.user_id}-name`} name="full_name" defaultValue={member.full_name} required />
            </Field>
            <RoleSelect defaultRole={member.role} error={err.role} prefix={`staff-${member.user_id}`} />
            <div className="md:col-span-2">
              <Checkbox
                name="is_active"
                label="Active"
                hint="Untick to block this person immediately. Their history is kept."
                defaultChecked={member.is_active}
                disabled={isSelf}
              />
              {isSelf && <input type="hidden" name="is_active" value="on" />}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <SubmitButton>Save</SubmitButton>
            <Button type="button" variant="secondary" onClick={() => setMode("view")}>Cancel</Button>
            <FormMessage state={state} />
          </div>
        </form>
      )}

      {mode === "password" && (
        <form action={resetFormAction} className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4">
          <div className="min-w-60">
            <label htmlFor={`pw-${member.user_id}`} className="mb-1 block text-sm font-medium">New password</label>
            <Input id={`pw-${member.user_id}`} name="password" type="password" minLength={10} required autoComplete="new-password" />
          </div>
          <SubmitButton pendingText="Resetting…">Set password</SubmitButton>
          <Button type="button" variant="secondary" onClick={() => setMode("view")}>Close</Button>
          <FormMessage state={resetState} />
        </form>
      )}
    </li>
  );
}
