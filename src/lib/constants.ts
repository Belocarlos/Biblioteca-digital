export const SITE_NAME = "Biblioteca Digital Open Lecture4All";
export const PROGRAM_NAME = "Open Lecture4All";
export const SLOGAN = "Conhecimento sem fronteiras, acessível a todos.";
export const DEFAULT_CONTACT_EMAIL = "openlecture4all@gmail.com";

export const RESOURCE_TYPES = [
  "book",
  "article",
  "thesis",
  "presentation",
  "report",
  "guide",
  "recording",
  "supplementary",
  "institutional",
] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  book: "Livro ou e-book",
  article: "Artigo científico",
  thesis: "Trabalho académico",
  presentation: "Apresentação",
  report: "Relatório",
  guide: "Guia ou manual",
  recording: "Gravação de sessão",
  supplementary: "Material complementar",
  institutional: "Publicação institucional",
};

export const RESOURCE_TYPE_PLURAL: Record<ResourceType, string> = {
  book: "Livros e e-books",
  article: "Artigos científicos",
  thesis: "Trabalhos académicos",
  presentation: "Apresentações",
  report: "Relatórios",
  guide: "Guias e manuais",
  recording: "Gravações de sessões",
  supplementary: "Materiais complementares",
  institutional: "Publicações institucionais",
};

export const EDITORIAL_STATUSES = ["draft", "in_review", "approved", "published", "archived"] as const;
export type EditorialStatus = (typeof EDITORIAL_STATUSES)[number];

export const EDITORIAL_STATUS_LABELS: Record<EditorialStatus, string> = {
  draft: "Rascunho",
  in_review: "Em revisão",
  approved: "Aprovado",
  published: "Publicado",
  archived: "Arquivado",
};

export const EVENT_STATUSES = ["scheduled", "held", "postponed", "cancelled"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];
export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  scheduled: "Programada",
  held: "Realizada",
  postponed: "Adiada",
  cancelled: "Cancelada",
};

export const SUBMISSION_STATUSES = ["pending", "under_review", "accepted", "rejected"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];
export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  pending: "Pendente",
  under_review: "Em análise",
  accepted: "Aceite",
  rejected: "Recusada",
};

export const USER_ROLES = ["admin", "editor", "reviewer"] as const;
export type UserRole = (typeof USER_ROLES)[number];
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  editor: "Editor",
  reviewer: "Revisor",
};
export const USER_ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: "Controlo completo da plataforma, incluindo utilizadores e configurações.",
  editor: "Gestão de recursos, sessões, autores e coleções.",
  reviewer: "Revisão e aprovação de materiais e análise de submissões.",
};

export const LANGUAGES: { code: string; label: string }[] = [
  { code: "pt", label: "Português" },
  { code: "en", label: "Inglês" },
  { code: "es", label: "Espanhol" },
  { code: "fr", label: "Francês" },
  { code: "it", label: "Italiano" },
  { code: "de", label: "Alemão" },
  { code: "tet", label: "Tétum" },
  { code: "kea", label: "Crioulo cabo-verdiano" },
  { code: "mul", label: "Vários idiomas" },
];

export function languageLabel(code: string | null | undefined) {
  if (!code) return "";
  return LANGUAGES.find((l) => l.code === code)?.label ?? code.toUpperCase();
}

export const COUNTRY_SUGGESTIONS = [
  "Angola",
  "Brasil",
  "Cabo Verde",
  "Guiné-Bissau",
  "Guiné Equatorial",
  "Moçambique",
  "Portugal",
  "São Tomé e Príncipe",
  "Timor-Leste",
  "Alemanha",
  "Argentina",
  "Bélgica",
  "Canadá",
  "Chile",
  "Colômbia",
  "Espanha",
  "Estados Unidos",
  "França",
  "Itália",
  "Macau",
  "México",
  "Países Baixos",
  "Reino Unido",
  "Suíça",
];

export type LicenseInfo = {
  code: string;
  label: string;
  url?: string;
  /** Indica se a licença, por si só, permite a redistribuição do ficheiro. */
  permitsRedistribution: boolean;
};

export const LICENSES: LicenseInfo[] = [
  { code: "CC-BY-4.0", label: "Creative Commons Atribuição 4.0 (CC BY 4.0)", url: "https://creativecommons.org/licenses/by/4.0/deed.pt", permitsRedistribution: true },
  { code: "CC-BY-SA-4.0", label: "Creative Commons Atribuição-CompartilhaIgual 4.0 (CC BY-SA 4.0)", url: "https://creativecommons.org/licenses/by-sa/4.0/deed.pt", permitsRedistribution: true },
  { code: "CC-BY-NC-4.0", label: "Creative Commons Atribuição-NãoComercial 4.0 (CC BY-NC 4.0)", url: "https://creativecommons.org/licenses/by-nc/4.0/deed.pt", permitsRedistribution: true },
  { code: "CC-BY-NC-SA-4.0", label: "Creative Commons Atribuição-NãoComercial-CompartilhaIgual 4.0 (CC BY-NC-SA 4.0)", url: "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.pt", permitsRedistribution: true },
  { code: "CC-BY-ND-4.0", label: "Creative Commons Atribuição-SemDerivações 4.0 (CC BY-ND 4.0)", url: "https://creativecommons.org/licenses/by-nd/4.0/deed.pt", permitsRedistribution: true },
  { code: "CC-BY-NC-ND-4.0", label: "Creative Commons Atribuição-NãoComercial-SemDerivações 4.0 (CC BY-NC-ND 4.0)", url: "https://creativecommons.org/licenses/by-nc-nd/4.0/deed.pt", permitsRedistribution: true },
  { code: "CC0-1.0", label: "Dedicação ao domínio público (CC0 1.0)", url: "https://creativecommons.org/publicdomain/zero/1.0/deed.pt", permitsRedistribution: true },
  { code: "public-domain", label: "Domínio público", permitsRedistribution: true },
  { code: "author-permission", label: "Disponibilização autorizada pelo titular dos direitos", permitsRedistribution: true },
  { code: "all-rights-reserved", label: "Todos os direitos reservados", permitsRedistribution: false },
  { code: "other", label: "Outra licença (ver detalhes)", permitsRedistribution: false },
];

export function licenseInfo(code: string | null | undefined): LicenseInfo {
  return LICENSES.find((l) => l.code === code) ?? { code: code ?? "", label: code ?? "Não indicada", permitsRedistribution: false };
}

export const LIMITS = {
  pdfAdminBytes: 60 * 1024 * 1024,
  pdfSubmissionBytes: 25 * 1024 * 1024,
  imageBytes: 8 * 1024 * 1024,
};

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toLocaleString("pt-PT", { maximumFractionDigits: unit === 0 ? 0 : 1 })} ${units[unit]}`;
}
