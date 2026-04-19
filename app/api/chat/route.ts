import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import {
  getBackboardClient,
  getOrCreateGreenStepAssistantId,
} from "@/lib/backboard-config";
import { mapGeminiApiError } from "@/lib/gemini-api-errors";
import {
  type CoachPayload,
  COACH_SYSTEM_PROMPT,
  GREENSTEP_ASSISTANT_PREFIX,
  parseCoachJson,
  threadMessagesToGeminiContents,
} from "@/lib/greenstep";

/** Default follows current Gemini API model list; override with GEMINI_MODEL in .env.local */
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
const MAX_MESSAGE_CHARS = 6000;

function getGeminiModelId(): string {
  return (
    process.env.GEMINI_MODEL?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_MODEL?.trim() ||
    DEFAULT_GEMINI_MODEL
  );
}

function getGeminiApiKey(): string {
  const key =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "Missing GOOGLE_GENERATIVE_AI_API_KEY (or GEMINI_API_KEY) environment variable.",
    );
  }
  return key;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      message?: string;
      threadId?: string;
    };
    const message = (body.message ?? "").trim();
    const threadId = (body.threadId ?? "").trim();

    if (!threadId) {
      return NextResponse.json({ error: "threadId is required." }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ error: "message is required." }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE_CHARS) {
      return NextResponse.json(
        { error: `message exceeds ${MAX_MESSAGE_CHARS} characters.` },
        { status: 400 },
      );
    }

    const bb = getBackboardClient();
    await getOrCreateGreenStepAssistantId(bb);

    const thread = await bb.getThread(threadId);
    const prior = threadMessagesToGeminiContents(
      (thread.messages ?? []).map((m: { role: string; content: string | null }) => ({
        role: m.role,
        content: m.content,
      })),
    );

    const contents = [
      ...prior,
      { role: "user" as const, parts: [{ text: message }] },
    ];

    const modelId = getGeminiModelId();
    const genAI = new GoogleGenerativeAI(getGeminiApiKey());
    const model = genAI.getGenerativeModel({
      model: modelId,
      systemInstruction: COACH_SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent({ contents });
    const rawText = result.response.text();
    const parsed = parseCoachJson(rawText);
    const coach: CoachPayload = {
      impact_score: parsed.impact_score,
      insight: parsed.insight,
      challenge: parsed.challenge,
      total_saved: parsed.total_saved,
    };
    const echoNote =
      parsed.echo_effect?.trim() ||
      "Echo estimate was not included in the model JSON.";
    const usage = result.response.usageMetadata;

    await bb.addMessage(threadId, {
      content: message,
      send_to_llm: "false",
      memory: "off",
    });

    await bb.addMessage(threadId, {
      content: `${GREENSTEP_ASSISTANT_PREFIX}\n${rawText.trim()}`,
      send_to_llm: "false",
      memory: "off",
    });

    return NextResponse.json({
      coach,
      echoNote,
      usage: usage
        ? {
            promptTokenCount: usage.promptTokenCount,
            candidatesTokenCount: usage.candidatesTokenCount,
            totalTokenCount: usage.totalTokenCount,
          }
        : null,
    });
  } catch (e) {
    const mapped = mapGeminiApiError(e);
    if (mapped) {
      const headers =
        mapped.retryAfterSeconds != null
          ? { "Retry-After": String(mapped.retryAfterSeconds) }
          : undefined;
      return NextResponse.json(
        {
          error: mapped.message,
          helpUrl: mapped.helpUrl,
          retryAfterSeconds: mapped.retryAfterSeconds,
        },
        { status: mapped.status, headers },
      );
    }
    const message = e instanceof Error ? e.message : "Chat request failed";
    const status = message.toLowerCase().includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
