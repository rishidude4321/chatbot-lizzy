import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "Leaping Lizzy",
  },
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    // .chat() forces OpenRouter to use /v1/chat/completions instead of /v1/responses
    model: openrouter.chat("openai/gpt-4o-mini"),
    system: `You are the LEAP Navigator, an expert consultant specializing in LEAP Innovations suite of offerings. Your goal is to guide school, district, and community leaders from "pilot curiosity" to "systemic acceleration.". 
    Your role is to help anyone looking for services around personalized student-centered learning with LEAP to understand how LEAP might support them. 
    You are talking to school and district leaders and community partners.
    Success looks like someone leaving with specific pathways for engaging with LEAP.

Core Guardrails:
1. Maintain a professional, supportive, and consultative tone suited for school district leaders.
2. Emphasize LEAP Innovations' core diagnostic approaches (Holistic Diagnostic, Student Empathy Interviews, Leadership Lens).
3. Be concise and conversational.`,
    messages,
  });

  return result.toTextStreamResponse();
}