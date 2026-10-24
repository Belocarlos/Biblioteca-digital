"use client";

import { useActionState } from "react";
import { createCollection, updateCollection } from "./actions";
import { initialFormState } from "@/lib/form-utils";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { FormMessage } from "@/components/admin/forms";
import { SubmitButton } from "@/components/ui/submit-button";

export function CollectionForm({ values, canEdit }: { values?: { id: string; name: string; slug: string; description: string | null; is_published: boolean }; canEdit: boolean }) {
  const isEdit = !!values;
  const [state, action] = useActionState(isEdit ? updateCollection : createCollection, initialFormState);
  const e = state.errors ?? {};
  const d = state.data;
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      {isEdit ? <input type="hidden" name="id" value={values.id} /> : null}
      <fieldset disabled={!canEdit} className="space-y-5">
        <Field name="name" label="Nome" required error={e.name}>
          {({ id, describedBy, invalid }) => <Input id={id} name="name" defaultValue={d?.name ?? values?.name} aria-describedby={describedBy} aria-invalid={invalid} />}
        </Field>
        <Field name="description" label="Descrição objetiva" error={e.description}>
          {({ id, describedBy, invalid }) => <Textarea id={id} name="description" rows={4} defaultValue={d?.description ?? values?.description ?? ""} aria-describedby={describedBy} aria-invalid={invalid} />}
        </Field>
        <Field name="slug" label="Endereço (slug)" help="Gerado a partir do nome quando deixado em branco. Alterar o endereço quebra ligações existentes." error={e.slug}>
          {({ id, describedBy, invalid }) => <Input id={id} name="slug" defaultValue={d?.slug ?? values?.slug} aria-describedby={describedBy} aria-invalid={invalid} />}
        </Field>
        <Checkbox name="is_published" defaultChecked={d ? d.is_published === "on" : (values?.is_published ?? true)} label="Coleção visível no website" />
      </fieldset>
      {canEdit ? <SubmitButton pendingText="A guardar...">{isEdit ? "Guardar alterações" : "Criar coleção"}</SubmitButton> : null}
    </form>
  );
}
