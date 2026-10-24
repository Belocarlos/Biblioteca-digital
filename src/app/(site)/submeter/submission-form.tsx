"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitMaterial } from "./actions";
import { initialFormState } from "@/lib/form-utils";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Notice } from "@/components/ui/misc";
import { SubmitButton } from "@/components/ui/submit-button";
import { COUNTRY_SUGGESTIONS, RESOURCE_TYPES, RESOURCE_TYPE_LABELS } from "@/lib/constants";

export function SubmissionForm({ formToken, maxMb }: { formToken: string; maxMb: number }) {
  const [state, action] = useActionState(submitMaterial, initialFormState);
  const e = state.errors ?? {};
  const d = state.data ?? {};

  if (state.status === "success") {
    return (
      <div role="status" className="rounded-lg border border-[#cfe6dc] bg-brand-green-50 p-6 sm:p-8">
        <CheckCircle2 aria-hidden="true" className="h-8 w-8 text-brand-green" />
        <h2 className="mt-3 text-2xl font-semibold">Submissão recebida</h2>
        <p className="mt-3 leading-relaxed text-ink-strong">
          A proposta foi registada com a referência <strong className="font-mono">{state.message}</strong>. Guarde esta referência para contactos futuros.
        </p>
        <p className="mt-2 leading-relaxed text-ink-strong">
          O material não é publicado automaticamente. A equipa editorial irá analisar a proposta e poderá contactar através do endereço de e-mail indicado.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/biblioteca" className="inline-flex h-10 items-center rounded-md bg-brand-blue px-4 text-sm font-medium text-white hover:bg-brand-blue-dark">
            Voltar à biblioteca
          </Link>
          <a href="/submeter" className="inline-flex h-10 items-center rounded-md border border-line-strong bg-white px-4 text-sm font-medium text-brand-blue hover:bg-brand-blue-50">
            Submeter outro material
          </a>
        </div>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="space-y-10">
      {state.status === "error" && state.message ? (
        <Notice tone="danger" title="Não foi possível enviar a submissão">
          {state.message}
        </Notice>
      ) : null}
      <input type="hidden" name="form_token" value={formToken} />
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Não preencher este campo</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <fieldset className="space-y-5">
        <legend className="mb-1 w-full border-b border-line pb-2 font-heading text-xl font-semibold text-brand-blue">1. Dados do proponente</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="submitter_name" label="Nome completo" required error={e.submitter_name}>
            {({ id, describedBy, invalid }) => <Input id={id} name="submitter_name" autoComplete="name" required defaultValue={d.submitter_name} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
          <Field name="submitter_email" label="E-mail" required error={e.submitter_email}>
            {({ id, describedBy, invalid }) => <Input id={id} name="submitter_email" type="email" autoComplete="email" required defaultValue={d.submitter_email} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
          <Field name="submitter_institution" label="Instituição" error={e.submitter_institution}>
            {({ id, describedBy, invalid }) => <Input id={id} name="submitter_institution" autoComplete="organization" defaultValue={d.submitter_institution} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
          <Field name="submitter_country" label="País" error={e.submitter_country}>
            {({ id, describedBy, invalid }) => (
              <>
                <Input id={id} name="submitter_country" list="paises" autoComplete="country-name" defaultValue={d.submitter_country} aria-describedby={describedBy} aria-invalid={invalid} />
                <datalist id="paises">
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
        <legend className="mb-1 w-full border-b border-line pb-2 font-heading text-xl font-semibold text-brand-blue">2. Documento</legend>
        <Field name="title" label="Título do documento" required error={e.title}>
          {({ id, describedBy, invalid }) => <Input id={id} name="title" required defaultValue={d.title} aria-describedby={describedBy} aria-invalid={invalid} />}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="material_type" label="Tipo de material" required error={e.material_type}>
            {({ id, describedBy, invalid }) => (
              <Select id={id} name="material_type" required defaultValue={d.material_type ?? ""} aria-describedby={describedBy} aria-invalid={invalid}>
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
          <Field name="authors_text" label="Autores" required help="Indique todos os autores, separados por ponto e vírgula." error={e.authors_text}>
            {({ id, describedBy, invalid }) => <Input id={id} name="authors_text" required defaultValue={d.authors_text} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
        </div>
        <Field name="abstract" label="Resumo" required error={e.abstract}>
          {({ id, describedBy, invalid }) => <Textarea id={id} name="abstract" rows={6} required defaultValue={d.abstract} aria-describedby={describedBy} aria-invalid={invalid} />}
        </Field>
        <Field name="keywords" label="Palavras-chave" help="Separe as palavras-chave por vírgulas." error={e.keywords}>
          {({ id, describedBy, invalid }) => <Input id={id} name="keywords" defaultValue={d.keywords} aria-describedby={describedBy} aria-invalid={invalid} />}
        </Field>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-1 w-full border-b border-line pb-2 font-heading text-xl font-semibold text-brand-blue">3. Ficheiro ou link oficial</legend>
        <p className="text-sm text-muted">Envie o ficheiro em PDF ou indique o endereço da publicação oficial. Pelo menos uma das opções é obrigatória.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="file" label="Ficheiro PDF" help={`Formato PDF, até ${maxMb} MB. Não são aceites ficheiros com JavaScript ou anexos.`} error={e.file}>
            {({ id, describedBy, invalid }) => (
              <input
                id={id}
                name="file"
                type="file"
                accept="application/pdf,.pdf"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                className="block w-full rounded-md border border-line-strong bg-white text-sm file:mr-3 file:h-10 file:border-0 file:border-r file:border-line-strong file:bg-surface file:px-3 file:text-sm file:font-medium file:text-brand-blue"
              />
            )}
          </Field>
          <Field name="external_url" label="Link oficial" error={e.external_url}>
            {({ id, describedBy, invalid }) => <Input id={id} name="external_url" type="url" inputMode="url" placeholder="https://" defaultValue={d.external_url} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-1 w-full border-b border-line pb-2 font-heading text-xl font-semibold text-brand-blue">4. Licença e direitos de autor</legend>
        <Field
          name="license_info"
          label="Informação sobre licença e direitos de autor"
          required
          help="Indique a licença (por exemplo, CC BY 4.0), o titular dos direitos e se autoriza a leitura online e o descarregamento."
          error={e.license_info}
        >
          {({ id, describedBy, invalid }) => <Textarea id={id} name="license_info" rows={3} required defaultValue={d.license_info} aria-describedby={describedBy} aria-invalid={invalid} />}
        </Field>
        <Checkbox
          name="authorization_confirmed"
          required
          defaultChecked={d.authorization_confirmed === "on"}
          error={e.authorization_confirmed}
          label="Declaro que sou titular dos direitos sobre o material ou que disponho de autorização para o disponibilizar, e que as informações prestadas são verdadeiras."
        />
        <Checkbox
          name="privacy_acknowledged"
          required
          defaultChecked={d.privacy_acknowledged === "on"}
          error={e.privacy_acknowledged}
          label={
            <>
              Tomei conhecimento da{" "}
              <Link href="/politica-de-privacidade" className="link" target="_blank">
                Política de Privacidade
              </Link>{" "}
              e dos{" "}
              <Link href="/termos-e-condicoes" className="link" target="_blank">
                Termos e Condições
              </Link>
              .
            </>
          }
        />
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
        <SubmitButton size="lg" pendingText="A enviar a submissão...">
          Enviar submissão
        </SubmitButton>
        <p className="text-sm text-muted">Os campos assinalados com * são obrigatórios.</p>
      </div>
    </form>
  );
}
