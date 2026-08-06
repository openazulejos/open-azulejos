const DEFAULT_RETRYABLE_STATUS = new Set([408, 425, 429]);

export function isRetryableStatus(status) {
  return DEFAULT_RETRYABLE_STATUS.has(status) || status >= 500;
}

function retryAfterMilliseconds(response) {
  const value = response.headers?.get?.("retry-after");
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
}

const defaultSleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function fetchWithRetry(url, options = {}, retryOptions = {}) {
  const {
    attempts = 6,
    baseDelayMs = 1500,
    maxDelayMs = 20000,
    fetchImpl = globalThis.fetch,
    sleep = defaultSleep,
    onRetry = () => {},
  } = retryOptions;

  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, options);
      if (response.ok || !isRetryableStatus(response.status) || attempt === attempts) return response;

      const delayMs = retryAfterMilliseconds(response)
        ?? Math.min(maxDelayMs, baseDelayMs * (2 ** (attempt - 1)));
      await response.body?.cancel?.().catch(() => {});
      onRetry({ attempt, attempts, delayMs, status: response.status, error: null });
      await sleep(delayMs);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) throw error;
      const delayMs = Math.min(maxDelayMs, baseDelayMs * (2 ** (attempt - 1)));
      onRetry({ attempt, attempts, delayMs, status: null, error });
      await sleep(delayMs);
    }
  }

  throw lastError || new Error("request failed after retries");
}
