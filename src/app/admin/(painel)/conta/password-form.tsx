"use client";

import { useActionState } from "react";
import { changePassword } from "../../actions";
import { initialFormState } from "@/lib/form-utils";
import { Field, Input } from "@/components/ui/form";
import { FormMessage } from "@/components/admin/forms";
import { SubmitButton } from "@/components/ui/submit-button";

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, initialFormState);
  const e = state.errors ?? {};
  return (
    <form action={action} className="max-w-md space-y-5" noValidate>
      <FormMessage state={state} />
      <Field name="current" label="Palavra-passe atual" required error={e.current}>
        {({ id, describedBy, invalid }) => <Input id={id} name="current" type="password" autoComplete="current-password" required aria-describedby={describedBy} aria-invalid={invalid} />}
      </Field>
      <Field name="password" label="Nova palavra-passe" required help="Pelo menos 12 caracteres, com três tipos diferentes (minúsculas, maiúsculas, números ou símbolos)." error={e.password}>
        {({ id, describedBy, invalid }) => <Input id={id} name="password" type="password" autoComplete="new-password" required minLength={12} aria-describedby={describedBy} aria-invalid={invalid} />}
      </Field>
      <Field name="confirm" label="Confirmar nova palavra-passe" required error={e.confirm}>
        {({ id, describedBy, invalid }) => <Input id={id} name="confirm" type="password" autoComplete="new-password" required aria-describedby={describedBy} aria-invalid={invalid} />}
      </Field>
      <SubmitButton pendingText="A guardar...">Alterar palavra-passe</SubmitButton>
    </form>
  );
}
