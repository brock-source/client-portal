import Anthropic from "@anthropic-ai/sdk";
import { DriveDoc, getAskBrockContent } from "./googleDrive";

export interface AskBrockResult {
  answer: string;
  grounded: boolean;
  sources: Array<{ title: string; webViewLink: string | null }>;
}

const NO_CONTENT_ANSWER =
  "I don't have anything on that in my content yet. I'd normally offer to connect you with our team here, but that part of the portal is still being built — hang tight.";

let client: Anthropic | null = null;
function getClient() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("Ask Brock isn't set up yet — ANTHROPIC_API_KEY is missing.");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

const SYSTEM_PROMPT = `You are "Ask Brock" — a chat feature on StoneCentury Financial's client portal that answers questions in the voice of Brock, the firm's founder, using ONLY the source documents provided to you below. These are Brock's own articles, LinkedIn posts, and newsletters.

Rules:
- Answer in first person, as Brock, in a warm, direct, conversational tone — the way he writes in the sources.
- Ground your answer ONLY in the provided sources. Do not use outside knowledge about finance, insurance, or StoneCentury.
- If the sources don't contain enough to answer the question, you MUST set "grounded" to false and leave "answer" empty — do not guess or improvise an answer from general knowledge.
- Keep answers concise (2-4 short paragraphs max).
- Respond with ONLY a single JSON object, no other text, matching exactly this shape:
{"grounded": boolean, "answer": string, "sourceTitles": string[]}
"sourceTitles" should list the exact titles (from the "Title:" headers below) of the sources you actually drew from, or an empty array if grounded is false.`;

function buildSourcesBlock(docs: DriveDoc[]) {
  if (docs.length === 0) return "(No source documents are available right now.)";
  return docs.map((d) => `Title: ${d.title}\n---\n${d.content}`).join("\n\n====\n\n");
}

export async function askBrock(question: string): Promise<AskBrockResult> {
  const docs = await getAskBrockContent();

  if (docs.length === 0) {
    return { answer: NO_CONTENT_ANSWER, grounded: false, sources: [] };
  }

  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `SOURCES:\n\n${buildSourcesBlock(docs)}\n\nQUESTION: ${question}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "";

  let parsed: { grounded?: boolean; answer?: string; sourceTitles?: string[] };
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    parsed = { grounded: false, answer: "", sourceTitles: [] };
  }

  if (!parsed.grounded || !parsed.answer) {
    return { answer: NO_CONTENT_ANSWER, grounded: false, sources: [] };
  }

  const titleSet = new Set(parsed.sourceTitles ?? []);
  const sources = docs
    .filter((d) => titleSet.has(d.title))
    .map((d) => ({ title: d.title, webViewLink: d.webViewLink }));

  return { answer: parsed.answer, grounded: true, sources };
}
