import "server-only";

function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

export const env = {
  get databaseUrl() {
    return read("DATABASE_URL");
  },
  /** URL pública da plataforma, sem barra final. Preparada para um domínio próprio futuro. */
  get siteUrl() {
    return (read("SITE_URL") ?? "http://localhost:3000").replace(/\/+$/, "");
  },
  /** A indexação por motores de pesquisa só é permitida quando SITE_INDEXING=true. */
  get indexingEnabled() {
    return read("SITE_INDEXING") === "true";
  },
  get appSecret() {
    const secret = read("APP_SECRET");
    if (!secret) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("APP_SECRET tem de estar definida em produção.");
      }
      return "desenvolvimento-apenas-nao-utilizar-em-producao";
    }
    if (secret.length < 32) {
      throw new Error("APP_SECRET tem de ter pelo menos 32 caracteres.");
    }
    return secret;
  },
  get cookieSecure() {
    const v = read("COOKIE_SECURE");
    if (v) return v === "true";
    return process.env.NODE_ENV === "production";
  },
  get storageDriver(): "local" | "s3" {
    return read("STORAGE_DRIVER") === "s3" ? "s3" : "local";
  },
  get storageLocalDir() {
    return read("STORAGE_LOCAL_DIR") ?? "./storage";
  },
  s3: {
    get endpoint() {
      return read("S3_ENDPOINT");
    },
    get region() {
      return read("S3_REGION") ?? "auto";
    },
    get bucket() {
      return read("S3_BUCKET");
    },
    get accessKeyId() {
      return read("S3_ACCESS_KEY_ID");
    },
    get secretAccessKey() {
      return read("S3_SECRET_ACCESS_KEY");
    },
    get forcePathStyle() {
      return read("S3_FORCE_PATH_STYLE") === "true";
    },
  },
};
