"use client";

import { useActionState } from "react";
import { convertSubmission, updateSubmissionStatus } from "./actions";
import { initialFormState } from "@/lib/form-utils";
import { FormMessage } from "@/components/admin/forms";
import { SubmitButton } from "@/components/ui/submit-button";
import { SUBMISSION_STATUS_LABELS, type SubmissionStatus } from "@/lib/constants";

const NEXT: Record<SubmissionStatus, SubmissionStatus[]> = {
  pending: ["under_review", "rejected"],
  under_review: ["accepted", "rejected", "pending"],
  accepted: [],
  rejected: ["under_review"],
};

const LABELS: Partial<Record<SubmissionStatus, string>> = {
  under_review: "Iniciar análise",
  accepted: "Aceitar",
  rejected: "Recusar",
  pending: "Voltar a pendente",
};

export function SubmissionStatusForm({ id, status, isAdmin }: { id: string; status: SubmissionStatus; isAdmin: boolean }) {
  const [state, action] = useActionState(updateSubmissionStatus, initialFormState);
  const options = isAdmin && status === "accepted" ? (["under_review"] as SubmissionStatus[]) : NEXT[status];
  if (!options.length) return <p className="text-sm text-muted">A submissão foi aceite. Não existem outras ações de estado.</p>;
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <input type="hidden" name="id" value={id} />
      <div>
        <label htmlFor="sub-note" className="mb-1.5 block text-sm font-medium text-ink-strong">
          Nota de revisão
        </label>
        <textarea id="sub-note" name="note" rows={3} maxLength={2000} className="block w-full rounded-md border border-line-strong px-3 py-2 text-sm" aria-describedby="sub-note-help" />
        <p id="sub-note-help" className="mt-1 text-xs text-muted">
          Obrigatória em caso de recusa. Fica registada no histórico de revisão.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((to) => (
          <SubmitButton key={to} name="to" value={to} size="sm" variant={to === "accepted" ? "green" : to === "rejected" ? "danger" : "secondary"} pendingText="A atualizar...">
            {LABELS[to] ?? SUBMISSION_STATUS_LABELS[to]}
          </SubmitButton>
        ))}
      </div>
    </form>
  );
}

export function ConvertForm({ id }: { id: string }) {
  const [state, action] = useActionState(convertSubmission, initialFormState);
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <input type="hidden" name="id" value={id} />
      <p className="text-sm text-ink">Cria um recurso em rascunho com os metadados e o ficheiro desta submissão. O recurso segue depois o fluxo editorial normal.</p>
      <SubmitButton variant="primary" pendingText="A converter...">
        Converter em recurso
      </SubmitButton>
    </form>
  );
}
