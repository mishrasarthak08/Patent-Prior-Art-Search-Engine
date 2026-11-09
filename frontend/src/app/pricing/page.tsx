import React from "react";
import Link from "next/link";
import { Check, ArrowRight, ShieldCheck, Scale, Users, Sparkles } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";

export default function PricingPage() {
  const pilotPrograms = [
    {
      name: "Practitioner Pilot",
      tier: "Individual Access",
      desc: "For registered patent attorneys, patent agents, and independent technical researchers evaluating prior-art discovery workflows.",
      features: [
        "Full claim limitation decomposition",
        "Hybrid lexical (BM25) and semantic dense vector retrieval",
        "Verbatim quotation verification against indexed source text",
        "Personal research workspace with PostgreSQL Row-Level Security",
        "Local in-process execution with zero external claim transmission",
        "Exportable research dossiers (PDF, Markdown, JSON)",
        "Direct access to engineering team for feedback and feature requests",
      ],
      cta: "Apply for Practitioner Pilot",
      href: "/contact?program=practitioner",
      featured: false,
    },
    {
      name: "Firm & Practice Group Pilot",
      tier: "Multi-User Practice",
      desc: "For patent prosecution boutiques, litigation teams, and corporate IP departments requiring collaborative matter workflows.",
      features: [
        "Up to 5 practitioner seats with role-based access control",
        "Organization shared practice workspace with matter docketing",
        "Matter-level ethical walls and confidential access restrictions",
        "Interactive limitation-by-limitation claim charts and coverage heatmaps",
        "Side-by-side patent document comparison studio",
        "Attorney annotation and verification sign-off workflows",
        "Workspace audit ledger tracking searches, views, and exports",
        "Priority support and weekly product alignment sessions",
      ],
      cta: "Apply for Firm Pilot",
      href: "/contact?program=firm",
      featured: true,
    },
    {
      name: "Enterprise Evaluation",
      tier: "Institutional Access",
      desc: "For multinational corporate IP departments, research institutions, and large-scale patent intelligence operations.",
      features: [
        "Custom corpus ingestion under authorized licensing agreements",
        "Single Sign-On (SSO / SAML 2.0) integration",
        "Isolated database namespace or private VPC deployment options",
        "Custom benchmark dataset evaluation and retrieval ablation",
        "Dedicated account manager and technical lead",
        "Formal Service Level Agreement (SLA) commitments",
        "Custom data export and docketing integration support",
      ],
      cta: "Request Enterprise Consultation",
      href: "/contact?program=enterprise",
      featured: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0F172A] flex flex-col font-sans">
      <MarketingHeader />
      <main className="flex-1 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="font-mono text-xs uppercase tracking-wider text-[#1E40AF] font-bold">
              CONTROLLED PILOT & PARTNERSHIP
            </span>
            <h1 className="text-3xl sm:text-5xl text-[#0F172A] font-serif font-normal leading-tight">
              Validated prior-art intelligence for patent professionals.
            </h1>
            <p className="text-sm sm:text-base text-[#475569] leading-relaxed">
              We are currently enrolling select patent practitioners and IP practice groups into our structured pilot evaluation program.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch mb-14">
            {pilotPrograms.map((t) => (
              <div
                key={t.name}
                className={`rounded-[6px] border flex flex-col justify-between p-7 transition shadow-xs ${
                  t.featured
                    ? "border-[#1E40AF] bg-white ring-1 ring-[#1E40AF]"
                    : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1]"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                        {t.name}
                      </span>
                      <span className="text-[11px] font-mono text-[#64748B]">
                        {t.tier}
                      </span>
                    </div>
                    {t.featured && (
                      <span className="badge-verified text-[10px] font-bold">
                        RECOMMENDED
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#475569] leading-relaxed">
                    {t.desc}
                  </p>

                  <div className="pt-2 border-t border-[#F1F5F9] space-y-2.5">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] block">
                      Pilot Program Includes:
                    </span>
                    {t.features.map((feat) => (
                      <div key={feat} className="flex items-start gap-2.5 text-xs text-[#334155]">
                        <Check className="h-3.5 w-3.5 text-[#1E40AF] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-[#F1F5F9]">
                  <Link
                    href={t.href}
                    className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-[5px] text-xs font-semibold transition ${
                      t.featured
                        ? "bg-[#0F172A] text-white hover:bg-[#1E40AF]"
                        : "border border-[#0F172A] text-[#0F172A] hover:bg-[#0F172A] hover:text-white"
                    }`}
                  >
                    {t.cta} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Transparent Commercial Policy Disclosure */}
          <div className="surface-panel p-8 max-w-4xl mx-auto space-y-4 border border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-[#1E40AF]" />
              <h2 className="text-sm font-bold text-[#0F172A] uppercase font-mono tracking-wider">
                Commercial Pricing Model & Evaluation Notice
              </h2>
            </div>
            <p className="text-xs text-[#475569] leading-relaxed">
              Standard commercial subscription pricing is currently being calibrated in partnership with our early pilot cohort. Access during the pilot program is granted under a confidential evaluation agreement. Final commercial pricing will reflect verified infrastructure operating costs, transparent pass-through retrieval compute, and user-validated feature utility.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#E2E8F0] text-xs text-[#334155]">
              <div>
                <strong className="block text-[#0F172A] font-mono text-[11px] mb-1">
                  1. Zero Unsolicited Billing
                </strong>
                Pilot participants will never be billed without an explicit, mutually executed commercial agreement.
              </div>
              <div>
                <strong className="block text-[#0F172A] font-mono text-[11px] mb-1">
                  2. Full Data Portability
                </strong>
                All research, claim charts, and annotations can be exported at any time in open JSON and Markdown formats.
              </div>
              <div>
                <strong className="block text-[#0F172A] font-mono text-[11px] mb-1">
                  3. Ethical Walls
                </strong>
                Firm matters remain strictly isolated behind organization boundaries and matter-level confidentiality permissions.
              </div>
            </div>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
