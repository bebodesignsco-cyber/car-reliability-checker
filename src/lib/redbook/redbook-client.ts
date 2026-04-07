const DEFAULT_BASE = "https://api.redbookdirect.com";

export type RedbookPaged<T = Record<string, unknown>> = {
  limit?: number | null;
  offset?: number | null;
  totalCount?: number;
  currentCount?: number;
  results?: T[] | null;
};

function getStr(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return undefined;
}

function getNum(obj: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return undefined;
}

export function parseTokenResponse(body: string): {
  accessToken: string;
  refreshToken?: string;
  expiresInMs?: number;
} {
  const j = JSON.parse(body) as Record<string, unknown>;
  const access = getStr(j, "accessToken", "access_token", "token");
  if (!access) {
    throw new Error("Redbook /token response: could not find access token field");
  }
  const refresh = getStr(j, "refreshToken", "refresh_token");
  const expSec = getNum(j, "expiresIn", "expires_in");
  const expiresInMs = expSec !== undefined ? Math.max(0, expSec - 120) * 1000 : undefined;
  return { accessToken: access, refreshToken: refresh, expiresInMs };
}

export class RedbookDirectClient {
  private readonly baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private accessExpiresAt = 0;

  constructor(
    private readonly apiKey: string,
    options?: { baseUrl?: string },
  ) {
    this.baseUrl = (options?.baseUrl ?? DEFAULT_BASE).replace(/\/$/, "");
  }

  private async ensureToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.accessExpiresAt) {
      return this.accessToken;
    }
    if (this.refreshToken) {
      try {
        await this.refresh();
        if (this.accessToken && now < this.accessExpiresAt) return this.accessToken;
      } catch {
        this.refreshToken = null;
      }
    }
    const res = await fetch(`${this.baseUrl}/token`, {
      method: "GET",
      headers: {
        "x-api-key": this.apiKey,
        Accept: "application/json",
      },
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Redbook /token failed ${res.status}: ${text}`);
    }
    const parsed = parseTokenResponse(text);
    this.accessToken = parsed.accessToken;
    this.refreshToken = parsed.refreshToken ?? null;
    this.accessExpiresAt = parsed.expiresInMs !== undefined ? Date.now() + parsed.expiresInMs : Date.now() + 50 * 60_000;
    return this.accessToken;
  }

  private async refresh(): Promise<void> {
    if (!this.accessToken || !this.refreshToken) return;
    const res = await fetch(`${this.baseUrl}/token/refresh`, {
      method: "GET",
      headers: {
        "x-accesstoken": this.accessToken,
        "x-refreshtoken": this.refreshToken,
        Accept: "application/json",
      },
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Redbook /token/refresh failed ${res.status}: ${text}`);
    const parsed = parseTokenResponse(text);
    this.accessToken = parsed.accessToken;
    this.refreshToken = parsed.refreshToken ?? this.refreshToken;
    this.accessExpiresAt =
      parsed.expiresInMs !== undefined ? Date.now() + parsed.expiresInMs : Date.now() + 50 * 60_000;
  }

  async fetchJson<T>(path: string, init?: RequestInit, retried401 = false): Promise<T> {
    const token = await this.ensureToken();
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...init?.headers,
      },
    });
    const text = await res.text();
    if (res.status === 401 && !retried401 && this.refreshToken) {
      await this.refresh();
      return this.fetchJson<T>(path, init, true);
    }
    if (!res.ok) {
      throw new Error(`Redbook ${path} failed ${res.status}: ${text}`);
    }
    return JSON.parse(text) as T;
  }

  async fetchAllPages<T extends Record<string, unknown>>(
    pathWithQuery: string,
    options?: { pauseMs?: number },
  ): Promise<T[]> {
    const limit = 100;
    const out: T[] = [];
    let offset = 0;
    const pauseMs = options?.pauseMs ?? 0;

    for (;;) {
      const sep = pathWithQuery.includes("?") ? "&" : "?";
      const pagePath = `${pathWithQuery}${sep}limit=${limit}&offset=${offset}`;
      const data = await this.fetchJson<RedbookPaged<T>>(pagePath);
      const batch = data.results ?? [];
      out.push(...batch);
      if (pauseMs > 0) await new Promise((r) => setTimeout(r, pauseMs));
      if (batch.length === 0) break;
      const total = data.totalCount;
      if (total !== undefined && total !== null && out.length >= total) break;
      if (batch.length < limit) break;
      offset += limit;
    }
    return out;
  }
}

export function rbName(obj: Record<string, unknown>): string {
  return getStr(obj, "Name", "name") ?? "Unknown";
}

export function rbId(obj: Record<string, unknown>): number | undefined {
  return getNum(obj, "Id", "id");
}

export function rbYearStartEnd(obj: Record<string, unknown>): {
  start?: number;
  end?: number;
} {
  return {
    start: getNum(obj, "StartYear", "startYear"),
    end: getNum(obj, "EndYear", "endYear"),
  };
}

export function yearRangeLabel(start?: number | null, end?: number | null): string {
  if (start != null && end != null) return `${start}-${end}`;
  if (start != null) return `${start}+`;
  if (end != null) return `≤${end}`;
  return "?";
}
