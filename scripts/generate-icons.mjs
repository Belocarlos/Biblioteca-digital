// Gera favicon.ico (16, 32, 48) e apple-icon.png (180) a partir de src/app/icon.svg.
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const svg = await readFile("src/app/icon.svg");
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map((s) => sharp(svg, { density: 384 }).resize(s, s).png().toBuffer()));

// Formato ICO com imagens PNG incorporadas.
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
const entries = [];
let offset = 6 + 16 * sizes.length;
sizes.forEach((s, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s, 0);
  e.writeUInt8(s, 1);
  e.writeUInt8(0, 2);
  e.writeUInt8(0, 3);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(pngs[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  entries.push(e);
});
await writeFile("src/app/favicon.ico", Buffer.concat([header, ...entries, ...pngs]));

// Ícone para dispositivos Apple, com margem e fundo sólido.
const inner = await sharp(svg, { density: 512 }).resize(140, 140).png().toBuffer();
await sharp({ create: { width: 180, height: 180, channels: 4, background: "#163A5F" } })
  .composite([{ input: inner, gravity: "center" }])
  .png()
  .toFile("src/app/apple-icon.png");
console.log("Ícones gerados.");
