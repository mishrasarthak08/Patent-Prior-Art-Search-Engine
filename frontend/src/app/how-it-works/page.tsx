import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";

export default function HowItWorksPage() {
  const steps = [
    {
      step: "01",
      title: "Claim Submission & AST Decomposition",
      desc: "Submit an independent or dependent patent claim. The engine decomposes the text into preamble, transition, and discrete limitation clauses with exact character offsets."
    },
    {
      step: "02",
      title: "Parallel Hybrid Retrieval Fan-Out",
      desc: "Limitations generate targeted queries across both a field-weighted BM25 index (Title x3, Abstract x2, Claims x2) and dense Qdrant vector engine concurrently."
    },
    {
      step: "03",
      title: "Reciprocal Rank Fusion (RRF k=60)",
      desc: "Candidates from all retrieval channels are normalized and fused using RRF, applying CPC classification filtering and patent family deduplication."
    },
    {
      step: "04",
      title: "Full-Disclosure Cross-Encoder Context Reranking",
      desc: "Top candidates are expanded into 1,500-character disclosure windows and re-scored via Cohere Rerank v3 with graceful fallback to fused ranks."
    },
    {
      step: "05",
      title: "Automated Substring Quotation Verification",
      desc: "Evidence passages are mapped to individual limitations and checked verbatim against the authoritative patent text to certify [VERIFIED] support."
    },
    {
      step: "06",
      title: "Dossier Export & Relational Matter Persistence",
      desc: "The search execution, limitation charts, and attorney annotations are stored in an ACID relational database and exported to print-ready HTML, Markdown, CSV, or JSON."
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0F172A] flex flex-col font-sans">
      <MarketingHeader />
      <main className="flex-1 py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="font-mono text-xs uppercase tracking-wider text-[#1E40AF] font-bold">
              THE VERIFICATION PIPELINE
            </span>
            <h1 className="text-3xl sm:text-5xl text-[#0F172A] font-serif font-normal leading-tight">
              How the Prior-Art Search Engine Works
            </h1>
            <p className="text-sm sm:text-base text-[#475569] leading-relaxed">
              A 6-stage evidence pipeline engineered to transform raw claim language into defensible prior-art evidence.
            </p>
          </div>

          <div className="space-y-4">
            {steps.map((s) => (
              <div key={s.step} className="surface-panel p-6 flex flex-col sm:flex-row items-start gap-5 shadow-xs">
                <span className="font-mono text-lg font-bold text-[#1E40AF] bg-[#EFF6FF] px-3 py-1 rounded-[5px] shrink-0">
                  {s.step}
                </span>
                <div className="space-y-1.5">
                  <h3 className="text-base font-semibold text-[#0F172A]">{s.title}</h3>
                  <p className="text-xs text-[#64748B] leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-14 text-center">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-[5px] bg-[#0F172A] px-6 py-3 text-xs font-semibold text-white hover:bg-[#1E40AF] transition shadow-xs"
            >
              Launch Search Engine <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
