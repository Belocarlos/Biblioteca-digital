import "server-only";
import sharp from "sharp";
import { LIMITS, formatBytes } from "./constants";

export type UploadResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function isFile(value: FormDataEntryValue | null): value is File {
  return typeof value === "object" && value !== null && "arrayBuffer" in value && (value as File).size > 0;
}

// Marcadores de conteúdo ativo que não são aceites em PDF.
const ACTIVE_CONTENT = [/\/JavaScript\b/, /\/JS\s*[(<\[]/, /\/Launch\b/, /\/EmbeddedFiles?\b/, /\/RichMedia\b/, /\/XFA\b/];

export async function validatePdf(file: File, maxBytes: number): Promise<UploadResult<{ data: Buffer; name: string }>> {
  if (file.size > maxBytes) {
    return { ok: false, error: `O ficheiro excede o limite de ${formatBytes(maxBytes)}.` };
  }
  if (!/\.pdf$/i.test(file.name)) {
    return { ok: false, error: "Apenas são aceites ficheiros PDF." };
  }
  const data = Buffer.from(await file.arrayBuffer());
  const head = data.subarray(0, 1024).toString("latin1");
  if (!head.includes("%PDF-")) {
    return { ok: false, error: "O ficheiro não é um PDF válido." };
  }
  const tail = data.subarray(Math.max(0, data.length - 2048)).toString("latin1");
  if (!tail.includes("%%EOF")) {
    return { ok: false, error: "O ficheiro PDF parece estar incompleto ou danificado." };
  }
  const text = data.toString("latin1");
  if (ACTIVE_CONTENT.some((re) => re.test(text))) {
    return {
      ok: false,
      error: "O PDF contém conteúdo ativo (JavaScript, anexos ou ações automáticas) e não pode ser aceite.",
    };
  }
  const name = sanitizeFileName(file.name);
  return { ok: true, value: { data, name } };
}

export function sanitizeFileName(name: string) {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+/, "")
    .slice(0, 120);
  return base || "documento.pdf";
}

function detectImage(data: Buffer): "jpeg" | "png" | "webp" | null {
  if (data.length < 12) return null;
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "jpeg";
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (data.subarray(0, 4).toString("latin1") === "RIFF" && data.subarray(8, 12).toString("latin1") === "WEBP") return "webp";
  return null;
}

/**
 * Valida e recodifica uma imagem em WebP. A recodificação remove metadados
 * (incluindo localização) e elimina conteúdo malicioso incorporado.
 */
export async function processImage(
  file: File,
  maxWidth: number,
): Promise<UploadResult<{ data: Buffer; width: number; height: number }>> {
  if (file.size > LIMITS.imageBytes) {
    return { ok: false, error: `A imagem excede o limite de ${formatBytes(LIMITS.imageBytes)}.` };
  }
  const input = Buffer.from(await file.arrayBuffer());
  if (!detectImage(input)) {
    return { ok: false, error: "Formato de imagem não suportado. Utilize JPEG, PNG ou WebP." };
  }
  try {
    const { data, info } = await sharp(input, { limitInputPixels: 50_000_000, failOn: "error" })
      .rotate()
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    return { ok: true, value: { data, width: info.width, height: info.height } };
  } catch {
    return { ok: false, error: "Não foi possível processar a imagem. Verifique se o ficheiro está íntegro." };
  }
}
