export const MAIN_NAV = [
  { href: "/", label: "Início" },
  { href: "/biblioteca", label: "Biblioteca" },
  { href: "/sessoes", label: "Sessões" },
  { href: "/autores", label: "Autores" },
  { href: "/colecoes", label: "Coleções" },
  { href: "/sobre", label: "Sobre Nós" },
  { href: "/contactos", label: "Contactos" },
] as const;

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
