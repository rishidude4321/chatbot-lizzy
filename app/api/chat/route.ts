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
// Helper to fuzzy-match strings (e.g., "Engagement and Belonging" === "engagement & belonging")
function normalizeText(text: string | null) {
  if (!text) return "";
  return text.toLowerCase().replace(/\band\b/g, "&").replace(/[^a-z0-9&]/g, "");
}
// Helper function to extract structured fields from user message
async function extractProfilingDetails(userText: string) {
  try {
    const { text } = await generateText({
      model: openrouter.chat("openai/gpt-4o-mini"),
      prompt: `Extract structured lead details from this user text: "${userText}".
Return ONLY a valid raw JSON object with these exact keys (use null if not mentioned):
{
  "pillar": string or null (Must be EXACTLY one of: "Engagement & Belonging", "Personalized Learning", "Human-Centered AI", "Capacity Building", or "General"),
  "custom_context": string or null (A short 3-7 word summary of their specific challenge/goal. e.g., "finding personalized learning for middle schoolers" or "teachers using ChatGPT without guidelines") Also, Extract ONLY their specific educational challenge. STRICT RULE: If the text is gibberish, random keystrokes, or just repeats the pillar name without a coherent goal, you MUST return null. Do not include the pillar name.,
  "school_or_district_name": string or null (The name of the institution. If the user provides a single word in a list like 'Curtis' or 'Lincoln', assume it is the school name and append ' School' to it, e.g., 'Curtis School'),
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
    return { pillar: null, custom_context: null, school_or_district_name: null, user_role: null, district_type: null, district_size: null, budget_range: null };
  }
}

const CORE_GUARDRAILS = `
Core Principles & Guardrails:
- Empathy First: Acknowledge the unique challenges of the user (e.g., AI integration, MLL support, or Special Education).
- Data-Driven: Always reference the uploaded LEAP Case Studies and Framework data to provide evidence-based suggestions.
- The "Mirror" Principle: Remind leaders that adult learning must reflect the student-centered environment they want to build.
`;

export async function POST(req: Request) {
  const { messages, sessionId } = await req.json();
  
  // Create a mutable copy of the messages we send to the LLM
  let apiMessages = messages;

  const userMessages = messages.filter((m: any) => m.role === "user");
  const lastUserMsg = userMessages[userMessages.length - 1]?.content || "";

  // 🚨 SINGLE SOURCE OF TRUTH: Fetch the user's actual stage from Supabase
  const { data: lead } = await supabaseAdmin
    .from("conversation_leads")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  // If no record exists, they are in STAGE_1. Otherwise, trust the database.
  let currentStage = lead ? lead.current_stage : "STAGE_1";
  let stagePrompt = "";

  if (currentStage === "STAGE_1") {
    // 🌟 1. Extract Pillar & Custom Context from their first message
    const extracted = await extractProfilingDetails(lastUserMsg);
    const pillarName = extracted.pillar || "General";
    
    // The raw extracted context (will be null if gibberish)
    const actualContext = extracted.custom_context; 
    
    // The fallback used ONLY for RAG and chat flow so the bot doesn't crash
    const chatFallbackContext = actualContext || "learner-centered innovation";

    // Run RAG based on their specific context or fallback
    const matchedCase = getMatchingCaseStudy(chatFallbackContext);

    currentStage = "STAGE_2";

    // 🚨 NUCLEAR OPTION FOR STAGE 1: Sterilize the input history
    apiMessages = [
      {
        role: "user",
        content: `I am interested in the "${pillarName}" pillar. My raw input was: "${lastUserMsg}".`
      }
    ];

    stagePrompt = `You are Leaping Lizzy representing LEAP Innovations. 

We matched the user's need to this EXACT LEAP case study:
- Case Study Name: ${matchedCase.case_study_name}
- Action Taken: ${matchedCase.action_taken}
- Verified Impact: ${matchedCase.impact_metric}

CRITICAL INSTRUCTIONS:
1. Write a warm, natural response acknowledging their interest in the ${pillarName} pillar. 
2. DO NOT use robotic templates like "Based on your focus on X within Y...". Speak naturally.
3. If their raw input contained a clear goal, mention how LEAP helps with that. If their input was gibberish, vague, or a typo, ignore the input entirely and just talk generally about the value of ${pillarName}.
4. Seamlessly share the case study data as proof of LEAP's success. Ensure you mention ${matchedCase.case_study_name}, the specific action taken, and the verified impact.
5. In the exact same message, clearly ask them to provide these demographic details so you can customize a proposal:
   - The name of their school or district
   - Their role
   - District/school setting (Rural, Suburban, or Urban)
   - Size of their school or district
   - Budget range considered for this work`;

    if (sessionId) {
      await supabaseAdmin.from("conversation_leads").upsert(
        {
          session_id: sessionId,
          current_stage: currentStage,
          primary_topic: lastUserMsg,
          pillar: pillarName,
          custom_context: actualContext,
          school_or_district_name: extracted.school_or_district_name,
          matched_case_study: matchedCase.case_study_name,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "session_id" }
      );
    }
} else if (currentStage === "STAGE_2") {
    // 🌟 2. Slot Filling: Merge new data with DB data
    const extracted = await extractProfilingDetails(lastUserMsg);

    // Merge everything
    const mergedName = extracted.school_or_district_name || lead.school_or_district_name;
    const mergedRole = extracted.user_role || lead.user_role;
    const mergedType = extracted.district_type || lead.district_type;
    const mergedSize = extracted.district_size || lead.district_size;
    const mergedBudget = extracted.budget_range || lead.budget_range;
    
    // Merge pillar and context so we can compare them
    const mergedPillar = extracted.pillar || lead.pillar;
    const mergedContext = extracted.custom_context || lead.custom_context;

    // Check if any fields are still missing
    const missingFields = [];
    if (!mergedName) missingFields.push("the name of your school or district");
    if (!mergedRole) missingFields.push("your role");
    if (!mergedType) missingFields.push("your district setting (Urban, Suburban, or Rural)");
    if (!mergedSize) missingFields.push("the size of your district or school");
    if (!mergedBudget) missingFields.push("your estimated budget range");

    // YOUR LOGIC: Check if the context is missing, or if it's identical to the pillar
    const isContextEmptyOrGeneric = 
      !mergedContext || 
      (normalizeText(mergedContext) === normalizeText(mergedPillar));

    if (isContextEmptyOrGeneric) {
      missingFields.push("a brief summary of the specific goals or challenges you are facing regarding this topic");
    }

    if (missingFields.length > 0) {
      // ❌ Missing fields: Stay in STAGE_2

      // 🚨 NUCLEAR OPTION FOR STAGE_2: Sterilize the input history
      apiMessages = [
        {
          role: "user",
          content: `Data extracted so far: School/District: ${mergedName || "Not provided"}, Role: ${mergedRole || "Not provided"}, Setting: ${mergedType || "Not provided"}, Size: ${mergedSize || "Not provided"}, Budget: ${mergedBudget || "Not provided"}. We are still missing: ${missingFields.join(", ")}.`
        }
      ];

      stagePrompt = `You are Leaping Lizzy representing LEAP Innovations.
The user is building their profile, but some details are missing.

STRICT RULES:
1. DO NOT use any human first names. Treat any provided names as the name of the school or district institution.
2. Warmly acknowledge the specific institutional details provided so far (e.g., "It's great to learn about your urban school...").
3. Conversationally ask them to provide ONLY the missing details: ${missingFields.join(", ")}.
4. DO NOT offer a PDF proposal yet.`;

      if (sessionId) {
        await supabaseAdmin.from("conversation_leads").update({
          school_or_district_name: mergedName,
          user_role: mergedRole,
          district_type: mergedType,
          district_size: mergedSize,
          budget_range: mergedBudget,
          custom_context: isContextEmptyOrGeneric ? lead.custom_context : mergedContext,
          updated_at: new Date().toISOString(),
        }).eq("session_id", sessionId);
      }
    } else {
      // ✅ All fields gathered: Move to STAGE_3
      currentStage = "STAGE_3";
      stagePrompt = `You are Leaping Lizzy representing LEAP Innovations.

We have successfully extracted the user's profile:
- School/District Name: ${mergedName}
- Role: ${mergedRole}
- Setting: ${mergedType}
- Size: ${mergedSize}
- Budget: ${mergedBudget}

STRICT RULES:
1. The user has NOT provided their personal name. DO NOT address them by a first name (e.g., absolutely do NOT say "Thank you, [Name]").

CRITICAL INSTRUCTION - YOU MUST FOLLOW THIS EXACTLY:
1. Warmly acknowledge their school/district by name (e.g., "It's great to learn about the work happening at ${mergedName}"). 
2. DO NOT treat the school name as the user's personal first name.
3. YOU MUST state exactly: "To support your vision, here is a sample engagement pathway aligned with the LEAP Learning Framework:"
4. YOU MUST output this exact markdown link on its own line:
   [📄 View Your Custom Proposal PDF](/api/pdf?sessionId=${sessionId})
5. Ask if they would like to connect with someone at LEAP about their offerings.
DO NOT ADD ANY OTHER FLUFF OR QUESTIONS.`;

      if (sessionId) {
        await supabaseAdmin.from("conversation_leads").update({
          current_stage: currentStage,
          school_or_district_name: mergedName,
          user_role: mergedRole,
          district_type: mergedType,
          district_size: mergedSize,
          budget_range: mergedBudget,
          updated_at: new Date().toISOString(),
        }).eq("session_id", sessionId);
      }
    }
  } else if (currentStage === "STAGE_3" || currentStage === "STAGE_4") {
    // 🌟 3. Stage 4: Outreach & Draft Email Template
    currentStage = "STAGE_4";
    stagePrompt = `You are Leaping Lizzy representing LEAP Innovations.
The user is ready for next steps or connection details.

Instructions:
1. Provide contact details: You can connect with Dr. Carlos Beato, Chief Transformation Officer at LEAP at carlos@leapinnovations.org.
2. Provide this exact draft email template for them to copy and paste:

"Hi Carlos, I engaged with Leaping Lizzy and am interested in knowing more about your offerings. I am particularly interested in knowing more about your work with ${lead?.custom_context || 'personalized learning'}. Please let me know your availability."`;

    if (sessionId) {
      await supabaseAdmin.from("conversation_leads").update({
        current_stage: currentStage,
        updated_at: new Date().toISOString(),
      }).eq("session_id", sessionId);
    }
  }

  const result = streamText({
    model: openrouter.chat("openai/gpt-4o-mini"),
    system: `${CORE_GUARDRAILS}\n\n${stagePrompt}`,
    temperature: 0.2,
    messages,
  });

  return result.toTextStreamResponse();
}