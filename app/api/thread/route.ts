import { NextResponse } from "next/server";
import {
  getBackboardClient,
  getOrCreateGreenStepAssistantId,
} from "@/lib/backboard-config";

export async function POST() {
  try {
    const bb = getBackboardClient();
    const assistantId = await getOrCreateGreenStepAssistantId(bb);
    const thread = await bb.createThread(assistantId);
    return NextResponse.json({ threadId: thread.threadId as string });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Thread creation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
