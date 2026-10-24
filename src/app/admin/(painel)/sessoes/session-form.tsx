"use client";

import { useActionState } from "react";
import { createSession, updateSession } from "./actions";
import { initialFormState } from "@/lib/form-utils";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { FormMessage } from "@/components/admin/forms";
import { EntityPicker } from "@/components/admin/entity-picker";
import { SubmitButton } from "@/components/ui/submit-button";
import { EVENT_STATUSES, EVENT_STATUS_LABELS } from "@/lib/constants";
import { TIMEZONES } from "@/lib/format";

export type SessionFormValues = {
  id?: string;
  title: string;
  slug: string;
  summary: string | null;
  description: string | null;
  starts_local: string;
  ends_local: string;
  timezone: string;
  format: string | null;
  topics: string[];
  references_text: string | null;
  poster_alt: string | null;
  recording_url: string | null;
  recording_authorized: boolean;
  event_status: string;
  published: boolean;
  speakers: { id: string; role: string }[];
  resources: { id: string; role: string }[];
};

type Opt = { id: string; label: string; hint?: string | null };
const legend = "mb-4 w-full border-b border-line pb-2 font-heading text-lg font-semibold text-brand-blue";

export function SessionForm({ values, options, canEdit }: { values?: SessionFormValues; options: { authors: Opt[]; resources: Opt[] }; canEdit: boolean }) {
  const isEdit = !!values?.id;
  const [state, action] = useActionState(isEdit ? updateSession : createSession, initialFormState);
  const e = state.errors ?? {};
  const d = state.data;
  const val = (key: string, fallback = "") => {
    if (d && key in d) return d[key];
    const v = (values as Record<string, unknown> | undefined)?.[key];
    if (Array.isArray(v)) return v.join("\n");
    return v === null || v === undefined ? fallback : String(v);
  };

  return (
    <form action={action} className="space-y-10" noValidate>
      <FormMessage state={state} />
      {isEdit ? <input type="hidden" name="id" value={values!.id} /> : null}
      <fieldset disabled={!canEdit} className="space-y-10">
        <fieldset className="space-y-5">
          <legend className={legend}>Sessão</legend>
          <Field name="title" label="Tema" required error={e.title}>
            {({ id, describedBy, invalid }) => <Input id={id} name="title" defaultValue={val("title")} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
          <Field name="summary" label="Breve descrição" help="Apresentada nos cartões da listagem (até 600 caracteres)." error={e.summary}>
            {({ id, describedBy, invalid }) => <Textarea id={id} name="summary" rows={2} maxLength={600} defaultValue={val("summary")} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
          <Field name="description" label="Descrição do encontro" error={e.description}>
            {({ id, describedBy, invalid }) => <Textarea id={id} name="description" rows={6} defaultValue={val("description")} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
          <Field name="slug" label="Endereço permanente (slug)" help={values?.published ? "O endereço não pode ser alterado depois da publicação." : "Gerado a partir do tema quando deixado em branco."} error={e.slug}>
            {({ id, describedBy, invalid }) => (
              <div className="flex items-center rounded-md border border-line-strong bg-surface text-sm">
                <span className="px-3 text-muted">/sessoes/</span>
                <Input id={id} name="slug" defaultValue={val("slug")} readOnly={values?.published} className="rounded-l-none border-0 border-l" aria-describedby={describedBy} aria-invalid={invalid} />
              </div>
            )}
          </Field>
        </fieldset>

        <fieldset className="space-y-5">
          <legend className={legend}>Data, horário e estado</legend>
          <p className="text-sm text-muted">Indique apenas datas confirmadas. Sem data, a sessão é apresentada como «Data a confirmar».</p>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field name="starts_at" label="Início" error={e.starts_at}>
              {({ id, describedBy, invalid }) => <Input id={id} name="starts_at" type="datetime-local" defaultValue={val("starts_local")} aria-describedby={describedBy} aria-invalid={invalid} />}
            </Field>
            <Field name="ends_at" label="Fim" error={e.ends_at}>
              {({ id, describedBy, invalid }) => <Input id={id} name="ends_at" type="datetime-local" defaultValue={val("ends_local")} aria-describedby={describedBy} aria-invalid={invalid} />}
            </Field>
            <Field name="timezone" label="Fuso horário" error={e.timezone}>
              {({ id, describedBy, invalid }) => (
                <Select id={id} name="timezone" defaultValue={val("timezone", "Europe/Lisbon")} aria-describedby={describedBy} aria-invalid={invalid}>
                  {TIMEZONES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label.charAt(0).toUpperCase() + t.label.slice(1)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field name="event_status" label="Estado da sessão" error={e.event_status}>
              {({ id, describedBy, invalid }) => (
                <Select id={id} name="event_status" defaultValue={val("event_status", "scheduled")} aria-describedby={describedBy} aria-invalid={invalid}>
                  {EVENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {EVENT_STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field name="format" label="Formato ou local" help="Por exemplo: Online (Zoom) ou o local presencial." error={e.format}>
              {({ id, describedBy, invalid }) => <Input id={id} name="format" defaultValue={val("format")} aria-describedby={describedBy} aria-invalid={invalid} />}
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-5">
          <legend className={legend}>Oradores e materiais</legend>
          <EntityPicker
            name="speaker_ids"
            roleName="speaker_roles"
            roleOptions={[
              { value: "speaker", label: "Orador" },
              { value: "moderator", label: "Moderação" },
            ]}
            label="Oradores"
            options={options.authors}
            initial={values?.speakers ?? []}
            emptyText="Nenhum orador associado."
            searchPlaceholder="Pesquisar autores e oradores registados"
          />
          <EntityPicker
            name="resource_ids"
            roleName="resource_relations"
            roleOptions={[
              { value: "presentation", label: "Apresentação utilizada" },
              { value: "recording", label: "Gravação" },
              { value: "related", label: "Documento relacionado" },
            ]}
            label="Recursos da biblioteca"
            help="Apenas os recursos publicados são apresentados na página pública."
            options={options.resources}
            initial={values?.resources ?? []}
            emptyText="Nenhum recurso associado."
            searchPlaceholder="Pesquisar recursos"
          />
        </fieldset>

        <fieldset className="space-y-5">
          <legend className={legend}>Conteúdos da sessão</legend>
          <Field name="topics" label="Principais assuntos discutidos" help="Um assunto por linha." error={e.topics}>
            {({ id, describedBy, invalid }) => <Textarea id={id} name="topics" rows={4} defaultValue={val("topics")} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
          <Field name="references_text" label="Referências recomendadas" help="Uma referência por linha." error={e.references_text}>
            {({ id, describedBy, invalid }) => <Textarea id={id} name="references_text" rows={4} defaultValue={val("references_text")} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
          <Field name="recording_url" label="Gravação (YouTube, Vimeo ou outro endereço)" error={e.recording_url}>
            {({ id, describedBy, invalid }) => <Input id={id} name="recording_url" type="url" placeholder="https://" defaultValue={val("recording_url")} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
          <Checkbox
            name="recording_authorized"
            defaultChecked={d ? d.recording_authorized === "on" : values?.recording_authorized}
            error={e.recording_authorized}
            label="Confirmo que a disponibilização pública da gravação foi autorizada pelos oradores."
          />
          <Field name="poster_alt" label="Texto alternativo do cartaz" help="Descrição do cartaz para leitores de ecrã." error={e.poster_alt}>
            {({ id, describedBy, invalid }) => <Input id={id} name="poster_alt" defaultValue={val("poster_alt")} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
        </fieldset>

        {canEdit ? (
          <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-3 border-t border-line bg-white/95 px-1 py-4">
            <SubmitButton size="lg" pendingText="A guardar...">
              {isEdit ? "Guardar alterações" : "Criar rascunho"}
            </SubmitButton>
          </div>
        ) : null}
      </fieldset>
    </form>
  );
}
