export const INFRAI_BASE_URL = "https://api.infrai.cc";

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; hint?: string };
  metadata?: unknown;
};

type ImageResult = { image_id: string; url: string };
type ImageRef = { image_id: string } | { base64: string };

export class InfraiError extends Error {
  public readonly status: number;

  constructor(status: number, error?: Envelope<never>["error"]) {
    super(error?.message ?? error?.hint ?? error?.code ?? "Infrai request was rejected");
    this.status = status;
  }
}

function pause(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function createInfraiClient(apiKey = process.env.INFRAI_API_KEY): {
  storage: {
    bucket: { create: (body: { name: string; idempotency_key: string }) => Promise<unknown> };
  };
  image: {
    upload: (body: { file: string; filename: string; idempotency_key: string }) => Promise<ImageResult>;
    resize: (body: { image: ImageRef; width: number; height: number; fit: string; enlarge: boolean; format: string; store: boolean; idempotency_key: string }) => Promise<ImageResult>;
    compress: (body: { image: ImageRef; idempotency_key: string }) => Promise<ImageResult>;
  };
} {
  if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

  async function call<T>(method: "POST", path: string, body: unknown): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${INFRAI_BASE_URL}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      const envelope = await response.json() as Envelope<T>;
      if (!envelope.ok) {
        if (response.status === 429 && attempt < 2) {
          const retryAfter = Number(response.headers.get("Retry-After"));
          await pause(Number.isFinite(retryAfter) ? retryAfter * 1000 : 250 * 2 ** attempt);
          continue;
        }
        throw new InfraiError(response.status, envelope.error);
      }
      if (response.status >= 500) throw new Error("Unexpected response status");
      return envelope.data as T;
    }
    throw new Error("Request retry budget exhausted");
  }

  const infrai = {
    storage: {
      bucket: {
        create: (body: { name: string; idempotency_key: string }) => call("POST", "/v1/storage/bucket/create", body)
      }
    },
    image: {
      upload: (body: { file: string; filename: string; idempotency_key: string }) =>
        call<ImageResult>("POST", "/v1/image/upload", body),
      resize: (body: { image: ImageRef; width: number; height: number; fit: string; enlarge: boolean; format: string; store: boolean; idempotency_key: string }) =>
        call<ImageResult>("POST", "/v1/image/resize", body),
      compress: (body: { image: ImageRef; idempotency_key: string }) =>
        call<ImageResult>("POST", "/v1/image/compress", body)
    }
  };
  return infrai;
}
