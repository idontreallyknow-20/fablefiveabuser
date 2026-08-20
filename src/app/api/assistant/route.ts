import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const revalidate = 0;
export const maxDuration = 60;

// The assistant can hand back task proposals; the client renders them as
// one-tap add rows. Kept single-turn: a tool_use stop just means "here are
// proposals", no loop needed.
const PROPOSE_TASKS_TOOL: Anthropic.Tool = {
  name: "propose_tasks",
  description:
    "Propose concrete tasks for the user to add to their list. Use whenever the user asks to plan, break down, or schedule anything.",
  input_schema: {
    type: "object",
    properties: {
      tasks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            due_date: { type: "string", description: "YYYY-MM-DD, omit if none" },
            notes: { type: "string" },
          },
          required: ["title"],
        },
      },
    },
    required: ["tasks"],
  },
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AssistantContext {
  date?: string;
  tasks?: { title: string; due_date: string | null; done: boolean }[];
}

function systemPrompt(ctx: AssistantContext | undefined): string {
  const lines = [
    "You are the assistant inside Orbit, a personal dashboard and to-do app.",
    "Be brief. No filler, no preamble, no bullet-point essays — answer in as few words as the question allows.",
    "When the user wants to plan, break something down, or schedule work, call propose_tasks with concrete titles (and due dates in YYYY-MM-DD when implied). Keep any accompanying text to one short line.",
  ];
  if (ctx?.date) lines.push(`Today is ${ctx.date}.`);
  if (ctx?.tasks?.length) {
    const open = ctx.tasks.filter((t) => !t.done).slice(0, 40);
    lines.push(
      "Current open tasks:",
      ...open.map((t) => `- ${t.title}${t.due_date ? ` (due ${t.due_date})` : ""}`),
    );
  }
  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ configured: false });

  let body: { messages?: ChatMessage[]; context?: AssistantContext };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const messages = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });
  try {
    const res = await client.messages.create({
      model: process.env.AI_MODEL || "claude-opus-5",
      max_tokens: 1024,
      system: systemPrompt(body.context),
      tools: [PROPOSE_TASKS_TOOL],
      messages,
    });

    if (res.stop_reason === "refusal") {
      return NextResponse.json({ configured: true, text: "Can't help with that.", tasks: [] });
    }

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    const tasks: { title: string; due_date: string | null; notes: string | null }[] = [];
    for (const block of res.content) {
      if (block.type === "tool_use" && block.name === "propose_tasks") {
        const input = block.input as {
          tasks?: { title?: string; due_date?: string; notes?: string }[];
        };
        for (const t of input.tasks ?? []) {
          if (t.title) {
            tasks.push({
              title: t.title.slice(0, 200),
              due_date: /^\d{4}-\d{2}-\d{2}$/.test(t.due_date ?? "") ? t.due_date! : null,
              notes: t.notes?.slice(0, 500) ?? null,
            });
          }
        }
      }
    }

    return NextResponse.json({ configured: true, text, tasks });
  } catch (err) {
    console.error("assistant:", err);
    return NextResponse.json({ error: "Assistant unavailable" }, { status: 502 });
  }
}
