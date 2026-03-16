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

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of hf.chatCompletionStream({
          model: MODEL,
          messages: messages,
          max_tokens: 1024,
          temperature: 0.7,
        })) {
          const token = chunk.choices[0]?.delta?.content ?? "";
          if (token) controller.enqueue(new TextEncoder().encode(token));
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