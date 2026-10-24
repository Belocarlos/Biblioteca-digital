"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createUser, resetUserPassword, updateUser } from "./actions";
import { initialFormState } from "@/lib/form-utils";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { FormMessage } from "@/components/admin/forms";
import { SubmitButton } from "@/components/ui/submit-button";
import { USER_ROLES, USER_ROLE_DESCRIPTIONS, USER_ROLE_LABELS } from "@/lib/constants";

type Values = { id: string; name: string; email: string; role: string; is_active: boolean };

export function UserForm({ values }: { values?: Values }) {
  const isEdit = !!values;
  const [state, action] = useActionState(isEdit ? updateUser : createUser, initialFormState);
  const e = state.errors ?? {};
  const d = state.data;
  if (!isEdit && state.status === "success") {
    return (
      <div className="space-y-4">
        <FormMessage state={state} />
        <Link href="/admin/utilizadores" className="link text-sm">
          Voltar à lista de utilizadores
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      {isEdit ? <input type="hidden" name="id" value={values.id} /> : null}
      <Field name="name" label="Nome" required error={e.name}>
        {({ id, describedBy, invalid }) => <Input id={id} name="name" defaultValue={d?.name ?? values?.name} aria-describedby={describedBy} aria-invalid={invalid} />}
      </Field>
      <Field name="email" label="E-mail" required error={e.email}>
        {({ id, describedBy, invalid }) => <Input id={id} name="email" type="email" defaultValue={d?.email ?? values?.email} aria-describedby={describedBy} aria-invalid={invalid} />}
      </Field>
      <Field name="role" label="Função" required error={e.role} help={USER_ROLES.map((r) => `${USER_ROLE_LABELS[r]}: ${USER_ROLE_DESCRIPTIONS[r]}`).join(" ")}>
        {({ id, describedBy, invalid }) => (
          <Select id={id} name="role" defaultValue={d?.role ?? values?.role ?? "editor"} aria-describedby={describedBy} aria-invalid={invalid}>
            {USER_ROLES.map((r) => (
              <option key={r} value={r}>
                {USER_ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {isEdit ? <Checkbox name="is_active" defaultChecked={d ? d.is_active === "on" : values.is_active} label="Conta ativa" description="Ao desativar, as sessões abertas são terminadas imediatamente." /> : null}
      <SubmitButton pendingText="A guardar...">{isEdit ? "Guardar alterações" : "Criar conta"}</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ id }: { id: string }) {
  const [state, action] = useActionState(resetUserPassword, initialFormState);
  return (
    <form
      action={action}
      onSubmit={(ev) => {
        if (!window.confirm("Repor a palavra-passe desta conta? As sessões abertas serão terminadas.")) ev.preventDefault();
      }}
      className="space-y-3"
    >
      <FormMessage state={state} />
      <input type="hidden" name="id" value={id} />
      <p className="text-sm text-ink">Gera uma nova palavra-passe temporária, que terá de ser alterada no próximo acesso.</p>
      <SubmitButton variant="secondary" size="sm" pendingText="A repor...">
        Repor palavra-passe
      </SubmitButton>
    </form>
  );
}
