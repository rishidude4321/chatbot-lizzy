import React from "react";
import { NextResponse } from "next/server";
import {
  renderToBuffer,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";
import { supabaseAdmin } from "@/lib/supabase";
import { getServicesForPDF, getProofPoints } from "@/lib/rag";
import path from "path";
import fs from "fs";
import sharp from "sharp";

// ----------------------------------------------------------------------
// Helper: Title Case
// ----------------------------------------------------------------------
function formatTitleCase(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// ----------------------------------------------------------------------
// React PDF Styles
// ----------------------------------------------------------------------
const styles = StyleSheet.create({
  page: {
    padding: 30,
    paddingTop: 10,
    paddingBottom: 0, // add explicit bottom padding
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
  },
  // HEADER
  logoContainer: {
    alignItems: "center",
    marginBottom: 16, // increased spacing under logo
  },
  logo: {
    width: 240, // 2x original (was 120, now 240)
    height: "auto",
  },
  preparedForContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  preparedForText: {
    fontSize: 10,
    fontWeight: "normal",
    color: "#000000", 
    hyphenation: false,
  },
  pipe: {
    color: "#00A3E0",
  },
  numberHighlight: {
    fontWeight: "bold",
    fontSize: 12, // slightly bigger than body text (10)
    color: "#00A3E0", // LEAP blue
  },
  italicText: {
    fontStyle: "italic",
  },
  verticalDivider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '30%',        // matches colActivity width
    width: 1,
    backgroundColor: '#000000',
  },
  sectionSubtitle: {
    fontSize: 10,
    color: "#F5B041", // yellow-orange
    fontStyle: "italic",
    marginLeft: 4,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 1,
    marginBottom: 4,
  },
  // SECTION TITLES – now in blue
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#00A3E0",
    marginTop: 8,
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 10,
    color: "#8E9092",
    lineHeight: 1.4,
    marginBottom: 4,
    hyphenation: false,
  },
  // Bullet list container (no bullet points, we use custom image)
  bulletList: {
    marginLeft: 0,
    marginBottom: 0,
  },
  bulletItem: {
    fontSize: 10,
    color: "#8E9092",
    lineHeight: 1.4,
    marginBottom: 2,
    flexShrink: 1, // allow text to wrap
    hyphenation: false,
  },
  // MAP container (no background)
  mapContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    marginBottom: 0,
    alignItems: "flex-start",
  },
  mapImage: {
    width: 200, // you said you set to 200
    height: "auto",
    marginLeft: 10,
    flexShrink: 0,
  },
  mapTextContainer: {
    flex: 1,
    paddingRight: 15,
  },
  // TABLE
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#000000",
    marginBottom: 8,
    position: 'relative',
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#00A3E0",
    padding: 6,
    borderBottomWidth: 0,
    borderBottomColor: "#000000",
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#000000",
    padding: 6,
    backgroundColor: "#FFFFFF",
  },
  colActivity: {
    width: "30%",
    fontSize: 9.5,
    fontWeight: "bold",
    color: "#0F1D32",
    //borderRightWidth: 1,
    //borderRightColor: "#000000",
    paddingRight: 6, // spacing
    hyphenation: false,
  },
  colDescription: {
    width: "70%",
    fontSize: 9.5,
    color: "#334155",
    paddingLeft: 6,  // add this for spacing
  },
  headerColText: {
    fontSize: 9.5,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  // CALLOUT BOX (testimonial) – yellow background
  calloutBox: {
    marginTop: 200,
    padding: 10,
    borderWidth: 1,
    borderColor: "#FFD700",
    borderRadius: 4,
    backgroundColor: "#FFF9E6",
  },
  calloutStat: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0F1D32",
  },
  calloutQuote: {
    fontSize: 10,
    color: "#334155",
    fontStyle: "italic",
    marginTop: 2,
  },
  principleLabel: {
    fontWeight: "bold",
    color: "#00A3E0", // LEAP blue
  },
  // DISCLAIMER – grey
  disclaimer: {
    fontSize: 8,
    color: "#64748B",
    fontStyle: "italic",
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 8,
  },
  spacer: {
    height: 2,
  },
});

// ----------------------------------------------------------------------
// Header Component (reused on every page)
// ----------------------------------------------------------------------
const Header = ({
  logoBase64,
  schoolName,
  monthYear,
}: {
  logoBase64: string;
  schoolName: string;
  monthYear: string;
}) => (
  <View>
    <View style={styles.logoContainer}>
      {logoBase64 ? (
        <Image src={logoBase64} style={styles.logo} />
      ) : (
        <Text style={{ fontSize: 14, color: "#0F1D32", fontWeight: "bold" }}>
          LEAP Innovations
        </Text>
      )}
    </View>
    <View style={styles.preparedForContainer}>
      <Text style={styles.preparedForText}>
        Partnership Proposal Development{" "}
        <Text style={styles.pipe}>|</Text>{" "}
        Prepared for {schoolName}{" "}
        <Text style={styles.pipe}>|</Text>{" "}
        {monthYear}
      </Text>
    </View>
  </View>
);

// ----------------------------------------------------------------------
// PDF Document Component
// ----------------------------------------------------------------------
const ProposalDocument = ({
  lead,
  logoBase64,
  services,
  proofPoint,
  mapBase64,
  bulletBase64,
  pillarSpecificBullet,   // <-- ADD THIS
}: {
  lead: Record<string, any>;
  logoBase64: string;
  services: Array<{ phase: string; activity: string; deliverables: string }>;
  proofPoint: { statistic: any; quote: any };
  mapBase64: string;
  bulletBase64: string;
  pillarSpecificBullet: string;   // <-- ADD THIS
}) => {
  const schoolName = lead?.school_or_district_name || "Your School/District";
  const now = new Date();
  const monthYear = now.toLocaleString("en-US", { month: "long", year: "numeric" });

  // Generate "Customized Scope" paragraph
  const scopeParagraph = `This engagement is designed as a capacity-building and co‑design experience for ${schoolName}'s leadership and implementation teams. Across ${now.getFullYear()}, LEAP will:`;
  // Hardcoded bullets for "Customized Scope of Services"
  const scopeBullets = [
    `Model the LEAP Pilot Network experience & build co-designed professional learning for ${schoolName} leaders`,
    pillarSpecificBullet,
    `Support intentional edtech implementation`,
    `Co-develop a ${schoolName} implementation playbook`,
    `Gain access to LEAP Tools for Transformation:`,
  ];

  const DeliverableText = ({ text }: { text: string }) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    return (
      <View>
        {lines.map((line, idx) => (
          <View key={idx} style={{ flexDirection: 'row', marginBottom: 2 }}>
            <Image
              src={bulletBase64}
              style={{ width: 10, height: 10, marginRight: 6, marginTop: 2, flexShrink: 0 }}
            />
            <Text style={[styles.bulletItem, { flex: 1, fontSize: 9 }]}>{line.trim()}</Text>
          </View>
        ))}
      </View>
    );
  };

  // ------------------------------------------------------------------
  // Helper: BulletPoint component using custom icon
  // ------------------------------------------------------------------
  const BulletPoint = ({ children }: { children: React.ReactNode }) => (
    <View style={{ flexDirection: "row", marginBottom: 1, marginLeft: 12 }}>
      {bulletBase64 ? (
        <Image
          src={bulletBase64}
          style={{ width: 10, height: 10, marginRight: 6, marginTop: 2, flexShrink: 0 }}
        />
      ) : (
        <Text style={{ color: "#00A3E0", marginRight: 6, fontSize: 10, flexShrink: 0 }}>•</Text>
      )}
      <Text style={[styles.bulletItem, { flex: 1 }]}>{children}</Text>
    </View>
  );

  return (
    <Document>
      {/* ============ PAGE 1 ============ */}
      <Page size="A4" style={styles.page}>
        <Header logoBase64={logoBase64} schoolName={schoolName} monthYear={monthYear} />

        {/* ABOUT LEAP INNOVATIONS */}
        <Text style={styles.sectionTitle}>ABOUT LEAP INNOVATIONS</Text>
        <Text style={styles.bodyText}>
          LEAP partners with district and school teams to solve high‑stakes teaching and learning challenges—like engagement, instructional coherence, and future‑ready skills. We connect research, innovation, and practice to redesign learning around students—then help individuals and teams implement what they design through high‑touch support. Our signature approach combines human‑centered design, cohort‑based professional learning, implementation coaching, and evidence tools that starts with local priorities and co‑design a structured pathway for each partner. Our work supports districts and schools in delivering personalized Next Gen learning models that are experienced by students and adults in coherent ways. When you engage with LEAP, you are engaged in entry points that help build clarity, confidence, and momentum that lasts beyond any single initiative. Since 2014, LEAP has:
        </Text>

        {/* Map + Stats side by side, map on right */}
        <View style={styles.mapContainer}>
          <View style={styles.mapTextContainer}>
            <View style={styles.bulletList}>
              <BulletPoint>Worked with more than 140 schools across Chicagoland and <Text style={styles.numberHighlight}>450</Text> districts nationwide</BulletPoint>
              <BulletPoint>Scaled the LEAP Frameworks and survey tools across <Text style={styles.numberHighlight}>24</Text> states</BulletPoint>
              <BulletPoint>Vetted <Text style={styles.numberHighlight}>200+</Text> edtech companies that have applied to pilot with LEAP partner schools</BulletPoint>
              <BulletPoint>Reached <Text style={styles.numberHighlight}>100,000</Text> students nationwide</BulletPoint>
            </View>
          </View>
          {mapBase64 && (
            <Image src={mapBase64} style={styles.mapImage} />
          )}
        </View>

        {/* THE LEAP APPROACH */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>THE LEAP APPROACH |</Text>
          <Text style={styles.sectionSubtitle}>Evidence‑based professional learning that:</Text>
        </View>
        <View style={styles.bulletList}>
          <BulletPoint>Leverages <Text style={styles.italicText}>adult expertise</Text> and voice</BulletPoint>
          <BulletPoint>Works with your organizational tools, context, culture, structures, priorities, curriculum and standards</BulletPoint>
          <BulletPoint>Balances <Text style={styles.italicText}>learning and pedagogy with application</Text></BulletPoint>
          <BulletPoint>Rooted in <Text style={styles.italicText}>research and evidence-base practices</Text> from LEAP Frameworks</BulletPoint>
          <BulletPoint>Leverages learning science and <Text style={styles.italicText}>design thinking</Text></BulletPoint>
        </View>

        <View style={styles.spacer} />

        {/* GROUNDING PRINCIPLES */}
        <Text style={styles.sectionTitle}>GROUNDING PRINCIPLES FOR OUR WORK</Text>
        <Text style={styles.bodyText}>
          At the heart of our approach is the belief that authentic educational transformation must be a continuous, cyclical journey centered entirely on the learner. We support partners in creating an ecosystem of growth—one that begins with assessing readiness and co‑designing a shared vision, then matures through the empowerment of change agents and the constant refinement of practice. We don't just implement change; we amplify and sustain it to ensure that every strategic shift is purposeful, collaborative, and, above all, driven by the needs of the students you serve. Every partnership looks different, because every community's goals, context, and starting point are different.
        </Text>
        <View style={styles.bulletList}>
          <BulletPoint><Text style={styles.principleLabel}>EVERY LEARNER CAN SUCCEED WITH SUPPORT THAT'S CUSTOMIZED TO THE CHILD'S INTERESTS AND NEEDS:</Text><Text style={styles.italicText}>When they are engaged in a more personalized manner, students will often master content well above curriculum standards or developmental guidelines. We can and should reframe how educators set and raise expectations for our students.</Text></BulletPoint>
          <BulletPoint><Text style={styles.principleLabel}>EVERY LEARNER BRINGS STRENGTHS AND TALENTS TO THE CLASSROOM:</Text><Text style={styles.italicText}> The diverse knowledge bases, life experiences, languages and cultures of children are powerful assets for their learning‑as well as the learning of those around them‑and need to be leveraged as such.</Text></BulletPoint>
          <BulletPoint><Text style={styles.principleLabel}>LEARNER AGENCY IS ESSENTIAL:</Text><Text style={styles.italicText}> Our world of work increasingly requires more leadership, agility and self‑direction. At an early age, we must inspire our students to assume responsibility of their own learning, and help co‑design.</Text></BulletPoint>
          <BulletPoint><Text style={styles.principleLabel}>A SENSE OF BELONGING IS CRITICAL TO LEARNING:</Text><Text style={styles.italicText}> Students are more engaged, motivated, and set for up social, emotional, and academic success when they feel seen, valued, heard, accepted, and part of a community.</Text></BulletPoint>
          <BulletPoint><Text style={styles.principleLabel}>EVIDENCE‑BASED TIER 1 INSTRUCTION AND RIGOR ARE FOUNDATIONAL FOR STUDENT‑CENTERED LEARNING:</Text><Text style={styles.italicText}> All learners deserve equitable access to high‑quality instruction in a supportive and challenging learning environment. Personalized learning practices support the pursuit of lifelong learning, progress toward mastery, and the development of a student's sense of self.</Text></BulletPoint>
        </View>
      </Page>

      {/* ============ PAGE 2 ============ */}
      <Page size="A4" style={styles.page}>
        <Header logoBase64={logoBase64} schoolName={schoolName} monthYear={monthYear} />

        {/* CUSTOMIZED SCOPE OF SERVICES */}
        <Text style={styles.sectionTitle}>CUSTOMIZED SCOPE OF SERVICES</Text>
        <Text style={styles.bodyText}>{scopeParagraph}</Text>
        <View style={styles.bulletList}>
          {scopeBullets.map((text, idx) => (
            <BulletPoint key={idx}>{text}</BulletPoint>
          ))}
        </View>
        <Text style={styles.bodyText}>Gain access to LEAP Tools for Transformation:</Text>
        <BulletPoint>LEAP Frameworks, Tools, Events and Content</BulletPoint>

        <View style={styles.spacer} />

        {/* Engagement Activity Table */}
        <View style={styles.table}>
          {/* The continuous vertical line */}
          <View style={styles.verticalDivider} />

          {/* Header Row */}
          <View style={styles.tableHeaderRow}>
            <Text style={{ ...styles.colActivity, ...styles.headerColText }}>Engagement Activity</Text>
            <View style={{ width: "70%", paddingLeft: 6 }}>
              <Text style={{ ...styles.headerColText, fontSize: 9.5 }}>Description and Key Deliverables</Text>
            </View>
          </View>

          {/* Data Rows */}
          {services.map((svc, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.colActivity}>{svc.activity}</Text>
              <View style={{ width: "70%", paddingLeft: 6 }}>
                <DeliverableText text={svc.deliverables} />
              </View>
            </View>
          ))}
        </View>

        {/* Testimonial Callout (yellow) */}
        {proofPoint.statistic && (
          <View style={styles.calloutBox}>
            <Text style={styles.calloutStat}>LEAP Leadership Impact</Text>
            <Text style={styles.calloutQuote}>“{proofPoint.statistic.quote}”</Text>
            {proofPoint.quote && (
              <Text style={[styles.calloutQuote, { marginTop: 4, fontWeight: 'bold' }]}>
                – {proofPoint.quote.quote}
              </Text>
            )}
          </View>
        )}

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          This is an AI generated proposal that does not fully reflect the customization LEAP builds into programming with schools and districts. It is based on the most common starting point for similar districts/schools engaging in similar topics. Delivery and format were also intentionally omitted from this draft proposal so that you can connect with one of our team members to further discuss customization for your district/school.
        </Text>
      </Page>
    </Document>
  );
};

// ----------------------------------------------------------------------
// GET API Handler
// ----------------------------------------------------------------------
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return new NextResponse("Missing sessionId parameter", { status: 400 });
  }

  // 1. Fetch lead data
  const { data: lead } = await supabaseAdmin
    .from("conversation_leads")
    .select("*")
    .eq("session_id", sessionId)
    .single();

  // 2. Register Open Sans font (optional) – we use Helvetica, so skip.

  // 3. Load logo, map, and bullet images
  let logoBase64 = "";
  try {
    const logoPath = path.join(process.cwd(), "public", "LEAP_Logo.webp");
    const imageBuffer = fs.readFileSync(logoPath);
    const pngBuffer = await sharp(imageBuffer).png().toBuffer();
    logoBase64 = `data:image/png;base64,${pngBuffer.toString("base64")}`;
  } catch (error) {
    console.error("Failed to load/convert logo:", error);
  }

  let mapBase64 = "";
  try {
    const mapPath = path.join(process.cwd(), "public", "photo_for_pdf.png");
    const mapBuffer = fs.readFileSync(mapPath);
    mapBase64 = `data:image/png;base64,${mapBuffer.toString("base64")}`;
  } catch (error) {
    console.error("Failed to load map image:", error);
  }

  let bulletBase64 = ""; // <-- NEW
  try {
    const bulletPath = path.join(process.cwd(), "public", "bullet_point.png");
    const bulletBuffer = fs.readFileSync(bulletPath);
    bulletBase64 = `data:image/png;base64,${bulletBuffer.toString("base64")}`;
  } catch (error) {
    console.error("Failed to load bullet image:", error);
  }

  // 4. Get dynamic data
  const pillar = lead?.primary_topic || "General";

  const getPillarSpecificBullet = (pillar: string) => {
    switch (pillar) {
      case "Human-Centered AI":
        return "Build AI literacy and human‑centered design through EdTech planning, coaching, and facilitation";
      case "Personalized Learning":
        return "Build personalized learning capacity through EdTech planning, coaching, and facilitation";
      case "Capacity Building":
        return "Build leadership and instructional capacity through EdTech planning, coaching, and facilitation";
      case "Engagement & Belonging":
        return "Build engagement and belonging through EdTech planning, coaching, and facilitation";
      default:
        return "Build capacity through human‑centered design and EdTech planning, coaching, and facilitation";
    }
  };

  const pillarSpecificBullet = getPillarSpecificBullet(pillar);
  const customContext = lead?.custom_context || "learner-centered innovation";
  const services = getServicesForPDF(pillar, customContext, lead?.school_or_district_name);
  const proofPoint = getProofPoints(pillar);

  // 5. Render PDF
  const pdfBuffer = await renderToBuffer(
    <ProposalDocument
      lead={lead || {}}
      logoBase64={logoBase64}
      services={services}
      proofPoint={proofPoint}
      mapBase64={mapBase64}
      bulletBase64={bulletBase64} // <-- pass it
      pillarSpecificBullet={pillarSpecificBullet}   // <-- ADD THIS
    />
  );

  // 6. Return PDF
  return new NextResponse(pdfBuffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="LEAP_Proposal_${sessionId.slice(0, 8)}.pdf"`,
    },
  });
}