import fs from "fs";
import path from "path";

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