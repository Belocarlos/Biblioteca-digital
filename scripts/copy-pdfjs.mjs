// Copia o worker e os recursos do pdf.js para public/pdfjs (servidos pela própria plataforma).
import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const src = path.join(process.cwd(), "node_modules", "pdfjs-dist");
const dest = path.join(process.cwd(), "public", "pdfjs");
await rm(dest, { recursive: true, force: true });
await mkdir(dest, { recursive: true });
await cp(path.join(src, "build", "pdf.worker.min.mjs"), path.join(dest, "pdf.worker.min.mjs"));
for (const dir of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
  await cp(path.join(src, dir), path.join(dest, dir), { recursive: true });
}
console.log("Recursos do pdf.js copiados para public/pdfjs.");
