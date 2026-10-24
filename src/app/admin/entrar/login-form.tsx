"use client";

import { useActionState } from "react";
import { login } from "../actions";
import { initialFormState } from "@/lib/form-utils";
import { Input, Label } from "@/components/ui/form";
import { Notice } from "@/components/ui/misc";
import { SubmitButton } from "@/components/ui/submit-button";

export function LoginForm() {
  const [state, action] = useActionState(login, initialFormState);
  return (
    <form action={action} className="space-y-5">
      {state.status === "error" ? <Notice tone="danger">{state.message}</Notice> : null}
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required defaultValue={state.data?.email} autoFocus />
      </div>
      <div>
        <Label htmlFor="password">Palavra-passe</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <SubmitButton className="w-full" size="lg" pendingText="A verificar...">
        Entrar
      </SubmitButton>
    </form>
  );
}
