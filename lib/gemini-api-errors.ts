/**
 * Map common Google Generative Language API failures to a short UI message.
 * See: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com
 */
export function mapGenerativeLanguageSetupError(err: unknown): {
  message: string;
  helpUrl?: string;
  status: number;
} | null {
  const raw = err instanceof Error ? err.message : String(err);

  const apiDisabled =
    raw.includes("SERVICE_DISABLED") ||
    (/403/.test(raw) && raw.includes("generativelanguage.googleapis.com")) ||
    /Gemini API has not been used/i.test(raw) ||
    /is disabled/i.test(raw);

  if (!apiDisabled) return null;

  const activationFromJson = raw.match(/"activationUrl"\s*:\s*"(https:[^"]+)"/);
  const overviewFromText = raw.match(
    /https:\/\/console\.developers\.google\.com\/apis\/api\/generativelanguage\.googleapis\.com\/overview\?project=\d+/,
  );
  const helpUrl =
    activationFromJson?.[1] ??
    overviewFromText?.[0] ??
    "https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com";

  return {
    message:
      "The Generative Language API is not enabled for the Google Cloud project tied to your Gemini API key. Enable it in Google Cloud, wait a few minutes, then retry.",
    helpUrl,
    status: 503,
  };
}

/** Retired / wrong model IDs often return 404 from generativelanguage.googleapis.com */
export function mapGeminiModelNotFoundError(err: unknown): {
  message: string;
  helpUrl?: string;
  status: number;
} | null {
  const raw = err instanceof Error ? err.message : String(err);

  const looksLikeMissingModel =
    raw.includes("[404 Not Found]") ||
    raw.includes("is not found for API version") ||
    (/models\//i.test(raw) && /not found/i.test(raw)) ||
    raw.includes("not supported for generateContent");

  if (!looksLikeMissingModel) return null;

  return {
    message:
      "This Gemini model name is not available for your API key (Google updates and retires model IDs over time). Set GEMINI_MODEL in .env.local to a model your project supports—for example gemini-2.0-flash—then restart npm run dev.",
    helpUrl: "https://ai.google.dev/gemini-api/docs/models/gemini",
    status: 400,
  };
}

export function mapGeminiQuotaError(err: unknown): {
  message: string;
  helpUrl?: string;
  status: number;
  retryAfterSeconds?: number;
} | null {
  const raw = err instanceof Error ? err.message : String(err);

  const isQuota =
    raw.includes("[429 Too Many Requests]") ||
    raw.includes("RESOURCE_EXHAUSTED") ||
    /quota exceeded/i.test(raw) ||
    /Too Many Requests/i.test(raw);

  if (!isQuota) return null;

  const retryMatch = raw.match(/Please retry in ([\d.]+)s/i);
  const retryAfterSeconds = retryMatch
    ? Math.ceil(Number.parseFloat(retryMatch[1]))
    : undefined;

  const limitZero =
    raw.includes("limit: 0") ||
    raw.includes("GenerateRequestsPerDayPerProjectPerModel-FreeTier");

  const message = limitZero
    ? "Google returned no free-tier allowance for this model on your project (you may need billing, a different model, or a new day’s quota). Enable pay-as-you-go or credits in AI Studio, or set GEMINI_MODEL to a model your plan still includes, then restart the dev server."
    : "Gemini rate limit: too many requests in a short window. Wait a bit, then try again—this app now uses one API call per log.";

  return {
    message,
    helpUrl: limitZero
      ? "https://ai.google.dev/gemini-api/docs/billing"
      : "https://ai.google.dev/gemini-api/docs/rate-limits",
    status: 429,
    retryAfterSeconds,
  };
}

export function mapGeminiApiError(err: unknown): {
  message: string;
  helpUrl?: string;
  status: number;
  retryAfterSeconds?: number;
} | null {
  return (
    mapGenerativeLanguageSetupError(err) ??
    mapGeminiModelNotFoundError(err) ??
    mapGeminiQuotaError(err)
  );
}
