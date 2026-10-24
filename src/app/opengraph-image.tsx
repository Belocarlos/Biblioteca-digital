import { ImageResponse } from "next/og";

export const alt = "Biblioteca Digital Open Lecture4All";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagem de partilha predefinida. Pode ser substituída nas Configurações do painel. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#FFFFFF", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 96, height: 96, background: "#163A5F", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 40, fontWeight: 700 }}>
            OL4
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 30, color: "#287D62", fontWeight: 600 }}>Programa Open Lecture4All</div>
          </div>
        </div>
        <div style={{ marginTop: 80, fontSize: 76, fontWeight: 700, color: "#163A5F", lineHeight: 1.1 }}>Biblioteca Digital Open Lecture4All</div>
        <div style={{ marginTop: 28, fontSize: 34, color: "#374151" }}>Conhecimento sem fronteiras, acessível a todos.</div>
        <div style={{ marginTop: "auto", height: 10, width: "100%", display: "flex" }}>
          <div style={{ flex: 3, background: "#163A5F" }} />
          <div style={{ flex: 1, background: "#287D62" }} />
          <div style={{ flex: 1, background: "#238C91" }} />
        </div>
      </div>
    ),
    size,
  );
}
