export type VideoEmbed = { provider: "youtube" | "vimeo"; embedUrl: string; label: string } | null;

/** Converte endereços do YouTube e do Vimeo em endereços de incorporação com menor recolha de dados. */
export function toVideoEmbed(url: string | null | undefined): VideoEmbed {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.slice(1);
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v");
    else {
      const m = u.pathname.match(/^\/(embed|live|shorts)\/([^/]+)/);
      id = m?.[2] ?? null;
    }
  }
  if (id && /^[A-Za-z0-9_-]{6,20}$/.test(id)) {
    return { provider: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0`, label: "YouTube" };
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = u.pathname.match(/(\d{6,12})/);
    if (m) return { provider: "vimeo", embedUrl: `https://player.vimeo.com/video/${m[1]}?dnt=1`, label: "Vimeo" };
  }
  return null;
}
