import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { USER_ROLE_LABELS } from "@/lib/constants";

export default async function NoPermissionPage() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <ShieldCheck aria-hidden="true" className="mx-auto h-10 w-10 stroke-[1.5] text-muted" />
      <h1 className="mt-4 text-2xl font-semibold">Sem permissão</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        A sua função ({USER_ROLE_LABELS[user.role]}) não permite aceder a esta área. Se precisar de acesso, contacte um administrador.
      </p>
      <Link href="/admin" className="link mt-6 inline-block text-sm">
        Voltar à visão geral
      </Link>
    </div>
  );
}
