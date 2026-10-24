"use client";

import { useActionState } from "react";
import { saveAbout, saveGeneralSettings, saveLegalDocument, savePartner, saveTeamMember } from "./actions";
import { initialFormState } from "@/lib/form-utils";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { FormMessage } from "@/components/admin/forms";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";

export function GeneralSettingsForm({ values }: { values: { contact_email: string; social_links: { label: string; url: string }[]; home_about: string } }) {
  const [state, action] = useActionState(saveGeneralSettings, initialFormState);
  const e = state.errors ?? {};
  const d = state.data;
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <Field name="contact_email" label="Contacto institucional" required error={e.contact_email}>
        {({ id, describedBy, invalid }) => <Input id={id} name="contact_email" type="email" defaultValue={d?.contact_email ?? values.contact_email} aria-describedby={describedBy} aria-invalid={invalid} />}
      </Field>
      <Field name="social_links" label="Redes sociais oficiais" help="Uma por linha: Etiqueta | https://endereço. Apenas perfis oficiais confirmados. Sem ligações, a secção não é apresentada." error={e.social_links}>
        {({ id, describedBy, invalid }) => (
          <Textarea id={id} name="social_links" rows={3} defaultValue={d?.social_links ?? values.social_links.map((l) => `${l.label} | ${l.url}`).join("\n")} aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>
      <Field name="home_about" label="Texto «Sobre a iniciativa» da página inicial" required error={e.home_about}>
        {({ id, describedBy, invalid }) => <Textarea id={id} name="home_about" rows={5} defaultValue={d?.home_about ?? values.home_about} aria-describedby={describedBy} aria-invalid={invalid} />}
      </Field>
      <SubmitButton pendingText="A guardar...">Guardar</SubmitButton>
    </form>
  );
}

export function AboutForm({ value }: { value: string }) {
  const [state, action] = useActionState(saveAbout, initialFormState);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <Field name="about_md" label="Conteúdo (Markdown)" help="Utilize ## para títulos de secção e - para listas. A equipa e os parceiros são apresentados automaticamente a seguir a este texto.">
        {({ id, describedBy }) => <Textarea id={id} name="about_md" rows={18} className="font-mono text-xs" defaultValue={state.data?.about_md ?? value} aria-describedby={describedBy} />}
      </Field>
      <SubmitButton pendingText="A guardar...">Guardar texto</SubmitButton>
    </form>
  );
}

export function LegalForm({ doc }: { doc: { slug: string; title: string; body_md: string; review_status: string } }) {
  const [state, action] = useActionState(saveLegalDocument, initialFormState);
  return (
    <form action={action} className="space-y-5">
      <FormMessage state={state} />
      <input type="hidden" name="slug" value={doc.slug} />
      <Field name="title" label="Título" required>
        {({ id }) => <Input id={id} name="title" defaultValue={state.data?.title ?? doc.title} />}
      </Field>
      <Field name="body_md" label="Texto (Markdown)" required help="Cada gravação cria uma nova versão no histórico.">
        {({ id, describedBy }) => <Textarea id={id} name="body_md" rows={28} className="font-mono text-xs" defaultValue={state.data?.body_md ?? doc.body_md} aria-describedby={describedBy} />}
      </Field>
      <Checkbox
        name="approve"
        defaultChecked={doc.review_status === "approved"}
        label="Esta versão foi revista juridicamente e aprovada pela instituição"
        description="Sem esta confirmação, a página pública apresenta o aviso de documento em revisão."
      />
      <SubmitButton pendingText="A guardar...">Guardar documento</SubmitButton>
    </form>
  );
}

type Member = { id: string; name: string; role_title: string | null; bio: string | null; position: number; is_published: boolean; photo_authorized: boolean; photo_key: string | null };

export function TeamMemberForm({ member }: { member?: Member }) {
  const [state, action] = useActionState(saveTeamMember, initialFormState);
  const e = state.errors ?? {};
  const key = member?.id ?? "novo";
  if (!member && state.status === "success") {
    return (
      <div className="space-y-3">
        <FormMessage state={state} />
        <a href="/admin/configuracoes/equipa" className="link text-sm">
          Adicionar outro elemento
        </a>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      {member ? <input type="hidden" name="id" value={member.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_6rem]">
        <div>
          <label htmlFor={`tm-name-${key}`} className="mb-1.5 block text-sm font-medium">Nome</label>
          <Input id={`tm-name-${key}`} name="name" defaultValue={member?.name} aria-invalid={!!e.name} />
        </div>
        <div>
          <label htmlFor={`tm-role-${key}`} className="mb-1.5 block text-sm font-medium">Função</label>
          <Input id={`tm-role-${key}`} name="role_title" defaultValue={member?.role_title ?? ""} />
        </div>
        <div>
          <label htmlFor={`tm-pos-${key}`} className="mb-1.5 block text-sm font-medium">Ordem</label>
          <Input id={`tm-pos-${key}`} name="position" type="number" min={0} defaultValue={member?.position ?? 0} />
        </div>
      </div>
      <div>
        <label htmlFor={`tm-bio-${key}`} className="mb-1.5 block text-sm font-medium">Nota biográfica</label>
        <Textarea id={`tm-bio-${key}`} name="bio" rows={2} defaultValue={member?.bio ?? ""} />
      </div>
      <div>
        <label htmlFor={`tm-file-${key}`} className="mb-1.5 block text-sm font-medium">Fotografia real autorizada {member?.photo_key ? "(substituir)" : ""}</label>
        <input id={`tm-file-${key}`} name="file" type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm" />
      </div>
      <div className="flex flex-wrap gap-6">
        <Checkbox id={`tm-auth-${key}`} name="photo_authorized" defaultChecked={member?.photo_authorized} label="Utilização da fotografia autorizada" />
        <Checkbox id={`tm-pub-${key}`} name="is_published" defaultChecked={member?.is_published} label="Publicar na página Sobre Nós" />
      </div>
      <div className="flex gap-2">
        <SubmitButton size="sm" pendingText="A guardar...">{member ? "Guardar" : "Adicionar"}</SubmitButton>
        {member ? (
          <Button type="submit" name="intent" value="delete" size="sm" variant="secondary" formNoValidate onClick={(ev) => { if (!window.confirm("Remover este elemento da equipa?")) ev.preventDefault(); }}>
            Remover
          </Button>
        ) : null}
      </div>
    </form>
  );
}

type Partner = { id: string; name: string; url: string | null; description: string | null; position: number; partnership_confirmed: boolean; is_published: boolean; logo_key: string | null };

export function PartnerForm({ partner }: { partner?: Partner }) {
  const [state, action] = useActionState(savePartner, initialFormState);
  const key = partner?.id ?? "novo";
  if (!partner && state.status === "success") {
    return (
      <div className="space-y-3">
        <FormMessage state={state} />
        <a href="/admin/configuracoes/parceiros" className="link text-sm">
          Adicionar outro parceiro
        </a>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      {partner ? <input type="hidden" name="id" value={partner.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_6rem]">
        <div>
          <label htmlFor={`p-name-${key}`} className="mb-1.5 block text-sm font-medium">Nome da organização</label>
          <Input id={`p-name-${key}`} name="name" defaultValue={partner?.name} />
        </div>
        <div>
          <label htmlFor={`p-url-${key}`} className="mb-1.5 block text-sm font-medium">Website</label>
          <Input id={`p-url-${key}`} name="url" type="url" placeholder="https://" defaultValue={partner?.url ?? ""} />
        </div>
        <div>
          <label htmlFor={`p-pos-${key}`} className="mb-1.5 block text-sm font-medium">Ordem</label>
          <Input id={`p-pos-${key}`} name="position" type="number" min={0} defaultValue={partner?.position ?? 0} />
        </div>
      </div>
      <div>
        <label htmlFor={`p-desc-${key}`} className="mb-1.5 block text-sm font-medium">Descrição</label>
        <Textarea id={`p-desc-${key}`} name="description" rows={2} defaultValue={partner?.description ?? ""} />
      </div>
      <div>
        <label htmlFor={`p-file-${key}`} className="mb-1.5 block text-sm font-medium">Logótipo oficial {partner?.logo_key ? "(substituir)" : ""}</label>
        <input id={`p-file-${key}`} name="file" type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm" />
      </div>
      <div className="flex flex-wrap gap-6">
        <Checkbox id={`p-conf-${key}`} name="partnership_confirmed" defaultChecked={partner?.partnership_confirmed} label="Parceria formalmente confirmada" />
        <Checkbox id={`p-pub-${key}`} name="is_published" defaultChecked={partner?.is_published} label="Publicar na página Sobre Nós" />
      </div>
      <div className="flex gap-2">
        <SubmitButton size="sm" pendingText="A guardar...">{partner ? "Guardar" : "Adicionar"}</SubmitButton>
        {partner ? (
          <Button type="submit" name="intent" value="delete" size="sm" variant="secondary" formNoValidate onClick={(ev) => { if (!window.confirm("Remover este parceiro?")) ev.preventDefault(); }}>
            Remover
          </Button>
        ) : null}
      </div>
    </form>
  );
}
