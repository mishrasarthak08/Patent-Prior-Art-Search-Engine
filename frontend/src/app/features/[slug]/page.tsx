import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";

interface FeatureData {
  title: string;
  badge: string;
  headline: string;
  description: string;
  details: string[];
}

const FEATURES: Record<string, FeatureData> = {
  "claim-analysis": {
    title: "Claim Limitation Analysis",
    badge: "Atomic Tree Decomposition",
    headline: "Deconstruct Complex Patent Claims into Verifiable Limitation Trees",
    description: "Preserve exact legal scope by parsing independent and dependent claims into preamble, transitional phrases, and limitation clauses with character offsets.",
    details: [
      "Tracks verbatim starting and ending character offsets (start_char, end_char)",
      "Distinguishes open-ended ('comprising') from closed ('consisting of') transitional scope",
      "Deterministic heuristic regex parser ensures 100% fallback reliability under API rate limits",
      "Categorizes limitations into structural, functional, chemical, and numerical constraints"
    ]
  },
  "prior-art-search": {
    title: "Hybrid Prior-Art Search",
    badge: "Field-Weighted Multi-Channel IR",
    headline: "Combining Field-Weighted Lexical Matching with Dense Vector Search",
    description: "Search multi-domain patent corpora via BM25 evaluating Title (x3.0), Abstract (x2.0), Claims (x2.0), and Description (x1.0), fused with Qdrant vector retrieval.",
    details: [
      "Reciprocal Rank Fusion (RRF k=60) normalizes disparate scoring distributions",
      "Native push-down filtering for CPC classification prefixes, publication dates, and jurisdictions",
      "Patent family deduplication collapses related global filings into representative publications",
      "Full-disclosure 1,500-character context window expansion before Cohere v3 cross-encoder reranking"
    ]
  },
  "evidence-mapping": {
    title: "Evidence Claim Charts",
    badge: "Automated Substring Verification",
    headline: "Generate Verifiable Evidence Matrices Without Hallucinations",
    description: "Map each individual claim limitation to exact disclosure excerpts certified by automated substring verification against authoritative patent text.",
    details: [
      "Classifies support into DIRECTLY_SUPPORTED, PARTIALLY_SUPPORTED, RELATED, or NOT_FOUND",
      "Automated case-insensitive substring search confirms exact citation presence in full disclosure",
      "Certified green [VERIFIED] badges with passage location (e.g. Detailed Description [0035])",
      "Attorney review workflow allowing counsel to accept, reject, or modify limitation mappings"
    ]
  },
  "research-workspace": {
    title: "Research Workspaces & Matters",
    badge: "Relational Persistence & Audit",
    headline: "ACID-Compliant Legal Matter Management and Audit Trails",
    description: "Organize investigations into persistent matter containers with client references, search execution histories, attorney annotations, and compliance audit trails.",
    details: [
      "Relational schema backed by SQLAlchemy ORM with SQLite and PostgreSQL compatibility",
      "Track research history with exact parameters, latency metrics, and candidate snapshots",
      "Multi-section document reader with inline attorney clearance flags and notes",
      "Multi-format dossier export: print-ready HTML memoranda, Markdown, CSV, and JSON"
    ]
  }
};

export function generateStaticParams() {
  return Object.keys(FEATURES).map(slug => ({ slug }));
}

export default async function FeatureDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const feat = FEATURES[slug];
  if (!feat) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0F172A] flex flex-col font-sans">
      <MarketingHeader />
      <main className="flex-1 py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <span className="font-mono text-xs uppercase tracking-wider text-[#1E40AF] font-bold">{feat.badge}</span>
            <h1 className="font-serif text-3xl sm:text-5xl text-[#0F172A] font-normal leading-tight">{feat.headline}</h1>
            <p className="text-[#475569] text-sm sm:text-base leading-relaxed">{feat.description}</p>
          </div>

          <div className="surface-panel p-7 space-y-5 shadow-xs">
            <h3 className="text-xs font-mono font-bold text-[#0F172A] uppercase tracking-wider">Technical Specifications</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {feat.details.map((d, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                  <CheckCircle2 className="h-4 w-4 text-[#1E40AF] shrink-0 mt-0.5" />
                  <span className="text-xs text-[#0F172A] leading-relaxed">{d}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-[5px] bg-[#0F172A] px-6 py-3 text-xs font-semibold text-white shadow-xs hover:bg-[#1E40AF] transition"
            >
              Test {feat.title} in Search Engine <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
