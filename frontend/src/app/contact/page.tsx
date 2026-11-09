"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, CheckCircle2, ArrowRight } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", organization: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0F172A] flex flex-col font-sans">
      <MarketingHeader />
      <main className="flex-1 py-16 md:py-24">
        <div className="mx-auto max-w-xl px-6">
          <div className="text-center mb-10 space-y-3">
            <span className="font-mono text-xs uppercase tracking-wider text-[#1E40AF] font-bold">
              DIRECT INQUIRY
            </span>
            <h1 className="text-3xl sm:text-4xl text-[#0F172A] font-serif font-normal leading-tight">
              Contact Patent Intelligence Team
            </h1>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              Have questions about deploying the platform for your patent firm or corporate research team? Speak with our engineering and research leadership.
            </p>
          </div>

          <div className="surface-panel p-7 shadow-xs">
            {submitted ? (
              <div className="text-center py-10 space-y-3">
                <CheckCircle2 className="h-10 w-10 text-[#059669] mx-auto" />
                <h3 className="text-base font-semibold text-[#0F172A]">Inquiry Received</h3>
                <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                  Thank you for contacting the patent research team. An IP solutions specialist will contact you within one business day.
                </p>
                <div className="pt-4">
                  <Link href="/" className="text-xs text-[#1E40AF] font-semibold hover:underline">
                    &larr; Return to Homepage
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Your Full Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs text-[#0F172A] focus:border-[#1E40AF] focus:bg-white focus:outline-none transition"
                    placeholder="David Vance, Esq."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Professional Email</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs text-[#0F172A] focus:border-[#1E40AF] focus:bg-white focus:outline-none transition"
                    placeholder="vance@patentfirm.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Organization or Law Firm</label>
                  <input
                    type="text"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    className="w-full rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs text-[#0F172A] focus:border-[#1E40AF] focus:bg-white focus:outline-none transition"
                    placeholder="Vance & Partners IP LLP"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Inquiry Details</label>
                  <textarea
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs text-[#0F172A] focus:border-[#1E40AF] focus:bg-white focus:outline-none transition leading-relaxed"
                    placeholder="Inquire about seat counts, private VPC deployment, custom classification corpora, or trial access..."
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#0F172A] hover:bg-[#1E40AF] text-white rounded-[5px] text-xs font-semibold transition shadow-xs flex items-center justify-center gap-1.5"
                  >
                    Submit Practice Inquiry <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
