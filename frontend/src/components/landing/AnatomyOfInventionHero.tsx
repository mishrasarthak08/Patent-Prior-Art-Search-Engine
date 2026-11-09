"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Search, ShieldCheck, ExternalLink, Layers, Sparkles } from "lucide-react";

interface ComponentCallout {
  id: string;
  marker: string;
  name: string;
  technicalSpec: string;
  claimElementId: string;
  claimLimitation: string;
  priorArtDoc: string;
  priorArtTitle: string;
  paragraph: string;
  quote: string;
  supportLevel: "DIRECTLY_SUPPORTED" | "PARTIALLY_SUPPORTED";
  charRange: string;
  docHash: string;
}

const CALLOUTS: ComponentCallout[] = [
  {
    id: "anode",
    marker: "12",
    name: "Nanostructured Silicon Anode",
    technicalSpec: "15 wt% nano-Si in mesoporous C matrix; 18 µm thickness",
    claimElementId: "Claim 1, Limitation [1.2]",
    claimLimitation: "an anode comprising a silicon-graphite composite with 10% to 25% by weight nano-silicon particles",
    priorArtDoc: "US10892482B2",
    priorArtTitle: "Lithium-ion secondary battery with silicon-graphite composite anode",
    paragraph: "Detailed Description [0042]",
    quote: "incorporating 15 wt% nano-silicon dispersed within a mesoporous graphite matrix in conjunction with 5 wt% fluoroethylene carbonate",
    supportLevel: "DIRECTLY_SUPPORTED",
    charRange: "chars 1420–1534",
    docHash: "SHA-256: 7f8b9a2c...e014"
  },
  {
    id: "electrolyte",
    marker: "14",
    name: "Sulfide Solid Electrolyte Matrix",
    technicalSpec: "Li₆PS₅Cl argyrodite crystalline structure; σ > 2.4 mS/cm",
    claimElementId: "Claim 1, Limitation [1.3]",
    claimLimitation: "a solid electrolyte layer comprising a thiophosphate argyrodite having ionic conductivity exceeding 2.0 mS/cm",
    priorArtDoc: "EP3890123A1",
    priorArtTitle: "Solid-state electrochemical cell with argyrodite solid electrolyte",
    paragraph: "Detailed Description [0035]",
    quote: "a lithium phosphorus sulfur chlorine argyrodite crystalline electrolyte exhibiting bulk ionic conductivity of 2.4 mS/cm at 25°C",
    supportLevel: "DIRECTLY_SUPPORTED",
    charRange: "chars 980–1110",
    docHash: "SHA-256: 3c91a08b...b721"
  },
  {
    id: "cathode",
    marker: "10",
    name: "Cathode Current Collector & Active Layer",
    technicalSpec: "Al foil 12 µm with LiNi₀.₈Co₀.₁Mn₀.₁O₂ active coating",
    claimElementId: "Claim 1, Limitation [1.1]",
    claimLimitation: "a cathode comprising lithium nickel cobalt manganese oxide active material deposited on an aluminum foil current collector",
    priorArtDoc: "US10454101B2",
    priorArtTitle: "High-capacity nickel-rich cathode active material and lithium cell",
    paragraph: "Detailed Description [0018]",
    quote: "aluminum foil substrate having a thickness of 12 µm coated with LiNi0.8Co0.1Mn0.1O2 cathode composite",
    supportLevel: "DIRECTLY_SUPPORTED",
    charRange: "chars 620–740",
    docHash: "SHA-256: a4e9127d...88cd"
  },
  {
    id: "interlayer",
    marker: "18",
    name: "Fluoroethylene Carbonate Protective Passivation Layer",
    technicalSpec: "Fluoroethylene carbonate (FEC) 2%–8% weight fraction",
    claimElementId: "Claim 1, Limitation [1.4]",
    claimLimitation: "a non-aqueous liquid electrolyte comprising fluoroethylene carbonate in an amount between 2% and 8% by weight",
    priorArtDoc: "WO2022045123A1",
    priorArtTitle: "Electrochemical energy storage device with fluorinated cyclic carbonate additive",
    paragraph: "Detailed Description [0054]",
    quote: "addition of 4.5% by weight fluoroethylene carbonate forms a stable solid electrolyte interphase (SEI) passivating nano-silicon",
    supportLevel: "DIRECTLY_SUPPORTED",
    charRange: "chars 1880–2010",
    docHash: "SHA-256: f19d652a...442b"
  },
  {
    id: "casing",
    marker: "22",
    name: "Hermetic Preload Casing & Current Terminals",
    technicalSpec: "Al pouch casing with 0.5 MPa uniaxial mechanical clamp",
    claimElementId: "Claim 1, Preamble [1.0]",
    claimLimitation: "A high-capacity lithium-ion secondary battery comprising an encapsulated hermetic housing",
    priorArtDoc: "US10892482B2",
    priorArtTitle: "Lithium-ion secondary battery with silicon-graphite composite anode",
    paragraph: "Detailed Description [0012]",
    quote: "the electrochemical stack is housed in a hermetically sealed aluminum laminate envelope under 0.5 MPa compression",
    supportLevel: "DIRECTLY_SUPPORTED",
    charRange: "chars 340–450",
    docHash: "SHA-256: 7f8b9a2c...e014"
  }
];

export function AnatomyOfInventionHero() {
  const [selectedCallout, setSelectedCallout] = useState<ComponentCallout>(CALLOUTS[0]);

  return (
    <div className="relative w-full border-b border-[#E2E8F0] bg-white overflow-hidden">
      {/* Drafting Grid Texture & Coordinates */}
      <div className="absolute inset-0 drafting-grid opacity-60 pointer-events-none" />
      
      {/* Architectural Margin Coordinate Ticks */}
      <div className="absolute top-0 left-0 right-0 h-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/80 px-6 flex items-center justify-between font-mono text-[9px] text-[#94A3B8] select-none">
        <div className="flex items-center gap-6">
          <span>SEC: A-A (PATENT DRAWINGS)</span>
          <span>DATUM: ISO 128-30</span>
          <span>SCALE: 1:1 TECHNICAL</span>
        </div>
        <div className="hidden sm:flex items-center gap-6">
          <span>COORDINATES: 42°21&apos;N 71°03&apos;W</span>
          <span>JURISDICTION: USPTO / EPO / WIPO</span>
          <span className="text-[#1E40AF] font-bold">FIG. 1 EXPLODED VIEW</span>
        </div>
      </div>

      <div className="relative pt-14 pb-16 md:pt-20 md:pb-24 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ASYMMETRIC EDITORIAL HEADER */}
        <div className="max-w-4xl space-y-5 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-[4px] border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-1 font-mono text-[11px] font-semibold text-[#1E40AF]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1E40AF] animate-ping" />
            <span>PATENT PRIOR-ART SEARCH ENGINE</span>
            <span className="text-[#CBD5E1]">&bull;</span>
            <span className="text-[#475569]">THE ANATOMY OF AN INVENTION</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-[68px] font-normal tracking-tight text-[#0F172A] leading-[1.04] font-serif">
            Every invention leaves a trail in the literature.
          </h1>

          <p className="text-lg sm:text-xl text-[#334155] leading-relaxed max-w-2xl font-normal">
            Deconstruct complex patent claims into atomic technical limitations. Uncover antecedent disclosures across multi-jurisdiction corpora, and trace every finding to certified verbatim evidence.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3.5">
            <Link
              href="/app"
              className="inline-flex items-center gap-2.5 rounded-[5px] bg-[#0F172A] px-6 py-3 text-xs font-semibold text-white hover:bg-[#1E40AF] transition shadow-xs"
            >
              Start Prior-Art Investigation <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 rounded-[5px] border border-[#CBD5E1] bg-white px-5 py-3 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] transition shadow-xs"
            >
              Examine Retrieval Architecture
            </Link>
          </div>
        </div>

        {/* THE CENTERPIECE: THE ANATOMY OF AN INVENTION SCHEMATIC */}
        <div className="rounded-[8px] border border-[#CBD5E1] bg-white shadow-sm overflow-hidden">
          {/* Schematic Blueprint Control Bar */}
          <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] font-bold text-[#0F172A] uppercase tracking-wider">
                INTERACTIVE DRAFTING SCHEMATIC:
              </span>
              <span className="font-mono text-[11px] text-[#64748B]">
                SELECT REFERENCE MARKER TO TRACE PRIOR ART
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="text-[#94A3B8]">DEMO INVENTION:</span>
              <span className="font-semibold text-[#0F172A]">SOLID-STATE LITHIUM-ION CELL (H01M 10/0525)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[540px]">
            {/* Left 7 Columns: Technical Patent Drawing (Exploded Assembly View) */}
            <div className="lg:col-span-7 p-6 sm:p-8 bg-[#FAFCFF] border-b lg:border-b-0 lg:border-r border-[#E2E8F0] flex flex-col justify-between relative select-none">
              <div className="flex items-center justify-between text-xs font-mono text-[#64748B] mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#1E40AF]">FIG. 1</span>
                  <span>EXPLODED CROSS-SECTIONAL ELEVATION</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[#059669]" />
                  <span>5 ATOMIC DISCLOSURES LOCATED</span>
                </div>
              </div>

              {/* SVG Technical Drawing Canvas */}
              <div className="relative my-auto flex items-center justify-center py-4">
                <svg
                  viewBox="0 0 640 400"
                  className="w-full max-w-[580px] h-auto text-[#0F172A]"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {/* Subtle Background Drafting Coordinate Grids */}
                  <g stroke="#E2E8F0" strokeWidth="0.75" strokeDasharray="3 3">
                    <line x1="40" y1="20" x2="600" y2="20" />
                    <line x1="40" y1="100" x2="600" y2="100" />
                    <line x1="40" y1="200" x2="600" y2="200" />
                    <line x1="40" y1="300" x2="600" y2="300" />
                    <line x1="40" y1="380" x2="600" y2="380" />
                    <line x1="120" y1="10" x2="120" y2="390" />
                    <line x1="320" y1="10" x2="320" y2="390" />
                    <line x1="520" y1="10" x2="520" y2="390" />
                  </g>

                  {/* Dimension Lines with Tick Arrows */}
                  <g stroke="#94A3B8" strokeWidth="1">
                    <line x1="80" y1="40" x2="80" y2="360" />
                    <line x1="75" y1="40" x2="85" y2="40" />
                    <line x1="75" y1="360" x2="85" y2="360" />
                    <text x="65" y="205" fontSize="10" fontFamily="monospace" fill="#64748B" textAnchor="middle" transform="rotate(-90 65 205)">
                      TOTAL HEIGHT: 38.5 mm ± 0.05
                    </text>
                  </g>

                  {/* 1. TOP CASING & PRELOAD CLAMP (Marker 22) */}
                  <g
                    onClick={() => setSelectedCallout(CALLOUTS[4])}
                    className="cursor-pointer transition-all duration-200"
                  >
                    <rect
                      x="140"
                      y="45"
                      width="380"
                      height="24"
                      rx="3"
                      fill={selectedCallout.id === "casing" ? "#EFF6FF" : "#FFFFFF"}
                      stroke={selectedCallout.id === "casing" ? "#1E40AF" : "#475569"}
                      strokeWidth={selectedCallout.id === "casing" ? "2.5" : "1.5"}
                    />
                    {/* Casing Hatch Lines */}
                    <path
                      d="M150 45 L174 69 M180 45 L204 69 M210 45 L234 69 M240 45 L264 69 M270 45 L294 69 M300 45 L324 69 M330 45 L354 69 M360 45 L384 69 M390 45 L414 69 M420 45 L444 69 M450 45 L474 69 M480 45 L504 69"
                      stroke={selectedCallout.id === "casing" ? "#3B82F6" : "#CBD5E1"}
                      strokeWidth="1"
                    />
                  </g>

                  {/* 2. CATHODE CURRENT COLLECTOR & ACTIVE LAYER (Marker 10) */}
                  <g
                    onClick={() => setSelectedCallout(CALLOUTS[2])}
                    className="cursor-pointer transition-all duration-200"
                  >
                    <rect
                      x="160"
                      y="95"
                      width="340"
                      height="30"
                      rx="2"
                      fill={selectedCallout.id === "cathode" ? "#EFF6FF" : "#FFFFFF"}
                      stroke={selectedCallout.id === "cathode" ? "#1E40AF" : "#334155"}
                      strokeWidth={selectedCallout.id === "cathode" ? "2.5" : "1.5"}
                    />
                    {/* Cathode Microstructure Dots */}
                    <circle cx="200" cy="110" r="3" fill="#64748B" />
                    <circle cx="230" cy="110" r="3" fill="#64748B" />
                    <circle cx="260" cy="110" r="3" fill="#64748B" />
                    <circle cx="290" cy="110" r="3" fill="#64748B" />
                    <circle cx="320" cy="110" r="3" fill="#64748B" />
                    <circle cx="350" cy="110" r="3" fill="#64748B" />
                    <circle cx="380" cy="110" r="3" fill="#64748B" />
                    <circle cx="410" cy="110" r="3" fill="#64748B" />
                    <circle cx="440" cy="110" r="3" fill="#64748B" />
                  </g>

                  {/* 3. PROTECTIVE INTERLAYER PASSIVATION (Marker 18) */}
                  <g
                    onClick={() => setSelectedCallout(CALLOUTS[3])}
                    className="cursor-pointer transition-all duration-200"
                  >
                    <rect
                      x="170"
                      y="150"
                      width="320"
                      height="14"
                      rx="2"
                      fill={selectedCallout.id === "interlayer" ? "#FEF3C7" : "#FFFBEB"}
                      stroke={selectedCallout.id === "interlayer" ? "#D97706" : "#B45309"}
                      strokeWidth={selectedCallout.id === "interlayer" ? "2.5" : "1.25"}
                      strokeDasharray="4 2"
                    />
                  </g>

                  {/* 4. SOLID ELECTROLYTE SEPARATOR (Marker 14) */}
                  <g
                    onClick={() => setSelectedCallout(CALLOUTS[1])}
                    className="cursor-pointer transition-all duration-200"
                  >
                    <rect
                      x="160"
                      y="190"
                      width="340"
                      height="38"
                      rx="2"
                      fill={selectedCallout.id === "electrolyte" ? "#ECFDF5" : "#F0FDF4"}
                      stroke={selectedCallout.id === "electrolyte" ? "#059669" : "#047857"}
                      strokeWidth={selectedCallout.id === "electrolyte" ? "2.5" : "1.5"}
                    />
                    {/* Argyrodite Crystalline Lattice pattern */}
                    <path
                      d="M175 209 L195 209 M225 209 L245 209 M275 209 L295 209 M325 209 L345 209 M375 209 L395 209 M425 209 L445 209 M475 209 L495 209"
                      stroke={selectedCallout.id === "electrolyte" ? "#059669" : "#10B981"}
                      strokeWidth="2"
                    />
                  </g>

                  {/* 5. NANO-SILICON GRAPHITE COMPOSITE ANODE (Marker 12) */}
                  <g
                    onClick={() => setSelectedCallout(CALLOUTS[0])}
                    className="cursor-pointer transition-all duration-200"
                  >
                    <rect
                      x="160"
                      y="255"
                      width="340"
                      height="40"
                      rx="2"
                      fill={selectedCallout.id === "anode" ? "#EFF6FF" : "#F8FAFC"}
                      stroke={selectedCallout.id === "anode" ? "#1E40AF" : "#1E293B"}
                      strokeWidth={selectedCallout.id === "anode" ? "2.5" : "1.5"}
                    />
                    {/* Anode Silicon Particles */}
                    <polygon points="210,270 215,280 205,280" fill="#1E40AF" />
                    <polygon points="260,268 266,278 254,277" fill="#1E40AF" />
                    <polygon points="310,272 316,282 304,281" fill="#1E40AF" />
                    <polygon points="360,269 366,279 354,278" fill="#1E40AF" />
                    <polygon points="410,271 416,281 404,280" fill="#1E40AF" />
                    <polygon points="460,270 466,280 454,279" fill="#1E40AF" />
                  </g>

                  {/* BOTTOM SUBSTRATE CASING */}
                  <rect
                    x="140"
                    y="320"
                    width="380"
                    height="20"
                    rx="3"
                    fill="#FFFFFF"
                    stroke="#475569"
                    strokeWidth="1.5"
                  />

                  {/* LEADER LINES AND NUMBERED MARKERS */}
                  {/* Marker 22 (Casing) */}
                  <line x1="520" y1="57" x2="570" y2="57" stroke="#1E40AF" strokeWidth="1.2" />
                  <circle cx="585" cy="57" r="13" fill={selectedCallout.id === "casing" ? "#1E40AF" : "#FFFFFF"} stroke="#1E40AF" strokeWidth="1.5" />
                  <text x="585" y="61" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle" fill={selectedCallout.id === "casing" ? "#FFFFFF" : "#1E40AF"}>
                    22
                  </text>

                  {/* Marker 10 (Cathode) */}
                  <line x1="500" y1="110" x2="570" y2="110" stroke="#1E40AF" strokeWidth="1.2" />
                  <circle cx="585" cy="110" r="13" fill={selectedCallout.id === "cathode" ? "#1E40AF" : "#FFFFFF"} stroke="#1E40AF" strokeWidth="1.5" />
                  <text x="585" y="114" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle" fill={selectedCallout.id === "cathode" ? "#FFFFFF" : "#1E40AF"}>
                    10
                  </text>

                  {/* Marker 18 (Interlayer) */}
                  <line x1="490" y1="157" x2="570" y2="157" stroke="#D97706" strokeWidth="1.2" />
                  <circle cx="585" cy="157" r="13" fill={selectedCallout.id === "interlayer" ? "#D97706" : "#FFFFFF"} stroke="#D97706" strokeWidth="1.5" />
                  <text x="585" y="161" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle" fill={selectedCallout.id === "interlayer" ? "#FFFFFF" : "#D97706"}>
                    18
                  </text>

                  {/* Marker 14 (Solid Electrolyte) */}
                  <line x1="500" y1="209" x2="570" y2="209" stroke="#059669" strokeWidth="1.2" />
                  <circle cx="585" cy="209" r="13" fill={selectedCallout.id === "electrolyte" ? "#059669" : "#FFFFFF"} stroke="#059669" strokeWidth="1.5" />
                  <text x="585" y="213" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle" fill={selectedCallout.id === "electrolyte" ? "#FFFFFF" : "#059669"}>
                    14
                  </text>

                  {/* Marker 12 (Anode) */}
                  <line x1="500" y1="275" x2="570" y2="275" stroke="#1E40AF" strokeWidth="1.2" />
                  <circle cx="585" cy="275" r="13" fill={selectedCallout.id === "anode" ? "#1E40AF" : "#FFFFFF"} stroke="#1E40AF" strokeWidth="1.5" />
                  <text x="585" y="279" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle" fill={selectedCallout.id === "anode" ? "#FFFFFF" : "#1E40AF"}>
                    12
                  </text>
                </svg>
              </div>

              {/* Marker Selector Tabs along bottom of diagram */}
              <div className="pt-4 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-[#64748B]">DIRECT REFERENCE CALLOUTS:</span>
                <div className="flex flex-wrap gap-1.5">
                  {CALLOUTS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCallout(c)}
                      className={`px-2.5 py-1 rounded-[4px] font-mono text-[11px] font-bold transition flex items-center gap-1.5 ${
                        selectedCallout.id === c.id
                          ? "bg-[#1E40AF] text-white shadow-xs"
                          : "bg-white text-[#475569] border border-[#CBD5E1] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <span className="opacity-75">({c.marker})</span>
                      <span>{c.name.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Connected Evidence Lens & Traceability Dossier */}
            <div className="lg:col-span-5 p-6 sm:p-8 bg-white flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                {/* Header Badge & Marker Indicator */}
                <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                  <div className="flex items-center gap-2">
                    <span className="patent-marker active">({selectedCallout.marker})</span>
                    <div>
                      <h3 className="font-semibold text-sm text-[#0F172A] leading-tight">
                        {selectedCallout.name}
                      </h3>
                      <p className="font-mono text-[10px] text-[#64748B]">
                        {selectedCallout.technicalSpec}
                      </p>
                    </div>
                  </div>
                  <span className="badge-verified">
                    <Check className="h-3 w-3" /> VERIFIED EVIDENCE
                  </span>
                </div>

                {/* Claim Limitation Formulation */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-mono text-[10px] text-[#64748B]">
                    <span className="font-bold text-[#1E40AF]">{selectedCallout.claimElementId}</span>
                    <span>ATOMIC REQUIREMENT</span>
                  </div>
                  <div className="p-3 rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#334155] leading-relaxed">
                    {selectedCallout.claimLimitation}
                  </div>
                </div>

                {/* Prior-Art Publication Disclosure Citation */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-[#0F172A]">{selectedCallout.priorArtDoc}</span>
                      <span className="font-mono text-[10px] text-[#64748B]">PRIOR-ART DISCLOSURE</span>
                    </div>
                    <span className="font-mono text-[10px] text-[#059669] font-semibold">
                      {selectedCallout.supportLevel}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-[#0F172A]">
                    {selectedCallout.priorArtTitle}
                  </h4>

                  {/* Verbatim Certified Quote */}
                  <div className="source-passage-highlight">
                    &ldquo;{selectedCallout.quote}&rdquo;
                  </div>

                  {/* Forensic Coordinates */}
                  <div className="p-2.5 rounded-[4px] bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-[10px] text-[#475569] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1E40AF]">Location:</span>
                      <span>{selectedCallout.paragraph}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Coordinates:</span>
                      <span>{selectedCallout.charRange}</span>
                    </div>
                    <div className="flex items-center justify-between text-[#64748B]">
                      <span>Hash Proof:</span>
                      <span>{selectedCallout.docHash}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Link to Live Document Reader in App */}
              <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
                <span className="font-mono text-[11px] text-[#64748B]">
                  Verified against USPTO official full-text
                </span>
                <Link
                  href={`/app/explorer?q=${encodeURIComponent(selectedCallout.priorArtDoc)}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E40AF] hover:underline"
                >
                  Open in Document Reader <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

