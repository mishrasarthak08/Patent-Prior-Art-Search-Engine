"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Layers,
  FileCheck,
  GitCompare,
  Briefcase,
  Share2,
  Activity,
  FileText,
  Shield,
  Settings,
  Users,
  Compass,
  ArrowRight,
  Sparkles,
  Command,
} from "lucide-react";

interface PaletteItem {
  id: string;
  category: "Navigation" | "Patents" | "Actions" | "Analysis";
  title: string;
  subtitle: string;
  href?: string;
  action?: () => void;
  icon: any;
}

export default function CommandPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const items: PaletteItem[] = [
    // Navigation
    {
      id: "nav-search",
      category: "Navigation",
      title: "Prior-Art Search Workbench",
      subtitle: "Multi-strategy retrieval, atomic limitation decomposition, and gap detection",
      href: "/app/search",
      icon: Search,
    },
    {
      id: "nav-claim-map",
      category: "Analysis",
      title: "Comparative Claim Matrix",
      subtitle: "Map 1 independent claim against 3-5 patents across all limitations",
      href: "/app/claim-map",
      icon: FileCheck,
    },
    {
      id: "nav-graph",
      category: "Analysis",
      title: "Knowledge & Citation Graph",
      subtitle: "Interactive 2-hop network of citations and cross-border patent families",
      href: "/app/graph",
      icon: Share2,
    },
    {
      id: "nav-corpus",
      category: "Navigation",
      title: "Corpus Coverage Explorer",
      subtitle: "Inspect multi-jurisdiction full-text distribution (US, EP, WO across 10 sectors)",
      href: "/app/corpus",
      icon: Layers,
    },
    {
      id: "nav-eval-lab",
      category: "Analysis",
      title: "Research Evaluation Laboratory",
      subtitle: "Scientific ablation metrics: BM25 vs Dense vs Hybrid vs Iterative Gap Search",
      href: "/app/eval-lab",
      icon: Activity,
    },
    {
      id: "nav-dossier",
      category: "Actions",
      title: "Research Dossier Studio",
      subtitle: "Generate legally compliant prior-art invalidity dossiers with audit trails",
      href: "/app/dossier",
      icon: FileText,
    },
    {
      id: "nav-matters",
      category: "Navigation",
      title: "Legal Matters & Workspaces",
      subtitle: "Manage client dockets, patent portfolios, and search sessions",
      href: "/app/matters",
      icon: Briefcase,
    },
    {
      id: "nav-claim-charts",
      category: "Analysis",
      title: "Evidence Claim Charts",
      subtitle: "Inspect exact paragraph quotations, character offsets, and attorney verifications",
      href: "/app/claim-charts",
      icon: FileCheck,
    },
    {
      id: "nav-compare",
      category: "Analysis",
      title: "Side-by-Side Document Comparison",
      subtitle: "Align disclosures, specifications, and claim elements between two patents",
      href: "/app/compare",
      icon: GitCompare,
    },
    {
      id: "nav-explorer",
      category: "Navigation",
      title: "Corpus Document Explorer",
      subtitle: "Browse full-text patent specifications with paragraph numbering",
      href: "/app/explorer",
      icon: Compass,
    },
    // Curated Patents
    {
      id: "pat-us10892482",
      category: "Patents",
      title: "US10892482B2",
      subtitle: "Lithium-ion battery with silicon-graphite anode & FEC electrolyte additive",
      href: "/app/explorer?id=US10892482B2",
      icon: Sparkles,
    },
    {
      id: "pat-ep3890123",
      category: "Patents",
      title: "EP3890123A1",
      subtitle: "Electrochemical cell with hybrid silicon-nanocarbon negative electrode & TTE",
      href: "/app/explorer?id=EP3890123A1",
      icon: Sparkles,
    },
    {
      id: "pat-us11205128",
      category: "Patents",
      title: "US11205128B2",
      subtitle: "Neuromorphic computing architecture with crossbar resistive memory ReRAM",
      href: "/app/explorer?id=US11205128B2",
      icon: Sparkles,
    },
    {
      id: "pat-us10651289",
      category: "Patents",
      title: "US10651289B2",
      subtitle: "Gate-all-around (GAA) nanosheet field effect transistor with inner spacer",
      href: "/app/explorer?id=US10651289B2",
      icon: Sparkles,
    },
    {
      id: "pat-us10925910",
      category: "Patents",
      title: "US10925910B2",
      subtitle: "Lipid nanoparticle formulation for mRNA delivery comprising ionizable amino lipids",
      href: "/app/explorer?id=US10925910B2",
      icon: Sparkles,
    },
    // Governance
    {
      id: "nav-audit",
      category: "Navigation",
      title: "Compliance Audit Trail",
      subtitle: "Immutable non-repudiation event ledger with SHA-256 integrity logs",
      href: "/app/audit",
      icon: Shield,
    },
    {
      id: "nav-team",
      category: "Navigation",
      title: "Team & Seat Management",
      subtitle: "Enterprise organization access control and seat provisioning",
      href: "/app/team",
      icon: Users,
    },
    {
      id: "nav-settings",
      category: "Navigation",
      title: "Platform Settings & API Keys",
      subtitle: "Confidential Zero-Retention mode, models, and personal access tokens",
      href: "/app/settings",
      icon: Settings,
    },
  ];

  const filteredItems = items.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = filteredItems[selectedIndex];
      if (selected) {
        if (selected.href) {
          router.push(selected.href);
          onClose();
        } else if (selected.action) {
          selected.action();
          onClose();
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-start justify-center pt-20 px-4 animate-in fade-in duration-100">
      <div
        className="w-full max-w-2xl bg-white rounded-[6px] border border-[#E2E8F0] shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-[#E2E8F0] bg-white">
          <Search className="w-4 h-4 text-[#64748B] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a patent number (e.g. US10892482), claim term, or jump to route..."
            className="w-full py-3.5 px-3 text-[14px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-hidden bg-transparent"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono text-[#64748B] bg-[#F1F5F9] border border-[#E2E8F0] rounded-[3px]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 divide-y divide-[#F1F5F9]">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[#64748B]">
              No routes, patents, or actions matching "{query}".
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.href) {
                      router.push(item.href);
                      onClose();
                    } else if (item.action) {
                      item.action();
                      onClose();
                    }
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-[4px] cursor-pointer transition-colors ${
                    isSelected ? "bg-[#F1F5F9] text-[#0F172A]" : "text-[#334155] hover:bg-[#F8F9FA]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-1.5 rounded-[4px] shrink-0 ${
                        isSelected ? "bg-[#1E40AF] text-white" : "bg-[#F8F9FA] text-[#64748B]"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-[#0F172A] flex items-center gap-2 truncate">
                        <span>{item.title}</span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded-[2px] bg-[#E2E8F0] text-[#475569]">
                          {item.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#64748B] truncate mt-0.5">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <ArrowRight className="w-3.5 h-3.5 text-[#1E40AF] shrink-0 ml-2" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-2.5 px-4 bg-[#F8F9FA] border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#64748B]">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-white border border-[#E2E8F0] px-1 py-0.5 rounded-[2px]">↑</kbd>
              <kbd className="font-mono bg-white border border-[#E2E8F0] px-1 py-0.5 rounded-[2px] ml-1">↓</kbd> navigate
            </span>
            <span>
              <kbd className="font-mono bg-white border border-[#E2E8F0] px-1.5 py-0.5 rounded-[2px]">↵</kbd> select
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#64748B]">
            <Command className="w-3 h-3" /> Patent Intelligence 2.0
          </div>
        </div>
      </div>
    </div>
  );
}
