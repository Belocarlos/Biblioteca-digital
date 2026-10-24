"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./button";
import type { ComponentProps } from "react";

export function SubmitButton({ children, pendingText = "A enviar...", ...props }: ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-disabled={pending} {...props}>
      {pending ? pendingText : children}
    </Button>
  );
}
