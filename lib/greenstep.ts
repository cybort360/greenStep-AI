export const GREENSTEP_ASSISTANT_PREFIX = "[GREENSTEP_ASSISTANT]";

export const COACH_SYSTEM_PROMPT = `You are GreenStep AI, a persistent sustainability coach. Use the provided context to track CO2 impact. Always respond in structured JSON: { "impact_score": number, "insight": string, "challenge": string, "recommendation": string, "total_saved": number, "echo_effect": string }.

Rules:
- impact_score: estimated kilograms of CO2 equivalent avoided or reduced for THIS log entry (0 if unclear).
- insight: one short, encouraging sentence about the environmental meaning of their action.
- challenge: one concrete micro-challenge for their next step.
- recommendation: one personalised, actionable lifestyle change the user can make — focused on behaviour, habit, or routine adjustments (e.g. dietary swaps, transport choices, energy habits, consumption patterns) — that would meaningfully reduce their greenhouse gas emissions and carbon footprint based on the patterns in their history. Never suggest downloading apps or purchasing specific products.
- total_saved: running cumulative kg CO2e saved across the whole conversation history (sum or update consistently from prior context).
- echo_effect: ONE short sentence estimating the CO2 equivalent in grams for running this single AI response itself (model inference only, rough order-of-magnitude).
- Use realistic emission factors; prefer conservative estimates when uncertain.
- Output JSON only, no markdown fences.`;

export type CoachPayload = {
  impact_score: number;
  insight: string;
  challenge: string;
  recommendation: string;
  total_saved: number;
};

export type ParsedCoachResponse = CoachPayload & {
  /** Gemini estimate of this request’s own footprint (Echo Effect). */
  echo_effect?: string;
};

export function parseCoachJson(raw: string): ParsedCoachResponse {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  const data = JSON.parse(cleaned) as Record<string, unknown>;
  const echoRaw = data.echo_effect;
  return {
    impact_score: Number(data.impact_score ?? 0),
    insight: String(data.insight ?? ""),
    challenge: String(data.challenge ?? ""),
    recommendation: String(data.recommendation ?? ""),
    total_saved: Number(data.total_saved ?? 0),
    echo_effect:
      echoRaw !== undefined && echoRaw !== null ? String(echoRaw).trim() : undefined,
  };
}

export type ThreadMessage = { role: string; content: string | null };

export function threadMessagesToGeminiContents(
  messages: ThreadMessage[],
): { role: "user" | "model"; parts: { text: string }[] }[] {
  const out: { role: "user" | "model"; parts: { text: string }[] }[] = [];
  for (const m of messages) {
    const text = (m.content ?? "").trim();
    if (!text) continue;
    const encoded = text.startsWith(`${GREENSTEP_ASSISTANT_PREFIX}\n`);
    const isEncodedAssistant = m.role === "assistant" || encoded;
    const body = encoded
      ? text.slice(GREENSTEP_ASSISTANT_PREFIX.length + 1)
      : text;
    if (!body.trim()) continue;
    out.push({
      role: isEncodedAssistant ? "model" : "user",
      parts: [{ text: body }],
    });
  }
  return out;
}
