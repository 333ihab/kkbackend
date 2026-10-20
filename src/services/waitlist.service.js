const supabase = require("../config/supabase");
const {
  SupabaseUnavailableError,
  isTransientSupabaseError,
} = require("../utils/supabaseErrors");

const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 2500;
const BASE_RETRY_DELAY_MS = 150;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runWithRetry = async (operation, options = {}) => {
  const attempts = options.attempts ?? MAX_ATTEMPTS;
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const wait = options.sleep || sleep;
  const random = options.random || Math.random;
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await operation(controller.signal);
      const { data, error, status } = response;
      if (error) {
        if (error.status === undefined) error.status = status;
        throw error;
      }
      return data;
    } catch (error) {
      lastError = error;
      if (!isTransientSupabaseError(error)) throw error;
      if (attempt === attempts) break;

      const exponential = BASE_RETRY_DELAY_MS * 2 ** (attempt - 1);
      await wait(Math.round(exponential * (0.5 + random())));
    } finally {
      clearTimeout(timer);
    }
  }

  throw new SupabaseUnavailableError(lastError);
};

const createWaitlistService = (client, options = {}) => {
  const withOptions = { ...options };

  const createWaitlistEntry = async (data) => {
    const { fullName, email, size } = data;

    try {
      return await runWithRetry(
        (signal) => client
          .from("clothing_waitlist")
          .insert([{ name: fullName, email, size }])
          .select()
          .single()
          .retry(false)
          .abortSignal(signal),
        withOptions
      );
    } catch (error) {
      if (error.code !== "23505") throw error;

      // A previous request may have committed while its response was lost.
      // The existing unique email constraint makes a retry safe.
      const existing = await runWithRetry(
        (signal) => client
          .from("clothing_waitlist")
          .select("id,name,email,size,created_at")
          .eq("email", email)
          .maybeSingle()
          .retry(false)
          .abortSignal(signal),
        withOptions
      );

      if (existing) return { ...existing, wasExisting: true };
      throw error;
    }
  };

  const checkDatabase = async () => runWithRetry(
    (signal) => client
      .from("clothing_waitlist")
      .select("id")
      .limit(1)
      .retry(false)
      .abortSignal(signal),
    { ...withOptions, attempts: 1, timeoutMs: Math.min(withOptions.timeoutMs ?? REQUEST_TIMEOUT_MS, 1500) }
  );

  return { createWaitlistEntry, checkDatabase };
};

module.exports = {
  ...createWaitlistService(supabase),
  createWaitlistService,
  runWithRetry,
};
