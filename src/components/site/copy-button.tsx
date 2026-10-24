"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/cn";

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "absolute";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  document.body.removeChild(area);
}

export function CopyButton({
  text,
  label,
  copiedLabel = "Copiado",
  icon,
  className,
}: {
  text: string;
  label: string;
  copiedLabel?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          try {
            await copyText(text);
            setCopied(true);
            setFailed(false);
            setTimeout(() => setCopied(false), 2500);
          } catch {
            setFailed(true);
          }
        }}
        className={cn(
          "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line-strong bg-white px-4 text-sm font-medium text-brand-blue hover:border-brand-blue hover:bg-brand-blue-50",
          className,
        )}
      >
        {copied ? <Check aria-hidden="true" className="h-4 w-4 text-brand-green" /> : (icon ?? <Copy aria-hidden="true" className="h-4 w-4" />)}
        {copied ? copiedLabel : label}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? copiedLabel : failed ? "Não foi possível copiar. Selecione e copie o texto manualmente." : ""}
      </span>
    </>
  );
}

/** Copia o endereço permanente da página atual (partilha). */
export function ShareButton({ url }: { url: string }) {
  return (
    <CopyButton
      text={url}
      label="Copiar endereço"
      copiedLabel="Endereço copiado"
      icon={
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      }
    />
  );
}
