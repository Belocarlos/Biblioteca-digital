import type { EditorialStatus, UserRole } from "./constants";

export type Transition = { to: EditorialStatus; label: string; tone: "primary" | "secondary" | "green" | "danger"; description: string };

/**
 * Transições apresentadas na interface. As mesmas regras são aplicadas pela
 * base de dados (app.enforce_editorial), que rejeita qualquer outra transição.
 */
export function allowedTransitions(role: UserRole, status: EditorialStatus): Transition[] {
  const t: Transition[] = [];
  const isAdmin = role === "admin";
  const isEditor = role === "editor" || isAdmin;
  const isReviewer = role === "reviewer" || isAdmin;
  switch (status) {
    case "draft":
      if (isEditor) t.push({ to: "in_review", label: "Enviar para revisão", tone: "primary", description: "O conteúdo fica disponível para revisão e aprovação." });
      if (isAdmin) t.push({ to: "published", label: "Publicar diretamente", tone: "secondary", description: "Apenas administradores podem publicar sem revisão." });
      break;
    case "in_review":
      if (isReviewer) t.push({ to: "approved", label: "Aprovar", tone: "green", description: "Confirma que o conteúdo e os direitos foram verificados." });
      if (isEditor || isReviewer) t.push({ to: "draft", label: "Devolver a rascunho", tone: "secondary", description: "Indique na nota o que deve ser corrigido." });
      break;
    case "approved":
      if (isEditor) t.push({ to: "published", label: "Publicar", tone: "green", description: "O conteúdo passa a estar visível no website." });
      if (isEditor || isReviewer) t.push({ to: "draft", label: "Devolver a rascunho", tone: "secondary", description: "Retira a aprovação para nova edição." });
      break;
    case "published":
      if (isEditor) t.push({ to: "archived", label: "Arquivar", tone: "secondary", description: "O conteúdo deixa de estar visível no website, sem ser eliminado." });
      break;
    case "archived":
      if (isEditor) t.push({ to: "draft", label: "Reabrir como rascunho", tone: "secondary", description: "Permite editar e submeter novamente para revisão." });
      if (isAdmin) t.push({ to: "published", label: "Republicar", tone: "secondary", description: "Volta a publicar o conteúdo arquivado." });
      break;
  }
  return t;
}

export const STATUS_TONES: Record<EditorialStatus, "neutral" | "blue" | "green" | "teal" | "warning"> = {
  draft: "neutral",
  in_review: "warning",
  approved: "teal",
  published: "green",
  archived: "neutral",
};

export function canEditContent(role: UserRole) {
  return role === "admin" || role === "editor";
}
