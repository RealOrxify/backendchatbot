import { HfInference } from "@huggingface/inference";
import { NextRequest } from "next/server";

export const runtime = "edge";

const MODEL = "mistralai/Mistral-7B-Instruct-v0.3";

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  if (!process.env.HUGGINGFACE_API_TOKEN) {
    return new Response("Missing HUGGINGFACE_API_TOKEN env variable.", { status: 500 });
  }

  const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);

  const prompt = messages
    .map((m: { role: string; content: string }) =>
      m.role === "user"
        ? `[INST] ${m.content} [/INST]`
        : m.content
    )
    .join("\n");

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of hf.textGenerationStream({
          model: MODEL,
          inputs: prompt,
          parameters: {
            max_new_tokens: 1024,
            temperature: 0.7,
            repetition_penalty: 1.1,
            return_full_text: false,
          },
        })) {
          controller.enqueue(new TextEncoder().encode(chunk.token.text));
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}