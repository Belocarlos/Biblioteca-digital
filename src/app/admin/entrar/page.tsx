import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/site/logo";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/admin");
  return (
    <main id="conteudo" className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 inline-flex">
          <Logo />
        </Link>
        <div className="rounded-lg border border-line bg-white p-6 sm:p-8">
          <h1 className="text-2xl font-semibold">Área reservada</h1>
          <p className="mt-1.5 text-sm text-muted">Acesso exclusivo da equipa editorial da biblioteca.</p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
        <p className="mt-6 text-center text-xs leading-relaxed text-muted">
          As contas são criadas por um administrador. Em caso de dificuldade de acesso, contacte a equipa responsável.
          <br />
          <Link href="/" className="link mt-2 inline-block">
            Voltar ao website
          </Link>
        </p>
      </div>
    </main>
  );
}
