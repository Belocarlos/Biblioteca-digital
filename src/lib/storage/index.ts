import "server-only";
import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { env } from "../env";

export type StoredObject = {
  body: ReadableStream<Uint8Array>;
  size: number;
  /** Intervalo devolvido quando o pedido incluiu Range. */
  range?: { start: number; end: number };
};

export interface StorageDriver {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string, range?: { start: number; end?: number }): Promise<StoredObject | null>;
  size(key: string): Promise<number | null>;
  delete(key: string): Promise<void>;
}

const KEY_PATTERN = /^(documents|images|submissions)\/[0-9]{4}\/[0-9a-f-]{36}\.(pdf|webp)$/;

export function assertValidKey(key: string) {
  if (!KEY_PATTERN.test(key)) {
    throw new Error("Chave de armazenamento inválida.");
  }
}

export function newKey(area: "documents" | "images" | "submissions", ext: "pdf" | "webp") {
  return `${area}/${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${ext}`;
}

class LocalStorage implements StorageDriver {
  private root = path.resolve(env.storageLocalDir);

  private resolve(key: string) {
    assertValidKey(key);
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error("Caminho inválido.");
    return full;
  }

  async put(key: string, data: Buffer) {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data, { mode: 0o640 });
  }

  async size(key: string) {
    try {
      return (await stat(this.resolve(key))).size;
    } catch {
      return null;
    }
  }

  async get(key: string, range?: { start: number; end?: number }) {
    const full = this.resolve(key);
    const size = await this.size(key);
    if (size === null) return null;
    if (range) {
      const end = Math.min(range.end ?? size - 1, size - 1);
      const stream = createReadStream(full, { start: range.start, end });
      return { body: Readable.toWeb(stream) as ReadableStream<Uint8Array>, size, range: { start: range.start, end } };
    }
    return { body: Readable.toWeb(createReadStream(full)) as ReadableStream<Uint8Array>, size };
  }

  async delete(key: string) {
    await rm(this.resolve(key), { force: true });
  }
}

class S3Storage implements StorageDriver {
  private clientPromise = (async () => {
    const { S3Client } = await import("@aws-sdk/client-s3");
    return new S3Client({
      region: env.s3.region,
      endpoint: env.s3.endpoint,
      forcePathStyle: env.s3.forcePathStyle,
      credentials:
        env.s3.accessKeyId && env.s3.secretAccessKey
          ? { accessKeyId: env.s3.accessKeyId, secretAccessKey: env.s3.secretAccessKey }
          : undefined,
    });
  })();

  private get bucket() {
    const bucket = env.s3.bucket;
    if (!bucket) throw new Error("S3_BUCKET não está definida.");
    return bucket;
  }

  async put(key: string, data: Buffer, contentType: string) {
    assertValidKey(key);
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await (await this.clientPromise).send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data, ContentType: contentType }),
    );
  }

  async size(key: string) {
    assertValidKey(key);
    const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
    try {
      const head = await (await this.clientPromise).send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return head.ContentLength ?? null;
    } catch {
      return null;
    }
  }

  async get(key: string, range?: { start: number; end?: number }) {
    assertValidKey(key);
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    try {
      const res = await (await this.clientPromise).send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Range: range ? `bytes=${range.start}-${range.end ?? ""}` : undefined,
        }),
      );
      if (!res.Body) return null;
      const body = res.Body.transformToWebStream() as ReadableStream<Uint8Array>;
      let size = res.ContentLength ?? 0;
      let returnedRange: StoredObject["range"];
      const match = res.ContentRange?.match(/bytes (\d+)-(\d+)\/(\d+)/);
      if (match) {
        returnedRange = { start: Number(match[1]), end: Number(match[2]) };
        size = Number(match[3]);
      }
      return { body, size, range: returnedRange };
    } catch {
      return null;
    }
  }

  async delete(key: string) {
    assertValidKey(key);
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    await (await this.clientPromise).send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

let driver: StorageDriver | null = null;

export function storage(): StorageDriver {
  driver ??= env.storageDriver === "s3" ? new S3Storage() : new LocalStorage();
  return driver;
}

/** Elimina um ficheiro sem interromper a operação principal em caso de falha. */
export async function safeDelete(key: string | null | undefined) {
  if (!key) return;
  try {
    await storage().delete(key);
  } catch (error) {
    console.error("Falha ao eliminar ficheiro", key, error);
  }
}
