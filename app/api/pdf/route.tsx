import { NextResponse } from "next/server";
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { supabaseAdmin } from "@/lib/supabase";

// 1. Fully typed React PDF Stylesheet
const styles = StyleSheet.create({
  page: {
    padding: 35,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
  },
  headerBanner: {
    backgroundColor: "#0F1D32",
    padding: 15,
    borderRadius: 4,
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 10,
    color: "#00A3E0",
    marginTop: 4,
  },
  metaContainer: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 4,
    marginBottom: 15,
  },
  metaBox: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 8,
    color: "#64748B",
    fontWeight: "bold",
  },
  metaValue: {
    fontSize: 10,
    color: "#0F1D32",
    marginTop: 2,
  },
  tagline: {
    textAlign: "center",
    backgroundColor: "#0F1D32",
    color: "#00A3E0",
    padding: 8,
    fontSize: 12,
    fontWeight: "bold",
    borderRadius: 4,
    marginBottom: 15,
  },
  cardAssess: {
    borderLeftWidth: 4,
    borderLeftColor: "#00A3E0",
    backgroundColor: "#F8FAFC",
    padding: 10,
    marginBottom: 10,
    borderRadius: 2,
  },
  cardAccelerate: {
    borderLeftWidth: 4,
    borderLeftColor: "#059669",
    backgroundColor: "#F8FAFC",
    padding: 10,
    marginBottom: 10,
    borderRadius: 2,
  },
  cardAmplify: {
    borderLeftWidth: 4,
    borderLeftColor: "#0F1D32",
    backgroundColor: "#F8FAFC",
    padding: 10,
    marginBottom: 10,
    borderRadius: 2,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0F1D32",
    marginBottom: 4,
  },
  cardBody: {
    fontSize: 9,
    color: "#334155",
    lineHeight: 1.4,
  },
  contactBox: {
    marginTop: 15,
    padding: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#00A3E0",
    borderRadius: 4,
  },
  contactTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#0F1D32",
  },
  contactText: {
    fontSize: 9,
    color: "#475569",
    marginTop: 2,
  },
});

// 2. Document Template
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
          <Text style={styles.metaValue}>{lead?.user_role || "District Leader"}</Text>
        </View>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>SETTING / SIZE</Text>
          <Text style={styles.metaValue}>
            {lead?.district_type || "Urban"} ({lead?.district_size || "1,000+"})
          </Text>
        </View>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>FOCUS TOPIC</Text>
          <Text style={styles.metaValue}>{lead?.primary_topic || "Student-Centered Learning"}</Text>
        </View>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>BUDGET RANGE</Text>
          <Text style={styles.metaValue}>{lead?.budget_range || "Custom"}</Text>
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

      {/* Contact Callout */}
      <View style={styles.contactBox}>
        <Text style={styles.contactTitle}>Next Steps & Connection</Text>
        <Text style={styles.contactText}>Dr. Carlos Beato — Chief Transformation Officer</Text>
        <Text style={styles.contactText}>Email: carlos@leapinnovations.org | www.leapinnovations.org</Text>
      </View>

    </Page>
  </Document>
);

// 3. API Handler
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