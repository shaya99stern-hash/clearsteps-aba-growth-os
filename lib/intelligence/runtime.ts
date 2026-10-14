// Request-runtime primitives shared by the public collectors.
//
// Scout fans out to dozens of public endpoints under a fixed serverless time limit. These helpers
// keep that fan-out fast and polite: identical requests are cached and coalesced, concurrent calls
// to one provider are bounded, a provider that keeps failing is skipped for a cooldown instead of
// costing a full timeout per query, and every stage can ask how much of the run budget remains.

/** Time-bounded LRU cache. Insertion order doubles as recency order in a Map. */
export class TtlCache<V> {
  private readonly entries = new Map<string, { value: V; expiresAt: number }>();

  constructor(private readonly maxEntries: number, private readonly ttlMs: number, private readonly now: () => number = Date.now) {}

  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: V, ttlMs = this.ttlMs) {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.now() + ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  clear() {
    this.entries.clear();
  }

  get size() {
    return this.entries.size;
  }
}

/**
 * Cache + in-flight coalescing. Concurrent callers for the same key share one upstream request;
 * only settled values that `shouldCache` accepts are kept, so failures are retried next time.
 */
export class CoalescingCache<V> {
  private readonly cache: TtlCache<V>;
  private readonly inFlight = new Map<string, Promise<V>>();

  constructor(maxEntries: number, ttlMs: number, private readonly shouldCache: (value: V) => boolean = () => true, now?: () => number) {
    this.cache = new TtlCache<V>(maxEntries, ttlMs, now);
  }

  async get(key: string, load: () => Promise<V>): Promise<V> {
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;
    const pending = this.inFlight.get(key);
    if (pending) return pending;
    const request = load().then((value) => {
      if (this.shouldCache(value)) this.cache.set(key, value);
      return value;
    }).finally(() => {
      this.inFlight.delete(key);
    });
    this.inFlight.set(key, request);
    return request;
  }

  peek(key: string) {
    return this.cache.get(key);
  }

  clear() {
    this.cache.clear();
    this.inFlight.clear();
  }
}

/** Counting semaphore for bounding concurrent requests to one provider. */
export class Semaphore {
  private active = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) await new Promise<void>((resolve) => this.waiters.push(resolve));
    this.active += 1;
    try {
      return await task();
    } finally {
      this.active -= 1;
      this.waiters.shift()?.();
    }
  }

  get pending() {
    return this.waiters.length;
  }
}

/**
 * Opens after `threshold` consecutive failures and stays open for `cooldownMs`, after which a
 * single trial request is allowed through (half-open). Any success closes it again.
 */
export class CircuitBreaker {
  private failures = 0;
  private openedAt: number | null = null;

  constructor(private readonly threshold: number, private readonly cooldownMs: number, private readonly now: () => number = Date.now) {}

  get isOpen() {
    if (this.openedAt === null) return false;
    if (this.now() - this.openedAt >= this.cooldownMs) {
      // Half-open: let the next request probe the provider.
      this.openedAt = null;
      this.failures = this.threshold - 1;
      return false;
    }
    return true;
  }

  recordSuccess() {
    this.failures = 0;
    this.openedAt = null;
  }

  recordFailure() {
    this.failures += 1;
    if (this.failures >= this.threshold) this.openedAt = this.now();
  }

  reset() {
    this.failures = 0;
    this.openedAt = null;
  }
}

/** Wall-clock budget for one request. Stages check `remaining()` before optional work. */
export class Deadline {
  private readonly startedAt: number;

  constructor(private readonly budgetMs: number, private readonly now: () => number = Date.now) {
    this.startedAt = now();
  }

  elapsed() {
    return this.now() - this.startedAt;
  }

  remaining() {
    return Math.max(0, this.budgetMs - this.elapsed());
  }

  /** True when at least `ms` of budget is left. */
  allows(ms: number) {
    return this.remaining() >= ms;
  }
}

export const TIMED_OUT = Symbol("timed-out");

/**
 * Resolves with the task's value, or with `fallback` once `ms` elapses. The underlying task keeps
 * running (fetches carry their own abort timers); the caller simply stops waiting for it.
 */
export async function withinBudget<T, F>(task: Promise<T>, ms: number, fallback: F): Promise<T | F> {
  if (ms <= 0) {
    task.catch(() => undefined);
    return fallback;
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<F>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  try {
    return await Promise.race([task, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Reads at most `maxBytes` of a response body as UTF-8 text, cancelling the rest of the stream. */
export async function readTextCapped(response: Response, maxBytes: number): Promise<string> {
  const declared = Number(response.headers.get("content-length"));
  if (!response.body) return "";
  if (Number.isFinite(declared) && declared > 0 && declared <= maxBytes) return response.text();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";
  try {
    while (received < maxBytes) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      const slice = received + value.byteLength > maxBytes ? value.subarray(0, maxBytes - received) : value;
      received += slice.byteLength;
      text += decoder.decode(slice, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.cancel().catch(() => undefined);
  }
  return text;
}
