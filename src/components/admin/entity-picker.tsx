"use client";

import { useId, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";

type Option = { id: string; label: string; hint?: string | null };
type Selected = { id: string; role?: string };

/**
 * Seleção ordenada de registos relacionados (autores, oradores, recursos).
 * Envia campos ocultos "<name>" e, opcionalmente, "<roleName>" na mesma ordem.
 */
export function EntityPicker({
  name,
  roleName,
  roleOptions,
  options,
  initial,
  label,
  help,
  emptyText,
  searchPlaceholder = "Pesquisar...",
  disabled = false,
}: {
  name: string;
  roleName?: string;
  roleOptions?: { value: string; label: string }[];
  options: Option[];
  initial: Selected[];
  label: string;
  help?: string;
  emptyText: string;
  searchPlaceholder?: string;
  disabled?: boolean;
}) {
  const [selected, setSelected] = useState<Selected[]>(initial.filter((s) => options.some((o) => o.id === s.id)));
  const [query, setQuery] = useState("");
  const id = useId();
  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);

  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const suggestions = query.trim()
    ? options.filter((o) => !selected.some((s) => s.id === o.id) && norm(`${o.label} ${o.hint ?? ""}`).includes(norm(query.trim()))).slice(0, 8)
    : [];

  const move = (index: number, delta: number) => {
    setSelected((list) => {
      const next = [...list];
      const target = index + delta;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  };

  return (
    <fieldset disabled={disabled}>
      <legend className="mb-1.5 text-sm font-medium text-ink-strong">{label}</legend>
      {help ? <p className="mb-2 text-xs text-muted">{help}</p> : null}
      {selected.length ? (
        <ol className="mb-3 divide-y divide-line rounded-md border border-line">
          {selected.map((s, i) => {
            const opt = byId.get(s.id);
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                <input type="hidden" name={name} value={s.id} />
                {roleName ? <input type="hidden" name={roleName} value={s.role ?? roleOptions?.[0]?.value ?? ""} /> : null}
                <span className="w-5 text-xs tabular-nums text-muted">{i + 1}.</span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-ink-strong">{opt?.label ?? s.id}</span>
                  {opt?.hint ? <span className="ml-2 text-xs text-muted">{opt.hint}</span> : null}
                </span>
                {roleOptions ? (
                  <select
                    aria-label={`Função de ${opt?.label}`}
                    value={s.role ?? roleOptions[0]?.value}
                    onChange={(e) => setSelected((list) => list.map((x) => (x.id === s.id ? { ...x, role: e.target.value } : x)))}
                    className="h-8 rounded-md border border-line-strong bg-white px-2 text-xs"
                  >
                    {roleOptions.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                ) : null}
                <span className="flex gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-brand-blue hover:bg-brand-blue-50 disabled:opacity-30" aria-label={`Subir ${opt?.label}`}>
                    <ArrowUp aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === selected.length - 1} className="rounded p-1 text-brand-blue hover:bg-brand-blue-50 disabled:opacity-30" aria-label={`Descer ${opt?.label}`}>
                    <ArrowDown aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setSelected((list) => list.filter((x) => x.id !== s.id))} className="rounded p-1 text-danger hover:bg-danger-50" aria-label={`Remover ${opt?.label}`}>
                    <X aria-hidden="true" className="h-4 w-4" />
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mb-3 rounded-md border border-dashed border-line-strong px-3 py-3 text-sm text-muted">{emptyText}</p>
      )}
      <div className="relative">
        <label htmlFor={`${id}-q`} className="sr-only">
          {searchPlaceholder}
        </label>
        <input
          id={`${id}-q`}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
          placeholder={searchPlaceholder}
          autoComplete="off"
          className="h-10 w-full rounded-md border border-line-strong bg-white px-3 text-sm focus:border-brand-blue"
        />
        {query.trim() ? (
          <ul className="mt-1 divide-y divide-line rounded-md border border-line bg-white" aria-label="Resultados">
            {suggestions.length ? (
              suggestions.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected((list) => [...list, { id: o.id, role: roleOptions?.[0]?.value }]);
                      setQuery("");
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-brand-blue-50"
                  >
                    <Plus aria-hidden="true" className="h-4 w-4 text-brand-green" />
                    <span className="font-medium">{o.label}</span>
                    {o.hint ? <span className="text-xs text-muted">{o.hint}</span> : null}
                  </button>
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-muted">Sem resultados.</li>
            )}
          </ul>
        ) : null}
      </div>
    </fieldset>
  );
}
