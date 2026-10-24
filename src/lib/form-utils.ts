import { z } from "zod";

export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string[] | undefined>;
  data?: Record<string, string>;
};

export const initialFormState: FormState = { status: "idle" };

export function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function strOrNull(formData: FormData, key: string) {
  const v = str(formData, key);
  return v === "" ? null : v;
}

export function bool(formData: FormData, key: string) {
  const v = formData.get(key);
  return v === "on" || v === "true" || v === "1";
}

export function list(formData: FormData, key: string) {
  return formData.getAll(key).filter((v): v is string => typeof v === "string" && v.trim() !== "").map((v) => v.trim());
}

/** Divide palavras-chave separadas por vírgula ou ponto e vírgula. */
export function keywords(value: string, max = 20) {
  return Array.from(
    new Set(
      value
        .split(/[;,\n]/)
        .map((k) => k.trim().replace(/\s+/g, " "))
        .filter((k) => k.length > 0 && k.length <= 80),
    ),
  ).slice(0, max);
}

export function zodErrors(error: z.ZodError) {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/** Valores enviados, para repor o formulário em caso de erro (sem ficheiros). */
export function echo(formData: FormData) {
  const data: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string" && !k.startsWith("$") && k !== "form_token") data[k] = v;
  }
  return data;
}

export const optionalUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v), "Indique um endereço completo, começado por http:// ou https://.");
