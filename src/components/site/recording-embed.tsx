"use client";

import { useState } from "react";
import { ExternalLink, PlayCircle } from "lucide-react";

/** A gravação externa só é carregada depois de o visitante o solicitar. */
export function RecordingEmbed({ embedUrl, provider, originalUrl, title }: { embedUrl: string; provider: string; originalUrl: string; title: string }) {
  const [loaded, setLoaded] = useState(false);
  if (loaded) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-md border border-line bg-black">
        <iframe
          src={embedUrl}
          title={`Gravação: ${title}`}
          className="h-full w-full"
          allow="encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        />
      </div>
    );
  }
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-md border border-line bg-surface p-6 text-center">
      <PlayCircle aria-hidden="true" className="h-10 w-10 stroke-[1.25] text-brand-blue" />
      <p className="max-w-md text-sm leading-relaxed text-ink">
        A gravação está alojada no {provider}. Ao carregar o vídeo, aplica-se a política de privacidade dessa plataforma.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => setLoaded(true)} className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-blue px-4 text-sm font-medium text-white hover:bg-brand-blue-dark">
          Carregar vídeo
        </button>
        <a href={originalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-md border border-line-strong bg-white px-4 text-sm font-medium text-brand-blue hover:bg-brand-blue-50">
          Abrir no {provider}
          <ExternalLink aria-hidden="true" className="h-4 w-4" />
          <span className="sr-only">(abre numa nova janela)</span>
        </a>
      </div>
    </div>
  );
}
