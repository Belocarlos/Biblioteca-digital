"use client";

import { useId, useState } from "react";
import { CopyButton } from "./copy-button";
import { cn } from "@/lib/cn";

export function CitationBox({ apa, abnt }: { apa: string; abnt: string }) {
  const [style, setStyle] = useState<"apa" | "abnt">("apa");
  const id = useId();
  const text = style === "apa" ? apa : abnt;
  return (
    <div className="rounded-md border border-line bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <h2 className="text-base font-semibold" id={`${id}-t`}>
          Referência bibliográfica
        </h2>
        <div role="radiogroup" aria-labelledby={`${id}-t`} className="flex rounded-md border border-line-strong p-0.5 text-xs">
          {(["apa", "abnt"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={style === s}
              onClick={() => setStyle(s)}
              className={cn("rounded-sm px-2.5 py-1 font-medium", style === s ? "bg-brand-blue text-white" : "text-brand-blue hover:bg-brand-blue-50")}
            >
              {s === "apa" ? "APA 7" : "ABNT"}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4">
        <p className="select-all break-words text-sm leading-relaxed text-ink-strong" aria-live="polite">
          {text}
        </p>
        <p className="mt-2 text-xs text-muted">Gerada automaticamente a partir dos metadados disponíveis. Confirme a referência antes de a utilizar.</p>
        <CopyButton text={text} label="Copiar referência" copiedLabel="Referência copiada" className="mt-3" />
      </div>
    </div>
  );
}
