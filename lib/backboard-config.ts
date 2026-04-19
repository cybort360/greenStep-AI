import { BackboardClient } from "backboard-sdk";
import { COACH_SYSTEM_PROMPT } from "@/lib/greenstep";

let client: BackboardClient | null = null;

export function getBackboardClient(): BackboardClient {
  const apiKey = process.env.BACKBOARD_API_KEY;
  if (!apiKey) {
    throw new Error("Missing BACKBOARD_API_KEY environment variable.");
  }
  if (!client) {
    client = new BackboardClient({ apiKey });
  }
  return client;
}

const ASSISTANT_NAME = "GreenStep AI";

export async function getOrCreateGreenStepAssistantId(
  bb: BackboardClient,
): Promise<string> {
  const fromEnv = process.env.BACKBOARD_ASSISTANT_ID?.trim();
  if (fromEnv) return fromEnv;

  const assistants = await bb.listAssistants({ limit: 100 });
  const existing = assistants.find((a) => a.name === ASSISTANT_NAME);
  if (existing?.assistantId) return existing.assistantId;

  const created = await bb.createAssistant({
    name: ASSISTANT_NAME,
    system_prompt: COACH_SYSTEM_PROMPT,
    description: "Sustainability coach threads for GreenStep AI.",
  });
  return created.assistantId;
}
