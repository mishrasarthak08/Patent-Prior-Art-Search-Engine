"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Share2,
  Layers,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Search,
  Building2,
  Calendar,
  Globe2,
  Sparkles,
  Info,
  Maximize2
} from "lucide-react";

interface GraphNode {
  id: string;
  label: string;
  title: string;
  country: string;
  family_id: string;
  assignee: string;
  publication_date: string;
  type: "root" | "family_member" | "backward_citation" | "forward_citation";
  is_root: boolean;
  x?: number;
  y?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  relationship: string;
  label: string;
}

interface GraphData {
  root_doc_id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const SEED_PATENTS = [
  { id: "US10892482B2", title: "US10892482B2 (Silicon-Graphite Battery Anode)" },
  { id: "US10454101B2", title: "US10454101B2 (Solid-State Lithium Argyrodite)" },
  { id: "US11205128B2", title: "US11205128B2 (ReRAM Neuromorphic Acceleration)" },
  { id: "US10651289B2", title: "US10651289B2 (Gate-All-Around Nanosheet FET)" },
  { id: "US10925910B2", title: "US10925910B2 (Lipid Nanoparticle mRNA Delivery)" },
  { id: "US11450890B2", title: "US11450890B2 (Fluxonium Superconducting Qubit)" },
  { id: "US11121280B2", title: "US11121280B2 (Perovskite-Silicon Tandem Solar)" },
  { id: "US11287510B2", title: "US11287510B2 (Solid-State FMCW LiDAR)" },
];

export default function KnowledgeGraphPage() {
  const [selectedPatentId, setSelectedPatentId] = useState("US10892482B2");
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterType, setFilterType] = useState<string>("ALL");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
  const apiKey = process.env.NEXT_PUBLIC_APP_API_KEY || "dev_key";

  const fetchGraph = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/v1/patents/${id}/graph`, {
        headers: {
          "X-API-Key": apiKey,
          Authorization: `Bearer ${localStorage.getItem("patent_token") || ""}`,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Patent graph not found`);
      const data: GraphData = await res.json();

      // Compute simple radial layout coordinates for SVG
      const centerX = 380;
      const centerY = 240;
      const radius = 170;

      const nonRoot = data.nodes.filter((n) => !n.is_root);
      const angleStep = nonRoot.length > 0 ? (2 * Math.PI) / nonRoot.length : 0;

      data.nodes.forEach((node, idx) => {
        if (node.is_root) {
          node.x = centerX;
          node.y = centerY;
        } else {
          const nonRootIdx = nonRoot.findIndex((n) => n.id === node.id);
          const angle = nonRootIdx * angleStep - Math.PI / 2;
          node.x = Math.round(centerX + radius * Math.cos(angle));
          node.y = Math.round(centerY + radius * Math.sin(angle));
        }
      });

      setGraphData(data);
      const root = data.nodes.find((n) => n.is_root) || data.nodes[0] || null;
      setSelectedNode(root);
    } catch (e: any) {
      setError(e.message || "Failed to load patent graph.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph(selectedPatentId);
  }, [selectedPatentId]);

  const getNodeColor = (type: string) => {
    switch (type) {
      case "root":
        return "#1E40AF"; // Blue
      case "family_member":
        return "#0D9488"; // Teal
      case "backward_citation":
        return "#D97706"; // Amber
      case "forward_citation":
        return "#7C3AED"; // Purple
      default:
        return "#64748B";
    }
  };

  const filteredEdges =
    graphData?.edges.filter((e) => {
      if (filterType === "ALL") return true;
      if (filterType === "FAMILY") return e.relationship === "SAME_FAMILY";
      if (filterType === "CITATIONS") return e.relationship === "CITES" || e.relationship === "CITED_BY";
      return true;
    }) || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#1E40AF] uppercase tracking-wider">
            <Share2 className="w-3.5 h-3.5" />
            <span>Patent Intelligence Graph</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] mt-1">
            Citation Network & Family Explorer
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Explore 2-hop prior-art citation lineages, backward references, forward citations, and cross-border patent families.
          </p>
        </div>

        {/* Patent Selector */}
        <div className="flex items-center gap-3">
          <select
            value={selectedPatentId}
            onChange={(e) => setSelectedPatentId(e.target.value)}
            className="text-xs font-mono py-1.5 px-3 rounded-[5px] border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-hidden focus:border-[#1E40AF]"
          >
            {SEED_PATENTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <button
            onClick={() => fetchGraph(selectedPatentId)}
            className="p-1.5 rounded-[5px] border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#0F172A] transition"
            title="Refresh Network Graph"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Graph & Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SVG Network Canvas */}
        <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-[6px] shadow-xs p-4 flex flex-col">
          {/* Controls Bar */}
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3 mb-3">
            <div className="flex items-center gap-1.5">
              {["ALL", "FAMILY", "CITATIONS"].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-2.5 py-1 rounded-[4px] text-[11px] font-mono font-medium transition-colors cursor-pointer ${
                    filterType === t
                      ? "bg-[#0F172A] text-white"
                      : "bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono text-[#64748B]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1E40AF]" /> Target
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488]" /> Family Member
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" /> Cites
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED]" /> Cited By
              </span>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="relative flex-1 min-h-[460px] bg-[#FAFAFA] rounded-[5px] border border-[#F1F5F9] overflow-hidden flex items-center justify-center">
            {loading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-2xs flex items-center justify-center z-10">
                <RefreshCw className="w-6 h-6 text-[#1E40AF] animate-spin" />
              </div>
            )}

            {graphData && (
              <svg width="760" height="480" className="w-full h-full">
                {/* Edges */}
                {filteredEdges.map((edge, idx) => {
                  const sourceNode = graphData.nodes.find((n) => n.id === edge.source);
                  const targetNode = graphData.nodes.find((n) => n.id === edge.target);
                  if (!sourceNode || !targetNode) return null;

                  const isFamily = edge.relationship === "SAME_FAMILY";
                  return (
                    <g key={idx}>
                      <line
                        x1={sourceNode.x}
                        y1={sourceNode.y}
                        x2={targetNode.x}
                        y2={targetNode.y}
                        stroke={isFamily ? "#0D9488" : "#94A3B8"}
                        strokeWidth={isFamily ? 2.5 : 1.5}
                        strokeDasharray={isFamily ? "4 3" : undefined}
                      />
                      {/* Edge Label Pill */}
                      <text
                        x={(sourceNode.x! + targetNode.x!) / 2}
                        y={(sourceNode.y! + targetNode.y!) / 2 - 5}
                        textAnchor="middle"
                        fill="#64748B"
                        fontSize="9"
                        fontFamily="monospace"
                        className="select-none bg-white"
                      >
                        {edge.label}
                      </text>
                    </g>
                  );
                })}

                {/* Nodes */}
                {graphData.nodes.map((node) => {
                  const isSelected = selectedNode?.id === node.id;
                  const color = getNodeColor(node.type);
                  return (
                    <g
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className="cursor-pointer group"
                    >
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.is_root ? 28 : 20}
                        fill={color}
                        stroke={isSelected ? "#0F172A" : "#FFFFFF"}
                        strokeWidth={isSelected ? 3.5 : 2}
                        className="transition-transform group-hover:scale-110"
                      />
                      <text
                        x={node.x}
                        y={(node.y || 0) + (node.is_root ? 38 : 30)}
                        textAnchor="middle"
                        fill="#0F172A"
                        fontSize="11"
                        fontWeight="600"
                        fontFamily="monospace"
                        className="select-none"
                      >
                        {node.label}
                      </text>
                      <text
                        x={node.x}
                        y={(node.y || 0) + 4}
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize={node.is_root ? "11" : "9"}
                        fontWeight="bold"
                        fontFamily="monospace"
                        className="select-none"
                      >
                        {node.country}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>

        {/* Selected Node Inspector Drawer */}
        <div className="bg-white border border-[#E2E8F0] rounded-[6px] shadow-xs p-5 flex flex-col justify-between space-y-4">
          {selectedNode ? (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#1E40AF]">
                      {selectedNode.label}
                    </span>
                    <span className="font-mono text-[10px] ml-2 px-1.5 py-0.2 bg-[#F1F5F9] rounded-[2px] text-[#475569]">
                      {selectedNode.country}
                    </span>
                  </div>
                  <span
                    className="font-mono text-[10px] px-2 py-0.5 rounded-[3px] text-white font-semibold"
                    style={{ backgroundColor: getNodeColor(selectedNode.type) }}
                  >
                    {selectedNode.type.toUpperCase().replace("_", " ")}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[#0F172A] leading-snug">
                    {selectedNode.title}
                  </h3>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-[#F8FAFC]">
                    <span className="text-[#64748B]">Assignee</span>
                    <span className="font-medium text-[#0F172A] text-right truncate max-w-[200px]">
                      {selectedNode.assignee || "Not specified"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#F8FAFC]">
                    <span className="text-[#64748B]">Publication Date</span>
                    <span className="font-mono text-[#0F172A]">
                      {selectedNode.publication_date || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#F8FAFC]">
                    <span className="text-[#64748B]">Patent Family ID</span>
                    <span className="font-mono text-[#1E40AF] font-bold">
                      {selectedNode.family_id || "N/A"}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-[4px] bg-[#EFF6FF] border border-[#BFDBFE] text-xs text-[#1E40AF] space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    <span>Prior-Art Relationship</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#1E3A8A]">
                    {selectedNode.is_root
                      ? "Target patent subject of this investigation graph."
                      : selectedNode.type === "family_member"
                      ? "Shares identical priority date and invention disclosure in another patent jurisdiction."
                      : selectedNode.type === "backward_citation"
                      ? "Prior-art document explicitly cited on the face of the patent during prosecution."
                      : "Later patent document citing this disclosure as prior art."}
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-[#F1F5F9]">
                <button
                  onClick={() => setSelectedPatentId(selectedNode.id)}
                  className="w-full py-2 bg-[#0F172A] hover:bg-[#1E40AF] text-white text-xs font-semibold rounded-[5px] transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Center Network on this Patent</span>
                </button>
                <Link
                  href={`/app/explorer?id=${selectedNode.id}`}
                  className="w-full py-2 border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#0F172A] text-xs font-semibold rounded-[5px] transition flex items-center justify-center gap-1.5"
                >
                  <span>Open Full Patent Text</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#64748B]" />
                </Link>
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-xs text-[#64748B]">
              Select a node in the graph to inspect patent metadata and citation relationships.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
