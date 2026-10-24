"use client";

import { useActionState } from "react";
import { createAuthor, updateAuthor } from "./actions";
import { initialFormState } from "@/lib/form-utils";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { FormMessage } from "@/components/admin/forms";
import { SubmitButton } from "@/components/ui/submit-button";
import { COUNTRY_SUGGESTIONS } from "@/lib/constants";

export type AuthorFormValues = {
  id?: string;
  name: string;
  sort_name: string | null;
  slug: string;
  specialization: string | null;
  country: string | null;
  institution: string | null;
  bio: string | null;
  photo_alt: string | null;
  links: { label: string; url: string }[];
  is_published: boolean;
  photo_authorized: boolean;
};

export function AuthorForm({ values, canEdit }: { values?: AuthorFormValues; canEdit: boolean }) {
  const isEdit = !!values?.id;
  const [state, action] = useActionState(isEdit ? updateAuthor : createAuthor, initialFormState);
  const e = state.errors ?? {};
  const d = state.data;
  const val = (key: keyof AuthorFormValues) => {
    if (d && key in d) return d[key as string];
    if (key === "links") return (values?.links ?? []).map((l) => `${l.label} | ${l.url}`).join("\n");
    const v = values?.[key];
    return v === null || v === undefined ? "" : String(v);
  };
  return (
    <form action={action} className="space-y-6" noValidate>
      <FormMessage state={state} />
      {isEdit ? <input type="hidden" name="id" value={values!.id} /> : null}
      <fieldset disabled={!canEdit} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="name" label="Nome completo" required error={e.name}>
            {({ id, describedBy, invalid }) => <Input id={id} name="name" defaultValue={val("name")} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
          <Field name="sort_name" label="Nome para referências" help="Formato Apelido, Nome. Utilizado nas referências bibliográficas." error={e.sort_name}>
            {({ id, describedBy, invalid }) => <Input id={id} name="sort_name" placeholder="Silva, Maria" defaultValue={val("sort_name")} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
          <Field name="specialization" label="Área de especialização" error={e.specialization}>
            {({ id, describedBy, invalid }) => <Input id={id} name="specialization" defaultValue={val("specialization")} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
          <Field name="institution" label="Instituição" error={e.institution}>
            {({ id, describedBy, invalid }) => <Input id={id} name="institution" defaultValue={val("institution")} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
          <Field name="country" label="País" error={e.country}>
            {({ id, describedBy, invalid }) => (
              <>
                <Input id={id} name="country" list="author-paises" defaultValue={val("country")} aria-describedby={describedBy} aria-invalid={invalid} />
                <datalist id="author-paises">
                  {COUNTRY_SUGGESTIONS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
          <Field name="slug" label="Endereço do perfil (slug)" help="Gerado a partir do nome quando deixado em branco." error={e.slug}>
            {({ id, describedBy, invalid }) => <Input id={id} name="slug" defaultValue={val("slug")} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
        </div>
        <Field name="bio" label="Biografia resumida" error={e.bio}>
          {({ id, describedBy, invalid }) => <Textarea id={id} name="bio" rows={6} defaultValue={val("bio")} aria-describedby={describedBy} aria-invalid={invalid} />}
        </Field>
        <Field name="links" label="Links profissionais autorizados" help="Um por linha, no formato: Etiqueta | https://endereço (por exemplo, ORCID | https://orcid.org/...)." error={e.links}>
          {({ id, describedBy, invalid }) => <Textarea id={id} name="links" rows={3} defaultValue={val("links")} aria-describedby={describedBy} aria-invalid={invalid} />}
        </Field>
        <Field name="photo_alt" label="Texto alternativo da fotografia" error={e.photo_alt}>
          {({ id, describedBy, invalid }) => <Input id={id} name="photo_alt" defaultValue={val("photo_alt")} aria-describedby={describedBy} aria-invalid={invalid} />}
        </Field>
        <div className="space-y-3 rounded-md border border-line bg-surface p-4">
          {isEdit ? (
            <Checkbox
              name="photo_authorized"
              defaultChecked={d ? d.photo_authorized === "on" : values?.photo_authorized}
              label="A utilização da fotografia foi autorizada pela pessoa retratada"
              description="Se desmarcar, a fotografia é removida."
            />
          ) : null}
          <Checkbox
            name="is_published"
            defaultChecked={d ? d.is_published === "on" : values?.is_published}
            label="Publicar o perfil no diretório de autores"
            description="Confirme que a pessoa autorizou a publicação dos dados do perfil. O nome aparece sempre nos recursos e sessões publicados."
          />
        </div>
      </fieldset>
      {canEdit ? (
        <SubmitButton size="lg" pendingText="A guardar...">
          {isEdit ? "Guardar alterações" : "Criar perfil"}
        </SubmitButton>
      ) : null}
    </form>
  );
}
