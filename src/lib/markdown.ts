import "server-only";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

marked.setOptions({ gfm: true, breaks: false });

/** Converte Markdown em HTML seguro. */
export function renderMarkdown(source: string | null | undefined) {
  if (!source) return "";
  const html = marked.parse(source, { async: false }) as string;
  return sanitizeHtml(html, {
    allowedTags: ["h2", "h3", "h4", "p", "ul", "ol", "li", "strong", "em", "a", "blockquote", "code", "br", "hr", "table", "thead", "tbody", "tr", "th", "td"],
    allowedAttributes: { a: ["href", "title", "rel", "target"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: (tagName, attribs) => {
        const external = /^https?:\/\//.test(attribs.href ?? "");
        return {
          tagName,
          attribs: external ? { ...attribs, rel: "noopener noreferrer", target: "_blank" } : attribs,
        };
      },
    },
  });
}

/** Converte texto simples com parágrafos separados por linhas em branco. */
export function paragraphs(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
