import React from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { supabaseAdmin } from "@/lib/supabase";

function formatTitleCase(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// 1. React PDF Stylesheet
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
  },
  headerBanner: {
    backgroundColor: "#0F1D32",
    padding: 12,
    borderRadius: 4,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 10.5,
    color: "#00A3E0",
    marginTop: 3,
  },
  metaContainer: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    padding: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  metaBox: {
    flex: 1,
    paddingRight: 6,
  },
  metaBoxTopic: {
    flex: 2, // Gives Focus Topic 2x more width than other boxes
    paddingRight: 6,
  },
  metaLabel: {
    fontSize: 8.5,
    color: "#64748B",
    fontWeight: "bold",
  },
  metaValue: {
    fontSize: 10.5,
    color: "#0F1D32",
    marginTop: 2,
  },
  tagline: {
    textAlign: "center",
    backgroundColor: "#0F1D32",
    color: "#00A3E0",
    padding: 6,
    fontSize: 12.5,
    fontWeight: "bold",
    borderRadius: 4,
    marginBottom: 12,
  },
  cardAssess: {
    borderLeftWidth: 4,
    borderLeftColor: "#00A3E0",
    backgroundColor: "#F8FAFC",
    padding: 8,
    marginBottom: 8,
    borderRadius: 2,
  },
  cardAccelerate: {
    borderLeftWidth: 4,
    borderLeftColor: "#059669",
    backgroundColor: "#F8FAFC",
    padding: 8,
    marginBottom: 8,
    borderRadius: 2,
  },
  cardAmplify: {
    borderLeftWidth: 4,
    borderLeftColor: "#0F1D32",
    backgroundColor: "#F8FAFC",
    padding: 8,
    marginBottom: 8,
    borderRadius: 2,
  },
  cardTitle: {
    fontSize: 11.5,
    fontWeight: "bold",
    color: "#0F1D32",
    marginBottom: 3,
  },
  cardBody: {
    fontSize: 10,
    color: "#334155",
    lineHeight: 1.3,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: "bold",
    color: "#0F1D32",
    marginTop: 8,
    marginBottom: 6,
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 4,
    marginBottom: 12,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#0F1D32",
    padding: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    padding: 6,
    backgroundColor: "#FFFFFF",
  },
  tableRowAlt: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    padding: 6,
    backgroundColor: "#F8FAFC",
  },
  colPhase: {
    width: "22%",
    fontSize: 9.5,
    fontWeight: "bold",
    color: "#0F1D32",
  },
  colDeliverable: {
    width: "42%",
    fontSize: 9.5,
    color: "#334155",
  },
  colDuration: {
    width: "18%",
    fontSize: 9.5,
    color: "#334155",
  },
  colScope: {
    width: "18%",
    fontSize: 9.5,
    color: "#334155",
  },
  headerColText: {
    fontSize: 9.5,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  contactBox: {
    marginTop: 10,
    padding: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#00A3E0",
    borderRadius: 4,
  },
  contactTitle: {
    fontSize: 10.5,
    fontWeight: "bold",
    color: "#0F1D32",
  },
  contactText: {
    fontSize: 9.5,
    color: "#475569",
    marginTop: 2,
  },
});

// 2. Document Template Component
const ProposalDocument = ({ lead }: { lead: Record<string, any> }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* Header */}
      <View style={styles.headerBanner}>
        <Text style={styles.headerTitle}>LEAP Innovations — Engagement Proposal</Text>
        <Text style={styles.headerSubtitle}>Systemic Acceleration Pathway</Text>
      </View>

      {/* Meta Table */}
      <View style={styles.metaContainer}>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>ROLE</Text>
          <Text style={styles.metaValue}>
            {formatTitleCase(lead?.user_role) || "District Leader"}
          </Text>
        </View>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>SETTING / SIZE</Text>
          <Text style={styles.metaValue}>
            {formatTitleCase(lead?.district_type) || "Urban"} ({lead?.district_size || "1,000+"})
          </Text>
        </View>
        <View style={styles.metaBoxTopic}>
          <Text style={styles.metaLabel}>FOCUS TOPIC</Text>
          <Text style={styles.metaValue}>
            {formatTitleCase(lead?.primary_topic) || "Student-Centered Learning"}
          </Text>
        </View>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>BUDGET RANGE</Text>
          <Text style={styles.metaValue}>
            {lead?.budget_range || "Custom"}
          </Text>
        </View>
      </View>

      {/* Tagline */}
      <View style={styles.tagline}>
        <Text>ASSESS  •  ACCELERATE  •  AMPLIFY</Text>
      </View>

      {/* Pillars */}
      <View style={styles.cardAssess}>
        <Text style={styles.cardTitle}>ASSESS: Holistic Diagnostic & Baseline</Text>
        <Text style={styles.cardBody}>
          We begin with a 2-week diagnostic combining quantitative surveys and qualitative Student Empathy Interviews alongside our proprietary Leadership Lens tool to baseline your student-centered ecosystem.
        </Text>
      </View>

      <View style={styles.cardAccelerate}>
        <Text style={styles.cardTitle}>ACCELERATE: Targeted Infrastructure & Professional Learning</Text>
        <Text style={styles.cardBody}>
          We transition into custom professional learning and infrastructure building tailored specifically to {lead?.primary_topic || "your primary focus areas"} through job-embedded coaching and mastery pacing.
        </Text>
      </View>

      <View style={styles.cardAmplify}>
        <Text style={styles.cardTitle}>AMPLIFY: Leadership Synthesis & Scaling</Text>
        <Text style={styles.cardBody}>
          We conclude with a Leadership Synthesis session to ensure adult leadership systems and continuous monitoring frameworks are built to sustain and grow this impact long-term.
        </Text>
      </View>

      {/* Proposed Timeline & Structure Table */}
      <Text style={styles.sectionTitle}>Proposed Timeline & Structure</Text>
      <View style={styles.table}>
        {/* Table Header */}
        <View style={styles.tableHeaderRow}>
          <Text style={{ ...styles.colPhase, ...styles.headerColText }}>Phase</Text>
          <Text style={{ ...styles.colDeliverable, ...styles.headerColText }}>Focus Deliverable</Text>
          <Text style={{ ...styles.colDuration, ...styles.headerColText }}>Duration</Text>
          <Text style={{ ...styles.colScope, ...styles.headerColText }}>Scope</Text>
        </View>

        {/* Row 1 */}
        <View style={styles.tableRow}>
          <Text style={styles.colPhase}>1. Assess</Text>
          <Text style={styles.colDeliverable}>Holistic Diagnostic & Empathy Interviews</Text>
          <Text style={styles.colDuration}>Weeks 1–2</Text>
          <Text style={styles.colScope}>Full School Baseline</Text>
        </View>

        {/* Row 2 */}
        <View style={styles.tableRowAlt}>
          <Text style={styles.colPhase}>2. Accelerate</Text>
          <Text style={styles.colDeliverable}>Tier 2 Coaching & Infrastructure Build</Text>
          <Text style={styles.colDuration}>Weeks 3–10</Text>
          <Text style={styles.colScope}>Faculty & Classrooms</Text>
        </View>

        {/* Row 3 */}
        <View style={styles.tableRow}>
          <Text style={styles.colPhase}>3. Amplify</Text>
          <Text style={styles.colDeliverable}>Leadership Synthesis & Scaling Blueprint</Text>
          <Text style={styles.colDuration}>Weeks 11–12</Text>
          <Text style={styles.colScope}>Administrative Team</Text>
        </View>
      </View>

      {/* Contact Callout */}
      <View style={styles.contactBox}>
        <Text style={styles.contactTitle}>Next Steps & Connection</Text>
        <Text style={styles.contactText}>Dr. Carlos Beato — Chief Transformation Officer</Text>
        <Text style={styles.contactText}>Email: carlos@leapinnovations.org | www.leapinnovations.org</Text>
      </View>

    </Page>
  </Document>
);

// 3. GET API Handler
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return new NextResponse("Missing sessionId parameter", { status: 400 });
  }

  // Retrieve lead record from Supabase
  const { data: lead } = await supabaseAdmin
    .from("conversation_leads")
    .select("*")
    .eq("session_id", sessionId)
    .single();

  // Render PDF to a Node Buffer
  const pdfBuffer = await renderToBuffer(<ProposalDocument lead={lead || {}} />);

  return new NextResponse(pdfBuffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="LEAP_Proposal_${sessionId.slice(0, 8)}.pdf"`,
    },
  });
}