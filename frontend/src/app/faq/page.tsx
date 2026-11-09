import React from "react";
import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";

export default function FAQPage() {
  const faqs = [
    {
      q: "Does this engine provide formal legal patentability or invalidity opinions?",
      a: "No. The Patent Prior-Art Search Engine is strictly an evidence-first research and decision-support system. It identifies relevant literature, maps limitations, and verifies exact quotations to assist qualified practitioners. It does not replace the statutory legal judgment of a registered patent attorney or patent agent."
    },
    {
      q: "How does the system prevent hallucinations in evidence claim charts?",
      a: "We implement automated literal substring verification. When an excerpt is identified, the backend programmatically scans the authoritative patent text. If the excerpt cannot be located word-for-word, it is flagged as NOT_FOUND. Only literal matches receive the green [VERIFIED] certification stamp."
    },
    {
      q: "Is submitted claim text stored or used to train external AI models?",
      a: "No. When Zero-Retention Confidential Mode is enabled, claim texts, queries, and extracted limitation trees are processed entirely in ephemeral volatile memory. No user inputs are written to disk logs, and we never license, share, or use your queries for language model training."
    },
    {
      q: "What technical patent classes are currently indexed?",
      a: "The search engine currently indexes authentic multi-domain patent publications across five critical high-tech classes: Energy & Batteries (H01M), Artificial Intelligence & Neuromorphic Computing (G06N), Semiconductors (H01L), Telecommunications & Mesh Protocols (H04L), and Medical Therapeutics & Nanoparticles (A61K)."
    },
    {
      q: "Can I export formatted claim charts and research dossiers?",
      a: "Yes. The search engine supports one-click exports in print-ready HTML legal research memoranda, structured Markdown reports, CSV tables, and raw JSON schemas for integration into matter management software."
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0F172A] flex flex-col font-sans">
      <MarketingHeader />
      <main className="flex-1 py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="font-mono text-xs uppercase tracking-wider text-[#1E40AF] font-bold">
              KNOWLEDGEBASE & PRACTITIONER FAQ
            </span>
            <h1 className="text-3xl sm:text-5xl text-[#0F172A] font-serif font-normal leading-tight">
              Frequently Asked Questions
            </h1>
            <p className="text-sm sm:text-base text-[#475569] leading-relaxed">
              Common questions from patent attorneys, examiners, and corporate IP researchers about the platform technology and methodology.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="surface-panel p-6 space-y-2 shadow-xs">
                <h3 className="text-sm font-semibold text-[#0F172A] flex items-start gap-2">
                  <span className="text-[#1E40AF] font-mono text-xs mt-0.5">Q:</span>
                  <span>{faq.q}</span>
                </h3>
                <p className="text-xs text-[#64748B] pl-5 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
