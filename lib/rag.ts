import fs from "fs";
import path from "path";
import servicesData from "@/data/services.json";
import testimonialsData from "@/data/testimonials.json";

export interface CaseStudy {
  id: string;
  title: string;
  case_study_name: string;
  district_type: string;
  focus_area: string;
  timeframe: string;
  completion_date: string;
  scale_and_scope: string;
  target_grades: string;
  engagement_tier: string;
  diagnostic_used: string;
  action_taken: string;
  impact_metric: string;
  key_stakeholders: string[];
}

export function getMatchingCaseStudy(userTopic: string): CaseStudy {
  const dataDir = path.join(process.cwd(), "data");
  const files = [
    "case_study_ex1.json",
    "case_study_ex2.json",
    "case_study_ex3.json",
  ];

  // 1. Read all JSON files from /data/
  const caseStudies: CaseStudy[] = files.map((file) => {
    const filePath = path.join(dataDir, file);
    const fileData = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(fileData);
  });

  const lowerTopic = userTopic.toLowerCase();

  // 2. Keyword Matcher
  if (
    lowerTopic.includes("math") ||
    lowerTopic.includes("middle") ||
    lowerTopic.includes("algebra") ||
    lowerTopic.includes("stem")
  ) {
    return caseStudies[0]; // Urban Math Acceleration
  }

  if (
    lowerTopic.includes("mll") ||
    lowerTopic.includes("multilingual") ||
    lowerTopic.includes("language") ||
    lowerTopic.includes("special ed") ||
    lowerTopic.includes("suburban")
  ) {
    return caseStudies[1]; // Suburban MLL Initiative
  }

  if (
    lowerTopic.includes("competency") ||
    lowerTopic.includes("rural") ||
    lowerTopic.includes("grading") ||
    lowerTopic.includes("mastery") ||
    lowerTopic.includes("consortium")
  ) {
    return caseStudies[2]; // Rural Competency Expansion
  }

  // Fallback default
  return caseStudies[0];
}

// ==========================================
// NEW PDF HELPER FUNCTIONS
// ==========================================

// 1. Fetch exactly 4 services based on the pillar and inject the context safely
export function getServicesForPDF(pillar: string | null, customContext: string | null) {
  // Use the requested pillar, but fallback to "General" if it's missing or misspelled
// Tell TypeScript to treat the JSON as a dictionary safely
  const servicesDict: Record<string, any> = servicesData;
  
  // Check if the pillar exists in our dictionary, otherwise default to "General"
  const validPillar = pillar && servicesDict[pillar] ? pillar : "General";

  const rawServices = servicesDict[validPillar];
  
  // Safe fallback if the user gave us gibberish or null for context
  const safeContext = customContext || "learner-centered innovation";

  // Map over the 4 items and replace the placeholder string dynamically
  return rawServices.map((service: any) => ({
    ...service,
    deliverables: service.deliverables.replace("{custom_context}", safeContext)
  }));
}

// 2. Fetch 1 Stat and 1 Quote based on the pillar
export function getProofPoints(pillar: string | null) {
  const safePillar = pillar || "General";

  // Filter stats by checking if the array includes the pillar
  const stats = testimonialsData.statistics;
  let validStats = stats.filter((s: any) => s.pillars.includes(safePillar));
  if (validStats.length === 0) validStats = stats.filter((s: any) => s.pillars.includes("General"));
  const selectedStat = validStats[Math.floor(Math.random() * validStats.length)];

  // Filter quotes by checking if the array includes the pillar
  const quotes = testimonialsData.quotes;
  let validQuotes = quotes.filter((q: any) => q.pillars.includes(safePillar));
  if (validQuotes.length === 0) validQuotes = quotes.filter((q: any) => q.pillars.includes("General"));
  const selectedQuote = validQuotes[Math.floor(Math.random() * validQuotes.length)];

  return { 
    statistic: selectedStat, 
    quote: selectedQuote 
  };
}