"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Network, Share2, Layers, CheckCircle2, ChevronRight, Scale, ExternalLink } from "lucide-react";

interface GraphNode {
  id: string;
  label: string;
  type: "CLAIM" | "PATENT" | "FAMILY" | "CPC" | "EVIDENCE";
  x: number;
  y: number;
  jurisdiction?: string;
  details: string;
}

interface GraphEdge {
  from: string;
  to: string;
  label: string;
}

const NODES: GraphNode[] = [
  {
    id: "claim-1",
    label: "Target Claim 1",
    type: "CLAIM",
    x: 80,
    y: 190,
    details: "High-capacity lithium-ion battery with silicon-graphite composite anode and fluoroethylene carbonate."
  },
  {
    id: "lim-1.2",
    label: "Limitation [1.2]: Nano-Si Anode",
    type: "EVIDENCE",
    x: 230,
    y: 120,
    details: "10% to 25% by weight nano-silicon particles dispersed in mesoporous carbon."
  },
  {
    id: "lim-1.3",
    label: "Limitation [1.3]: FEC Additive",
    type: "EVIDENCE",
    x: 230,
    y: 260,
    details: "Fluoroethylene carbonate electrolyte additive in 2% to 8% weight fraction."
  },
  {
    id: "us-482",
    label: "US10892482B2",
    type: "PATENT",
    jurisdiction: "US",
    x: 420,
    y: 110,
    details: "SolidEnergy Materials Corp. — Primary anticipating prior-art reference. Direct support [0042]."
  },
  {
    id: "ep-123",
    label: "EP3890123A1",
    type: "PATENT",
    jurisdiction: "EP",
    x: 420,
    y: 270,
    details: "QuantumVolt Technologies GmbH — European priority filing covering sulfide argyrodite separator."
  },
  {
    id: "fam-bat",
    label: "Family FAM-BAT-001",
    type: "FAMILY",
    x: 580,
    y: 190,
    details: "Cross-border global patent family linking US, EP, and WO counterpart specifications."
  },
  {
    id: "cpc-h01m",
    label: "CPC: H01M 10/0525",
    type: "CPC",
    x: 330,
    y: 40,
    details: "Non-aqueous secondary batteries with solid electrolytes or composite electrodes."
  }
];

const EDGES: GraphEdge[] = [
  { from: "claim-1", to: "lim-1.2", label: "decomposes to" },
  { from: "claim-1", to: "lim-1.3", label: "decomposes to" },
  { from: "lim-1.2", to: "us-482", label: "directly maps [0042]" },
  { from: "lim-1.3", to: "us-482", label: "directly maps [0054]" },
  { from: "lim-1.3", to: "ep-123", label: "discloses [Claim 3]" },
  { from: "us-482", to: "fam-bat", label: "family equivalent" },
  { from: "ep-123", to: "fam-bat", label: "family equivalent" },
  { from: "us-482", to: "cpc-h01m", label: "classified under" },
];

export function DiscoveryLandscapeGraph() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("claim-1");
  const selectedNode = NODES.find((n) => n.id === selectedNodeId) || NODES[0];

  const getNodeColor = (type: GraphNode["type"]) => {
    switch (type) {
      case "CLAIM": return "#1E40AF"; // Cobalt
      case "PATENT": return "#0F172A"; // Slate
      case "FAMILY": return "#7C3AED"; // Purple
      case "CPC": return "#059669"; // Emerald
      case "EVIDENCE": return "#D97706"; // Amber
    }
  };

  return (
    <div className="rounded-[8px] border border-[#CBD5E1] bg-white shadow-xs overflow-hidden">
      {/* Top Header */}
      <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] font-bold text-[#1E40AF] uppercase tracking-wider">
            MULTI-DIMENSIONAL RELATIONSHIP TOPOLOGY:
          </span>
          <h3 className="text-base font-semibold text-[#0F172A] mt-0.5">
            The Discovery Landscape: Claims, Classifications & Families
          </h3>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] text-[#64748B]">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#1E40AF]" /> Claim
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#D97706]" /> Limitation
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#0F172A]" /> Patent
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#7C3AED]" /> Family
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#059669]" /> CPC
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
        {/* Left 8 Columns: SVG Relationship Network */}
        <div className="lg:col-span-8 p-6 bg-[#FAFCFF] border-b lg:border-b-0 lg:border-r border-[#E2E8F0] flex flex-col justify-between relative select-none">
          <div className="relative my-auto flex items-center justify-center">
            <svg
              viewBox="0 0 680 340"
              className="w-full max-w-[640px] h-auto"
              fill="none"
              stroke="currentColor"
            >
              {/* Drafting Grid Backdrop */}
              <g stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="3 3">
                <line x1="20" y1="50" x2="660" y2="50" />
                <line x1="20" y1="120" x2="660" y2="120" />
                <line x1="20" y1="190" x2="660" y2="190" />
                <line x1="20" y1="260" x2="660" y2="260" />
                <line x1="160" y1="20" x2="160" y2="320" />
                <line x1="340" y1="20" x2="340" y2="320" />
                <line x1="520" y1="20" x2="520" y2="320" />
              </g>

              {/* Connector Edges */}
              {EDGES.map((edge, i) => {
                const source = NODES.find((n) => n.id === edge.from)!;
                const target = NODES.find((n) => n.id === edge.to)!;
                const isConnected = selectedNodeId === source.id || selectedNodeId === target.id;

                return (
                  <g key={i}>
                    <line
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={isConnected ? "#1E40AF" : "#CBD5E1"}
                      strokeWidth={isConnected ? "2" : "1"}
                      strokeDasharray={edge.label.includes("maps") ? "4 2" : undefined}
                      className="transition-colors duration-200"
                    />
                  </g>
                );
              })}

              {/* Render Nodes */}
              {NODES.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const color = getNodeColor(node.type);

                return (
                  <g
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className="cursor-pointer transition-transform duration-200"
                  >
                    {/* Node Background Halo */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isSelected ? "22" : "16"}
                      fill="#FFFFFF"
                      stroke={color}
                      strokeWidth={isSelected ? "3" : "1.75"}
                    />
                    {/* Inner Type Indicator */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isSelected ? "12" : "8"}
                      fill={color}
                    />
                    {/* Label */}
                    <text
                      x={node.x}
                      y={node.y + 32}
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight={isSelected ? "bold" : "normal"}
                      textAnchor="middle"
                      fill="#0F172A"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between font-mono text-[10px] text-[#64748B]">
            <span>CLICK ANY NODE TO INSPECT CROSS-LINKED ENTITIES</span>
            <span className="text-[#1E40AF] font-bold">53 GRAPH EDGES INDEXED</span>
          </div>
        </div>

        {/* Right 4 Columns: Node Inspector Drawer */}
        <div className="lg:col-span-4 p-6 bg-white flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="space-y-1.5 pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span
                  className="font-bold px-2 py-0.5 rounded-[3px] text-white"
                  style={{ backgroundColor: getNodeColor(selectedNode.type) }}
                >
                  {selectedNode.type} NODE
                </span>
                {selectedNode.jurisdiction && (
                  <span className="font-bold text-[#64748B]">
                    JURISDICTION: {selectedNode.jurisdiction}
                  </span>
                )}
              </div>
              <h4 className="text-base font-bold text-[#0F172A]">
                {selectedNode.label}
              </h4>
            </div>

            <p className="text-xs text-[#334155] leading-relaxed">
              {selectedNode.details}
            </p>

            {/* Connected Relationships */}
            <div className="space-y-2 pt-2">
              <span className="font-mono text-[10px] font-bold text-[#64748B] uppercase">
                Direct Topological Links:
              </span>
              <div className="space-y-1.5 font-mono text-xs">
                {EDGES.filter((e) => e.from === selectedNode.id || e.to === selectedNode.id).map((e, idx) => {
                  const otherId = e.from === selectedNode.id ? e.to : e.from;
                  const otherNode = NODES.find((n) => n.id === otherId);
                  const isOutgoing = e.from === selectedNode.id;

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedNodeId(otherId)}
                      className="p-2 rounded-[4px] bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#1E40AF] cursor-pointer transition flex items-center justify-between"
                    >
                      <span className="text-[11px] text-[#0F172A] font-semibold">
                        {otherNode?.label}
                      </span>
                      <span className="text-[10px] text-[#64748B]">
                        {isOutgoing ? `→ ${e.label}` : `← ${e.label}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
            <span className="font-mono text-[10px] text-[#64748B]">Knowledge Graph API</span>
            <Link href="/app/graph" className="text-xs font-semibold text-[#1E40AF] hover:underline flex items-center gap-1">
              Explore Full Graph &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
