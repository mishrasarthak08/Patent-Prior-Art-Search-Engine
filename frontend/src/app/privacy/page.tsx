import React from "react";
import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0F172A] flex flex-col font-sans">
      <MarketingHeader />
      <main className="flex-1 py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-6 space-y-8">
          <div className="border-b border-[#E2E8F0] pb-6 space-y-2">
            <span className="font-mono text-xs uppercase tracking-wider text-[#1E40AF] font-bold">LEGAL POLICY</span>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#0F172A] font-normal">Privacy & Data Governance Policy</h1>
            <p className="text-xs text-[#94A3B8] font-mono">Effective Date: November 2026 &bull; Patent Prior-Art Search Engine</p>
          </div>

          <div className="space-y-6 text-xs text-[#475569] leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-[#0F172A]">1. Commitment to IP Confidentiality</h2>
              <p>
                The Patent Prior-Art Search Engine recognizes that patent claims, invention disclosures, and clearance queries submitted to the platform may reflect confidential, unfiled intellectual property. Our platform architecture enforces strict data isolation and zero-training guarantees.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-[#0F172A]">2. Zero-Retention Confidential Mode</h2>
              <p>
                When Confidential Mode is enabled, invention claim texts, search parameters, and limitation trees are held exclusively in volatile RAM during query processing. No user disclosures are written to unencrypted persistent disks, application logs, or external monitoring endpoints.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-[#0F172A]">3. Prohibition of AI Model Training</h2>
              <p>
                We do not use, disclose, license, or sell customer search queries, submitted claims, or research dossiers to train, fine-tune, or evaluate foundation language models or commercial machine learning classifiers.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-[#0F172A]">4. Non-Repudiation Audit Logs</h2>
              <p>
                Account holders retain administrative access to inspect, export, or audit all practitioner activity within their organization tenant. Audit trails record execution metadata (timestamp, user identifier, action hash) without leaking raw confidential claim formulation text.
              </p>
            </section>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
