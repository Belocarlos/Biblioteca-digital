import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "block w-full rounded-md border border-line-strong bg-white px-3 text-sm text-ink-strong placeholder:text-muted/80 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 disabled:bg-surface aria-[invalid=true]:border-danger";

export function Label({ htmlFor, children, required, className }: { htmlFor: string; children: ReactNode; required?: boolean; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1.5 block text-sm font-medium text-ink-strong", className)}>
      {children}
      {required ? (
        <span className="ml-0.5 text-danger" aria-hidden="true">
          *
        </span>
      ) : null}
      {required ? <span className="sr-only"> (obrigatório)</span> : null}
    </label>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-10", className)} {...props} />;
}

export function Textarea({ className, rows = 4, ...props }: ComponentProps<"textarea">) {
  return <textarea rows={rows} className={cn(control, "py-2 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(control, "h-10 pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Help({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1.5 text-xs leading-relaxed text-muted">
      {children}
    </p>
  );
}

export function FieldError({ id, message }: { id?: string; message?: string | string[] | null }) {
  const text = Array.isArray(message) ? message[0] : message;
  if (!text) return null;
  return (
    <p id={id} className="mt-1.5 text-xs font-medium text-danger">
      {text}
    </p>
  );
}

type FieldProps = {
  name: string;
  label: string;
  required?: boolean;
  help?: ReactNode;
  error?: string | string[] | null;
  className?: string;
  children?: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
};

/** Campo com etiqueta, ajuda e mensagem de erro associadas por aria-describedby. */
export function Field({ name, label, required, help, error, className, children }: FieldProps) {
  const id = `f-${name}`;
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {children?.({ id, describedBy, invalid: !!error })}
      {help ? <Help id={helpId}>{help}</Help> : null}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

export function Checkbox({
  name,
  label,
  description,
  defaultChecked,
  required,
  error,
  value = "on",
  id: idProp,
}: {
  id?: string;
  name: string;
  label: ReactNode;
  description?: ReactNode;
  defaultChecked?: boolean;
  required?: boolean;
  error?: string | string[] | null;
  value?: string;
}) {
  const id = idProp ?? `f-${name}`;
  const errId = error ? `${id}-error` : undefined;
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={id}
          name={name}
          type="checkbox"
          value={value}
          defaultChecked={defaultChecked}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={errId}
          className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border-line-strong accent-brand-blue"
        />
        <label htmlFor={id} className="text-sm leading-relaxed text-ink-strong">
          {label}
          {description ? <span className="mt-0.5 block text-xs text-muted">{description}</span> : null}
        </label>
      </div>
      <FieldError id={errId} message={error} />
    </div>
  );
}
