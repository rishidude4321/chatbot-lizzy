import { createOpenAI } from "@ai-sdk/openai";
import { streamText, generateText } from "ai";
import { supabaseAdmin } from "@/lib/supabase";
import { getMatchingCaseStudy } from "@/lib/rag";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "Leaping Lizzy",
  },
});

// Helper function to extract structured fields from user message
async function extractProfilingDetails(userText: string) {
  try {
    const { text } = await generateText({
      model: openrouter.chat("openai/gpt-4o-mini"),
      prompt: `Extract structured lead details from this user text: "${userText}".
Return ONLY a valid raw JSON object with these exact keys (use null if not mentioned):
{
  "user_role": string or null,
  "district_type": string or null (Urban, Suburban, or Rural),
  "district_size": string or null,
  "budget_range": string or null
}
Do not include markdown code block formatting like \`\`\`json.`,
    });

    return JSON.parse(text.trim());
  } catch (err) {
    console.error("Extraction error:", err);
    return { user_role: null, district_type: null, district_size: null, budget_range: null };
  }
}

export async function POST(req: Request) {
  const { messages, sessionId } = await req.json();

  const userMessages = messages.filter((m: any) => m.role === "user");
  const lastUserMsg = userMessages[userMessages.length - 1]?.content || "";
  const userTurn = userMessages.length;

  let currentStage = "STAGE_2";
  let stagePrompt = "";

  if (userTurn === 1) {
    // 🌟 1. Dynamic RAG Search from case study JSON files
    const matchedCase = getMatchingCaseStudy(lastUserMsg);

    currentStage = "STAGE_2";
    stagePrompt = `You are Leaping Lizzy representing LEAP Innovations. 
The user was asked what "LEAP" they want to take and has shared their main challenge/topic: "${lastUserMsg}".

Use these EXACT evidence metrics from our matching LEAP knowledge base:
- Case Study Name: ${matchedCase.case_study_name}
- Context Setting: ${matchedCase.district_type}
- Diagnostic Tool Used: ${matchedCase.diagnostic_used}
- Specific Action Taken: ${matchedCase.action_taken}
- Verified Impact Metric: ${matchedCase.impact_metric}

Instructions:
1. Respond with: "Based on your focus on ${lastUserMsg}, LEAP has successfully partnered with districts in similar contexts. For example, in our work with ${matchedCase.case_study_name}, we used our ${matchedCase.diagnostic_used} to identify key growth areas. We moved them from a small-scale pilot to a district-wide acceleration by ${matchedCase.action_taken}, resulting in ${matchedCase.impact_metric}."
2. In the EXACT SAME response, ask the user:
   - What is their role?
   - What is their district/school setting (Rural, Suburban, or Urban)?
   - What is the size of their school or district?
   - What budget range are they considering for this work?`;

    if (sessionId) {
      await supabaseAdmin.from("conversation_leads").upsert(
        {
          session_id: sessionId,
          current_stage: currentStage,
          primary_topic: lastUserMsg,
          matched_case_study: matchedCase.case_study_name,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "session_id" }
      );
    }
  } else if (userTurn === 2) {
    // Stage 3: Parse profile details & generate proposal
    currentStage = "STAGE_3";
    stagePrompt = `You are Leaping Lizzy representing LEAP Innovations.
The user has provided their context details (role, setting, size, budget).

Instructions:
1. Briefly acknowledge their response with empathy.
2. Generate a proposal formatted with the tagline "Assess. Accelerate. Amplify". 
   Start with: "Here is a sample engagement pathway aligned with the LEAP Learning Framework:"
   - **ASSESS:** We begin with a 2-week diagnostic (Surveys + Empathy Interviews) to baseline your current student-centered ecosystem.
   - **ACCELERATE:** We transition to a custom engagement focusing on your specific goals through professional learning and infrastructure building.
   - **AMPLIFY:** We conclude with a Leadership Synthesis session to ensure adult systems are built to sustain impact long-term.
3. Conclude by asking if they would like to connect with someone at LEAP about their offerings.`;

    if (sessionId) {
      const extracted = await extractProfilingDetails(lastUserMsg);

      await supabaseAdmin.from("conversation_leads").upsert(
        {
          session_id: sessionId,
          current_stage: currentStage,
          user_role: extracted.user_role,
          district_type: extracted.district_type,
          district_size: extracted.district_size,
          budget_range: extracted.budget_range,
          additional_notes: lastUserMsg,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "session_id" }
      );
    }
  } else {
    // Stage 4: Outreach & Draft Email Template
    currentStage = "STAGE_4";
    stagePrompt = `You are Leaping Lizzy representing LEAP Innovations.
The user is ready for next steps or connection details.

Instructions:
1. Provide contact details: You can connect with Dr. Carlos Beato, Chief Transformation Officer at LEAP at carlos@leapinnovations.org.
2. Provide this exact draft email template for them to copy and paste:

"Hi Carlos, I engaged with Leaping Lizzy and am interested in knowing more about your offerings. I am particularly interested in knowing more about your work. Please let me know your availability."`;

    if (sessionId) {
      await supabaseAdmin.from("conversation_leads").upsert(
        {
          session_id: sessionId,
          current_stage: currentStage,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "session_id" }
      );
    }
  }

  const result = streamText({
    model: openrouter.chat("openai/gpt-4o-mini"),
    system: stagePrompt,
    messages,
  });

  return result.toTextStreamResponse();
}