import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";

interface SolutionData {
  title: string;
  badge: string;
  headline: string;
  description: string;
  keyBenefits: string[];
  workflow: string;
}

const SOLUTIONS: Record<string, SolutionData> = {
  "patent-professionals": {
    title: "Patent Attorneys & Agents",
    badge: "Invalidity & Prosecution Practice",
    headline: "Build Defensible Prior-Art Arguments with Verifiable Limitation Charts",
    description: "Accelerate patent invalidity investigations, freedom-to-operate studies, and response drafting against USPTO/EPO office actions without generative hallucinations.",
    keyBenefits: [
      "Atomic limitation decomposition preserving exact claim scope and preamble",
      "Automated substring quotation verification against full patent text",
      "Print-ready legal research memoranda and evidence matrices",
      "Side-by-side prior-art candidate comparison tool"
    ],
    workflow: "Submit claim -> Inspect parsed limitation tree -> Run hybrid search with CPC & family filters -> Review certified evidence chart -> Export formatted memorandum."
  },
  "in-house-ip": {
    title: "Corporate In-House IP Teams",
    badge: "Enterprise IP Governance",
    headline: "Centralize Invention Clearance and Protect Confidential Work Product",
    description: "Provide your internal patent counsel and engineering leaders with a unified, auditable research workspace with Zero-Retention Confidential Mode.",
    keyBenefits: [
      "Strict Zero-Retention Confidential Mode protecting unfiled invention disclosures",
      "Multi-tenant matter organization with client matter numbers and tags",
      "Complete compliance audit logging of every query, view, and export",
      "Usage limits and seat governance across practice groups"
    ],
    workflow: "Create matter -> Invite internal researchers -> Screen invention disclosure -> Verify freedom-to-operate prior art -> Archive research audit trail."
  },
  "researchers": {
    title: "R&D & Innovation Departments",
    badge: "Technical Discovery",
    headline: "Pre-Filing Prior-Art Discovery Across High-Tech Literature Sectors",
    description: "Equip your research scientists and engineers to search multi-domain patent literature before committing external patent prosecution budget.",
    keyBenefits: [
      "Multi-domain indexing across Batteries (H01M), AI (G06N), Semiconductors (H01L), Comms (H04L), and MedTech (A61K)",
      "Freeform claim and technical abstract submission",
      "Full-disclosure 1,500-character context window expansion",
      "Direct patent explorer by keyword, assignee, and publication number"
    ],
    workflow: "Paste prototype abstract -> Decompose technical limitations -> Review candidate prior-art patents -> Bookmark key references -> Share with patent counsel."
  }
};

export function generateStaticParams() {
  return Object.keys(SOLUTIONS).map(slug => ({ slug }));
}

export default async function SolutionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const solution = SOLUTIONS[slug];
  if (!solution) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0F172A] flex flex-col font-sans">
      <MarketingHeader />
      <main className="flex-1 py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <span className="font-mono text-xs uppercase tracking-wider text-[#1E40AF] font-bold">{solution.badge}</span>
            <h1 className="font-serif text-3xl sm:text-5xl text-[#0F172A] font-normal leading-tight">{solution.headline}</h1>
            <p className="text-[#475569] text-sm sm:text-base leading-relaxed">{solution.description}</p>
          </div>

          <div className="surface-panel p-7 space-y-6 shadow-xs">
            <h3 className="text-xs font-mono font-bold text-[#0F172A] uppercase tracking-wider">Key Practice Capabilities</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {solution.keyBenefits.map((b, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                  <CheckCircle2 className="h-4 w-4 text-[#059669] shrink-0 mt-0.5" />
                  <span className="text-xs text-[#0F172A] leading-relaxed">{b}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[#E2E8F0]">
              <span className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider">Standard Investigation Workflow:</span>
              <p className="mt-2 text-xs font-mono text-[#1E40AF] bg-[#EFF6FF] p-3 rounded-[5px] border border-[#BFDBFE] leading-relaxed">
                {solution.workflow}
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-[5px] bg-[#0F172A] px-6 py-3 text-xs font-semibold text-white shadow-xs hover:bg-[#1E40AF] transition"
            >
              Start {solution.title} Investigation <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
