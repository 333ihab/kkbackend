const TRANSIENT_CODES = new Set([
  "EAI_AGAIN",
  "ENOTFOUND",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENETUNREACH",
]);

class SupabaseUnavailableError extends Error {
  constructor(cause) {
    super("Supabase is temporarily unavailable.", { cause });
    this.name = "SupabaseUnavailableError";
    this.status = 503;
  }
}

const isTransientSupabaseError = (error) => {
  if (!error) return false;

  const status = Number(error.status ?? error.statusCode);
  // PostgREST assigns status 0 to fetch-level failures before an HTTP response exists.
  if (status === 0) return true;
  if (status === 408 || status === 425 || status === 429 || status >= 500) {
    return true;
  }

  const code = String(error.code || error.cause?.code || error.details?.match(/\(([A-Z_]+)\)/)?.[1] || "").toUpperCase();
  if (TRANSIENT_CODES.has(code)) return true;

  // fetch() reports network failures as TypeError; timeouts use AbortError.
  const message = `${error.name || ""} ${error.message || ""} ${error.details || ""} ${error.hint || ""}`;
  return error.name === "TypeError" || error.name === "AbortError" ||
    /(?:TypeError: fetch failed|AbortError:|Request was aborted)/i.test(message);
};

module.exports = { SupabaseUnavailableError, isTransientSupabaseError };
