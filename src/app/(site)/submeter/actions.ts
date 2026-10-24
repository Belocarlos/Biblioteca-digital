"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { sql } from "@/lib/db";
import { LIMITS, RESOURCE_TYPES } from "@/lib/constants";
import { bool, echo, keywords, optionalUrl, str, zodErrors, type FormState } from "@/lib/form-utils";
import { clientIpHash, verifyFormToken } from "@/lib/security";
import { isFile, validatePdf } from "@/lib/uploads";
import { newKey, safeDelete, storage } from "@/lib/storage";

const schema = z.object({
  submitter_name: z.string().trim().min(2, "Indique o nome completo.").max(160),
  submitter_email: z.string().trim().max(254).email("Indique um endereço de e-mail válido."),
  submitter_institution: z.string().trim().max(200),
  submitter_country: z.string().trim().max(80),
  title: z.string().trim().min(2, "Indique o título do documento.").max(500),
  material_type: z.enum(RESOURCE_TYPES, { message: "Selecione o tipo de material." }),
  authors_text: z.string().trim().min(2, "Indique os autores do documento.").max(1000),
  abstract: z.string().trim().min(20, "O resumo deve ter pelo menos 20 caracteres.").max(5000),
  keywords: z.string().trim().max(600),
  external_url: optionalUrl,
  license_info: z.string().trim().min(3, "Indique a licença ou as condições de direitos de autor.").max(2000),
});

function referenceCode() {
  const d = new Date();
  const date = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rand = Array.from(randomBytes(6), (b) => alphabet[b % alphabet.length]).join("");
  return `SUB-${date}-${rand}`;
}

export async function submitMaterial(_prev: FormState, formData: FormData): Promise<FormState> {
  const data = echo(formData);

  // Proteção contra envios automáticos: campo-isco e tempo mínimo de preenchimento.
  if (str(formData, "website") !== "" || !verifyFormToken(str(formData, "form_token"), 4)) {
    return { status: "error", message: "Não foi possível validar o envio. Atualize a página e tente novamente.", data };
  }

  const parsed = schema.safeParse(Object.fromEntries(Object.keys(schema.shape).map((k) => [k, str(formData, k)])));
  const errors: Record<string, string[]> = parsed.success ? {} : zodErrors(parsed.error);

  if (!bool(formData, "authorization_confirmed")) {
    errors.authorization_confirmed = ["É necessário confirmar a declaração de autorização."];
  }
  if (!bool(formData, "privacy_acknowledged")) {
    errors.privacy_acknowledged = ["É necessário tomar conhecimento da Política de Privacidade."];
  }
  const file = formData.get("file");
  const hasFile = isFile(file);
  if (!hasFile && !(parsed.success && parsed.data.external_url)) {
    errors.file = ["Envie o ficheiro PDF ou indique o link oficial do documento."];
  }

  let pdf: { data: Buffer; name: string } | null = null;
  if (hasFile) {
    const result = await validatePdf(file, LIMITS.pdfSubmissionBytes);
    if (!result.ok) errors.file = [result.error];
    else pdf = result.value;
  }

  if (!parsed.success || Object.keys(errors).length > 0) {
    return { status: "error", message: "Verifique os campos assinalados.", errors, data };
  }

  const ipHash = await clientIpHash();
  const [{ allowed }] = await sql<{ allowed: boolean }[]>`
    select app.rate_limit_hit(${`submission:${ipHash}`}, '1 hour'::interval, 5) as allowed`;
  if (!allowed) {
    return { status: "error", message: "Foi atingido o limite de submissões. Tente novamente dentro de uma hora.", data };
  }

  const v = parsed.data;
  const code = referenceCode();
  let fileKey: string | null = null;
  try {
    if (pdf) {
      fileKey = newKey("submissions", "pdf");
      await storage().put(fileKey, pdf.data, "application/pdf");
    }
    await sql`
      insert into submissions (
        reference_code, submitter_name, submitter_email, submitter_institution, submitter_country,
        title, material_type, authors_text, abstract, keywords,
        file_key, file_name, file_size, external_url, license_info,
        authorization_confirmed, privacy_acknowledged
      ) values (
        ${code}, ${v.submitter_name}, ${v.submitter_email}, ${v.submitter_institution || null}, ${v.submitter_country || null},
        ${v.title}, ${v.material_type}, ${v.authors_text}, ${v.abstract}, ${keywords(v.keywords)},
        ${fileKey}, ${pdf?.name ?? null}, ${pdf ? pdf.data.length : null}, ${v.external_url || null}, ${v.license_info},
        true, true
      )`;
  } catch (error) {
    await safeDelete(fileKey);
    console.error(error);
    return { status: "error", message: "Não foi possível registar a submissão. Tente novamente mais tarde.", data };
  }

  return {
    status: "success",
    message: code,
  };
}
