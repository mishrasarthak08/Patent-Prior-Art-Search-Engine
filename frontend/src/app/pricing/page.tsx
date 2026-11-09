import React from "react";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";

export default function PricingPage() {
  const tiers = [
    {
      name: "Solo Practitioner",
      price: "$249",
      period: "per user / month",
      desc: "For independent patent attorneys, registered agents, and technical examiners conducting focused prior-art discovery.",
      features: [
        "150 prior-art search executions/mo",
        "Atomic limitation tree decomposition",
        "Hybrid BM25 & dense vector retrieval",
        "Automated substring quotation verification",
        "Markdown, HTML & CSV dossier exports",
        "Personal research workspace with PostgreSQL RLS",
        "Zero-Retention Confidential Mode",
      ],
      cta: "Start Practitioner Plan",
      href: "/register",
      featured: false,
    },
    {
      name: "Boutique Firm",
      price: "$799",
      period: "per firm / month (5 seats included)",
      desc: "For patent prosecution boutiques and corporate IP teams requiring multi-user collaboration and full matter workflows.",
      features: [
        "750 prior-art search executions/mo",
        "Full-disclosure 1,500-char context window expansion",
        "Cohere cross-encoder reranking & gap analysis",
        "Side-by-side prior-art comparison tool",
        "Print-ready HTML legal memoranda & CSV matrices",
        "Unlimited client matters & shared firm workspaces",
        "Attorney annotation & review workflow",
        "Role-based access control & tenant isolation",
      ],
      cta: "Launch Boutique Plan",
      href: "/register",
      featured: true,
    },
    {
      name: "Custom Enterprise",
      price: "Custom",
      period: "annual contract",
      desc: "For corporate IP departments, global patent litigation firms, and institutional research organizations.",
      features: [
        "Unlimited prior-art search queries",
        "Dedicated isolated database & vector namespace",
        "SSO / SAML 2.0 & Role-Based Access Controls",
        "Cryptographically sealed audit trail exports",
        "On-premise or private VPC deployment options",
        "99.9% Uptime SLA & 24/7 Priority Support",
        "Custom classification & proprietary corpus ingestion",
      ],
      cta: "Contact Enterprise Sales",
      href: "/contact",
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
              TRANSPARENT SEAT LICENSING
            </span>
            <h1 className="text-3xl sm:text-5xl text-[#0F172A] font-serif font-normal leading-tight">
              Invest in precision prior-art intelligence.
            </h1>
            <p className="text-sm sm:text-base text-[#475569] leading-relaxed">
              Predictable seat-based pricing backed by zero-retention confidentiality and multi-format evidence generation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {tiers.map((t) => (
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
                    <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                      {t.name}
                    </span>
                    {t.featured && (
                      <span className="badge-verified text-[10px] font-bold">
                        RECOMMENDED
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-3xl sm:text-4xl font-serif text-[#0F172A] font-normal">{t.price}</span>
                    <span className="text-xs text-[#64748B] block mt-1 font-mono">{t.period}</span>
                  </div>

                  <p className="text-xs text-[#64748B] leading-relaxed">{t.desc}</p>

                  <div className="pt-4 border-t border-[#E2E8F0] space-y-2.5">
                    <span className="font-mono text-[10px] uppercase font-bold text-[#94A3B8] block">Included Features:</span>
                    {t.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-[#0F172A]">
                        <Check className="h-3.5 w-3.5 text-[#059669] shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8">
                  <Link
                    href={t.href}
                    className={`flex w-full items-center justify-center gap-1.5 py-2.5 rounded-[5px] text-xs font-semibold transition ${
                      t.featured
                        ? "bg-[#0F172A] text-white hover:bg-[#1E40AF] shadow-xs"
                        : "border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] hover:bg-[#F1F5F9]"
                    }`}
                  >
                    {t.cta} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
