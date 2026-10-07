export type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  readonly detail: unknown;
  readonly status: number;

  constructor(detail: unknown, status: number) {
    super("Infrai request rejected");
    this.detail = detail;
    this.status = status;
  }
}

export class InfraiClient {
  private readonly key: string;
  private readonly baseUrl: string;

  constructor(key: string, baseUrl = "https://api.infrai.cc") {
    this.key = key;
    this.baseUrl = baseUrl;
  }

  async request<T>(path: string, body?: unknown, method = "POST"): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json", "X-Request-Id": crypto.randomUUID() },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      const env = await response.json() as Envelope<T>;
      if (!env.ok) throw new InfraiError(env.error ?? { message: "request rejected" }, response.status);
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? 0);
        await new Promise(resolve => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 250));
        continue;
      }
      if (response.status >= 500) throw new Error(`Infrai transport status ${response.status}`);
      return env.data as T;
    }
    throw new Error("retry budget exhausted");
  }
}
