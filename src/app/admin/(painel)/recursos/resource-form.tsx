"use client";

import { useActionState } from "react";
import { createResource, updateResource } from "./actions";
import { initialFormState } from "@/lib/form-utils";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { FormMessage } from "@/components/admin/forms";
import { EntityPicker } from "@/components/admin/entity-picker";
import { SubmitButton } from "@/components/ui/submit-button";
import { COUNTRY_SUGGESTIONS, LANGUAGES, LICENSES, RESOURCE_TYPES, RESOURCE_TYPE_LABELS } from "@/lib/constants";

export type ResourceFormValues = {
  id?: string;
  title: string;
  subtitle: string | null;
  slug: string;
  resource_type: string;
  publication_year: number | null;
  language: string;
  country: string | null;
  knowledge_area: string | null;
  publisher: string | null;
  doi: string | null;
  isbn: string | null;
  abstract: string | null;
  keywords: string[];
  license: string;
  license_details: string | null;
  rights_holder: string | null;
  external_url: string | null;
  allow_online_reading: boolean;
  allow_download: boolean;
  author_ids: string[];
  collection_ids: string[];
  session_ids: string[];
  published: boolean;
  has_file: boolean;
};

type Options = {
  authors: { id: string; label: string; hint?: string | null }[];
  collections: { id: string; name: string }[];
  sessions: { id: string; label: string; hint?: string | null }[];
};

const legend = "mb-4 w-full border-b border-line pb-2 font-heading text-lg font-semibold text-brand-blue";

export function ResourceForm({ values, options, canEdit }: { values?: ResourceFormValues; options: Options; canEdit: boolean }) {
  const isEdit = !!values?.id;
  const [state, action] = useActionState(isEdit ? updateResource : createResource, initialFormState);
  const e = state.errors ?? {};
  const d = state.data;
  const val = (key: keyof ResourceFormValues, fallback = "") => {
    if (d && key in d) return d[key as string];
    const v = values?.[key];
    if (Array.isArray(v)) return v.join(", ");
    return v === null || v === undefined ? fallback : String(v);
  };

  return (
    <form action={action} className="space-y-10" noValidate>
      <FormMessage state={state} />
      {isEdit ? <input type="hidden" name="id" value={values!.id} /> : null}
      <fieldset disabled={!canEdit} className="space-y-10">
        <fieldset className="space-y-5">
          <legend className={legend}>Identificação</legend>
          <Field name="title" label="Título" required error={e.title}>
            {({ id, describedBy, invalid }) => <Input id={id} name="title" required defaultValue={val("title")} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
          <Field name="subtitle" label="Subtítulo" error={e.subtitle}>
            {({ id, describedBy, invalid }) => <Input id={id} name="subtitle" defaultValue={val("subtitle")} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field name="resource_type" label="Tipo de documento" required error={e.resource_type}>
              {({ id, describedBy, invalid }) => (
                <Select id={id} name="resource_type" defaultValue={val("resource_type", "")} aria-describedby={describedBy} aria-invalid={invalid}>
                  <option value="" disabled>
                    Selecione
                  </option>
                  {RESOURCE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {RESOURCE_TYPE_LABELS[t]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field name="publication_year" label="Ano de publicação" error={e.publication_year}>
              {({ id, describedBy, invalid }) => <Input id={id} name="publication_year" inputMode="numeric" maxLength={4} defaultValue={val("publication_year")} aria-describedby={describedBy} aria-invalid={invalid} />}
            </Field>
            <Field name="language" label="Idioma" required error={e.language}>
              {({ id, describedBy, invalid }) => (
                <Select id={id} name="language" defaultValue={val("language", "pt")} aria-describedby={describedBy} aria-invalid={invalid}>
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <Field
            name="slug"
            label="Endereço permanente (slug)"
            help={values?.published ? "O endereço não pode ser alterado depois da publicação." : "Gerado a partir do título quando deixado em branco."}
            error={e.slug}
          >
            {({ id, describedBy, invalid }) => (
              <div className="flex items-center rounded-md border border-line-strong bg-surface text-sm">
                <span className="px-3 text-muted">/biblioteca/</span>
                <Input id={id} name="slug" defaultValue={val("slug")} readOnly={values?.published} className="rounded-l-none border-0 border-l" aria-describedby={describedBy} aria-invalid={invalid} />
              </div>
            )}
          </Field>
        </fieldset>

        <fieldset className="space-y-5">
          <legend className={legend}>Autoria e associações</legend>
          <EntityPicker
            name="author_ids"
            label="Autores"
            help="A ordem define a apresentação e a referência bibliográfica."
            options={options.authors}
            initial={(values?.author_ids ?? []).map((id) => ({ id }))}
            emptyText="Nenhum autor associado."
            searchPlaceholder="Pesquisar autores registados"
          />
          <p className="-mt-2 text-xs text-muted">
            Se o autor ainda não estiver registado,{" "}
            <a href="/admin/autores/novo" target="_blank" className="link">
              crie o perfil num novo separador
            </a>{" "}
            e atualize esta página.
          </p>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink-strong">Coleções temáticas</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {options.collections.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="collection_ids" value={c.id} defaultChecked={values?.collection_ids.includes(c.id)} className="h-4 w-4 accent-brand-blue" />
                  {c.name}
                </label>
              ))}
            </div>
          </fieldset>
          <EntityPicker
            name="session_ids"
            label="Sessões relacionadas"
            help="Associe o recurso às sessões Saberes em Rede em que foi apresentado ou discutido."
            options={options.sessions}
            initial={(values?.session_ids ?? []).map((id) => ({ id }))}
            emptyText="Nenhuma sessão associada."
            searchPlaceholder="Pesquisar sessões"
          />
        </fieldset>

        <fieldset className="space-y-5">
          <legend className={legend}>Descrição</legend>
          <Field name="abstract" label="Resumo" help="Separe parágrafos com uma linha em branco." error={e.abstract}>
            {({ id, describedBy, invalid }) => <Textarea id={id} name="abstract" rows={8} defaultValue={val("abstract")} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
          <Field name="keywords" label="Palavras-chave" help="Separadas por vírgulas." error={e.keywords}>
            {({ id, describedBy, invalid }) => <Input id={id} name="keywords" defaultValue={val("keywords")} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field name="knowledge_area" label="Área de conhecimento" help="Por exemplo: Ciências do Ambiente." error={e.knowledge_area}>
              {({ id, describedBy, invalid }) => <Input id={id} name="knowledge_area" defaultValue={val("knowledge_area")} aria-describedby={describedBy} aria-invalid={invalid} />}
            </Field>
            <Field name="country" label="País" error={e.country}>
              {({ id, describedBy, invalid }) => (
                <>
                  <Input id={id} name="country" list="admin-paises" defaultValue={val("country")} aria-describedby={describedBy} aria-invalid={invalid} />
                  <datalist id="admin-paises">
                    {COUNTRY_SUGGESTIONS.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </>
              )}
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-5">
          <legend className={legend}>Publicação e identificadores</legend>
          <Field name="publisher" label="Instituição ou editora" error={e.publisher}>
            {({ id, describedBy, invalid }) => <Input id={id} name="publisher" defaultValue={val("publisher")} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field name="doi" label="DOI" help="Formato 10.xxxx/identificador." error={e.doi}>
              {({ id, describedBy, invalid }) => <Input id={id} name="doi" defaultValue={val("doi")} aria-describedby={describedBy} aria-invalid={invalid} />}
            </Field>
            <Field name="isbn" label="ISBN" error={e.isbn}>
              {({ id, describedBy, invalid }) => <Input id={id} name="isbn" defaultValue={val("isbn")} aria-describedby={describedBy} aria-invalid={invalid} />}
            </Field>
          </div>
          <Field name="external_url" label="Fonte original (link externo)" help="Utilize quando o ficheiro não pode ser alojado na biblioteca." error={e.external_url}>
            {({ id, describedBy, invalid }) => <Input id={id} name="external_url" type="url" placeholder="https://" defaultValue={val("external_url")} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
        </fieldset>

        <fieldset className="space-y-5">
          <legend className={legend}>Licença e permissões de acesso</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field name="license" label="Licença" required error={e.license}>
              {({ id, describedBy, invalid }) => (
                <Select id={id} name="license" defaultValue={val("license", "all-rights-reserved")} aria-describedby={describedBy} aria-invalid={invalid}>
                  {LICENSES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field name="rights_holder" label="Titular dos direitos" error={e.rights_holder}>
              {({ id, describedBy, invalid }) => <Input id={id} name="rights_holder" defaultValue={val("rights_holder")} aria-describedby={describedBy} aria-invalid={invalid} />}
            </Field>
          </div>
          <Field name="license_details" label="Direitos de utilização" help="Descreva as condições de utilização e, quando aplicável, a autorização concedida pelo titular (data e forma)." error={e.license_details}>
            {({ id, describedBy, invalid }) => <Textarea id={id} name="license_details" rows={3} defaultValue={val("license_details")} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
          {isEdit ? (
            <div className="space-y-3 rounded-md border border-line bg-surface p-4">
              {!values?.has_file ? <p className="text-sm text-muted">Carregue o ficheiro PDF na secção «Ficheiros» para poder autorizar a leitura online ou o descarregamento.</p> : null}
              <Checkbox
                name="allow_online_reading"
                defaultChecked={d ? d.allow_online_reading === "on" : values?.allow_online_reading}
                label="Permitir a leitura online no visualizador integrado"
                description="Apenas quando a licença ou a autorização do titular o permitam."
              />
              <Checkbox
                name="allow_download"
                defaultChecked={d ? d.allow_download === "on" : values?.allow_download}
                label="Permitir o descarregamento do ficheiro"
                description="Com licenças restritivas, é obrigatório descrever a autorização obtida."
              />
            </div>
          ) : (
            <p className="text-sm text-muted">As permissões de leitura e descarregamento são definidas depois de carregar o ficheiro PDF.</p>
          )}
        </fieldset>

        {canEdit ? (
          <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-3 border-t border-line bg-white/95 px-1 py-4">
            <SubmitButton size="lg" pendingText="A guardar...">
              {isEdit ? "Guardar alterações" : "Criar rascunho"}
            </SubmitButton>
            <p className="text-xs text-muted">Os novos recursos são criados como rascunho e só ficam públicos depois de publicados.</p>
          </div>
        ) : null}
      </fieldset>
    </form>
  );
}
