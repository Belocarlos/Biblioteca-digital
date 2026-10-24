"use client";

import { useActionState, useState } from "react";
import { initialFormState, type FormState } from "@/lib/form-utils";
import { Notice } from "@/components/ui/misc";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import type { Transition } from "@/lib/workflow";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function FormMessage({ state }: { state: FormState }) {
  if (state.status === "error" && state.message) return <Notice tone="danger">{state.message}</Notice>;
  if (state.status === "success" && state.message) return <Notice tone="success">{state.message}</Notice>;
  return null;
}

/** Painel de transições editoriais com nota opcional. */
export function WorkflowForm({ action, id, transitions }: { action: Action; id: string; transitions: Transition[] }) {
  const [state, formAction] = useActionState(action, initialFormState);
  if (!transitions.length) {
    return <p className="text-sm text-muted">Não existem ações editoriais disponíveis para a sua função neste estado.</p>;
  }
  return (
    <form action={formAction} className="space-y-3">
      <FormMessage state={state} />
      <input type="hidden" name="id" value={id} />
      <div>
        <label htmlFor="workflow-note" className="mb-1.5 block text-sm font-medium text-ink-strong">
          Nota editorial <span className="font-normal text-muted">(opcional)</span>
        </label>
        <textarea id="workflow-note" name="note" rows={2} maxLength={1000} className="block w-full rounded-md border border-line-strong px-3 py-2 text-sm focus:border-brand-blue" />
      </div>
      <div className="space-y-2">
        {transitions.map((t) => (
          <div key={t.to}>
            <SubmitButton name="to" value={t.to} variant={t.tone} className="w-full" pendingText="A atualizar...">
              {t.label}
            </SubmitButton>
            <p className="mt-1 text-xs text-muted">{t.description}</p>
          </div>
        ))}
      </div>
    </form>
  );
}

/** Eliminação com confirmação explícita. */
export function DeleteForm({ action, id, label, warning }: { action: Action; id: string; label: string; warning: string }) {
  const [state, formAction] = useActionState(action, initialFormState);
  const [confirmed, setConfirmed] = useState(false);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(`Confirma a eliminação definitiva de "${label}"? Esta ação não pode ser anulada.`)) e.preventDefault();
      }}
      className="space-y-3"
    >
      <FormMessage state={state} />
      <input type="hidden" name="id" value={id} />
      <p className="text-sm text-ink">{warning}</p>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="confirm" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-danger" />
        Compreendo que a eliminação é definitiva.
      </label>
      <SubmitButton variant="danger" disabled={!confirmed} pendingText="A eliminar...">
        Eliminar definitivamente
      </SubmitButton>
    </form>
  );
}

/** Carregamento de um ficheiro (PDF ou imagem) com remoção opcional. */
export function UploadForm({
  action,
  id,
  field,
  accept,
  label,
  help,
  hasFile,
  removeLabel,
  extra,
}: {
  action: Action;
  id: string;
  field: string;
  accept: string;
  label: string;
  help: string;
  hasFile: boolean;
  removeLabel?: string;
  extra?: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  return (
    <form action={formAction} className="space-y-3">
      <FormMessage state={state} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="field" value={field} />
      <div>
        <label htmlFor={`upload-${field}`} className="mb-1.5 block text-sm font-medium text-ink-strong">
          {label}
        </label>
        <input
          id={`upload-${field}`}
          name="file"
          type="file"
          accept={accept}
          aria-describedby={`upload-${field}-help`}
          className="block w-full rounded-md border border-line-strong bg-white text-sm file:mr-3 file:h-10 file:border-0 file:border-r file:border-line-strong file:bg-surface file:px-3 file:text-sm file:font-medium file:text-brand-blue"
        />
        <p id={`upload-${field}-help`} className="mt-1.5 text-xs text-muted">
          {help}
        </p>
      </div>
      {extra}
      <div className="flex flex-wrap gap-2">
        <SubmitButton name="intent" value="upload" size="sm" pendingText="A carregar...">
          {hasFile ? "Substituir" : "Carregar"}
        </SubmitButton>
        {hasFile && removeLabel ? (
          <Button type="submit" name="intent" value="remove" size="sm" variant="secondary" formNoValidate>
            {removeLabel}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
