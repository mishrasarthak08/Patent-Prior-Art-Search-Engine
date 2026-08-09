"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DISCLAIMER_TEXT = `This tool assists prior-art research and is NOT a substitute for a registered patent attorney, patent agent, or professional prior-art search firm. Results are retrieval-and-ranking outputs from an automated pipeline and have not been reviewed by a legal professional.`;

export default function Home() {
  const [claimText, setClaimText] = useState("");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResults(null);
    try {
      const res = await fetch("http://localhost:8000/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": "dev_key" },
        body: JSON.stringify({ raw_claim: claimText }),
      });
      if (!res.ok) {
        throw new Error(`Search failed with status: ${res.status}`);
      }
      const data = await res.json();
      setResults(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Search failed. Ensure backend and Qdrant are running.");
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* Background gradients */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-16 space-y-12">
        <header className="space-y-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-block"
          >
            <span className="px-3 py-1 text-xs font-semibold tracking-wider text-indigo-400 uppercase bg-indigo-400/10 rounded-full border border-indigo-400/20">
              AI-Powered Search
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500"
          >
            Patent Prior-Art Engine
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-zinc-400 max-w-2xl mx-auto"
          >
            A Hybrid-Retrieval, Reranked, and Explainable Prior-Art Discovery System
          </motion.p>
        </header>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {/* Mandatory Disclaimer */}
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-sm text-red-400 flex items-start gap-3 backdrop-blur-sm">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <span className="font-bold block mb-1 text-red-300">LEGAL DISCLAIMER</span>
              <p className="leading-relaxed opacity-90">{DISCLAIMER_TEXT}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-1 rounded-2xl shadow-2xl"
        >
          <div className="bg-zinc-900 rounded-xl p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Raw Patent Claim</label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                  <textarea
                    className="relative w-full rounded-xl bg-zinc-950 border border-zinc-800 p-4 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono text-sm resize-y"
                    rows={4}
                    value={claimText}
                    onChange={(e) => setClaimText(e.target.value)}
                    placeholder="e.g., A device comprising a processor, a memory, and..."
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading || !claimText.trim()}
                  className="relative group overflow-hidden rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Analyzing Claim...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Search Prior Art
                      </>
                    )}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm"
            >
              {error}
            </motion.div>
          )}

          {results && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12 pb-12"
            >
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-px bg-zinc-800 flex-1"></div>
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Decomposed Claim Elements
                  </h2>
                  <div className="h-px bg-zinc-800 flex-1"></div>
                </div>
                
                <div className="grid gap-3 md:grid-cols-2">
                  {results.query_claim.elements.map((elem: any) => (
                    <motion.div 
                      whileHover={{ scale: 1.01 }}
                      key={elem.element_id} 
                      className="bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-xl flex gap-4 items-start hover:bg-zinc-900/80 transition-colors"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs px-2 py-1 rounded font-mono font-bold">
                          {elem.element_id}
                        </span>
                      </div>
                      <div>
                        <span className="inline-block mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                          {elem.element_type}
                        </span>
                        <p className="text-zinc-300 text-sm leading-relaxed">{elem.text}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-px bg-zinc-800 flex-1"></div>
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Ranked Results ({results.results.length})
                  </h2>
                  <div className="h-px bg-zinc-800 flex-1"></div>
                </div>

                <div className="space-y-6">
                  {results.results.map((doc: any, i: number) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      key={doc.doc_id} 
                      className="group relative bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 transition-all hover:bg-zinc-900 hover:border-zinc-700"
                    >
                      <div className="absolute top-0 right-0 -mt-3 -mr-3 bg-zinc-800 border border-zinc-700 w-8 h-8 rounded-full flex items-center justify-center shadow-lg font-bold text-sm text-zinc-300 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        #{i + 1}
                      </div>

                      <div className="space-y-5">
                        <div>
                          <div className="flex flex-wrap gap-2 items-center mb-2">
                            <h3 className="text-xl font-bold text-zinc-100">{doc.doc_id}</h3>
                            <div className="flex gap-2 ml-auto">
                              {doc.retrieval_sources.map((src: string) => (
                                <span key={src} className="bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                                  {src}
                                </span>
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-zinc-400 font-medium">{doc.title}</p>
                        </div>

                        <div className="relative">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-blue-500 rounded-full"></div>
                          <p className="text-zinc-300 text-sm leading-relaxed pl-4 italic">
                            "{doc.snippet}"
                          </p>
                        </div>
                        
                        <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-xl text-sm text-indigo-100/80">
                          <span className="font-bold text-indigo-400 block mb-1">AI Relevance Analysis</span> 
                          {doc.explanation}
                        </div>

                        <div className="flex flex-wrap gap-2 items-center bg-zinc-950 p-3 rounded-lg border border-zinc-800/50">
                          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Matched:</span>
                          {doc.matched_elements.length > 0 ? (
                            doc.matched_elements.map((elem_id: string) => (
                              <span key={elem_id} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2 py-1 rounded shadow-sm font-mono font-bold">
                                {elem_id}
                              </span>
                            ))
                          ) : (
                            <span className="text-zinc-600 text-xs italic">None</span>
                          )}
                        </div>

                        <details className="group/details">
                          <summary className="cursor-pointer text-xs font-semibold tracking-wider uppercase text-zinc-500 hover:text-indigo-400 transition-colors flex items-center gap-1 outline-none select-none">
                            <svg className="w-4 h-4 transition-transform group-open/details:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            Scoring Debugger
                          </summary>
                          <div className="mt-3 grid grid-cols-2 gap-4 p-4 bg-zinc-950 rounded-xl border border-zinc-800 text-sm">
                            <div>
                              <strong className="text-zinc-400 block mb-2 text-xs uppercase tracking-wider">Raw Component Scores</strong>
                              <div className="space-y-1">
                                {Object.entries(doc.raw_scores).map(([k, v]: [string, any]) => (
                                  <div key={k} className="flex justify-between font-mono text-xs">
                                    <span className="text-zinc-500">{k}:</span>
                                    <span className="text-indigo-300">{v.toFixed(4)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="flex flex-col justify-center space-y-2 border-l border-zinc-800 pl-4">
                              <div className="flex justify-between font-mono text-xs">
                                <span className="text-zinc-400 uppercase tracking-wider font-bold">Fused</span>
                                <span className="text-emerald-400 font-bold">{doc.fused_score?.toFixed(4) || "0.0000"}</span>
                              </div>
                              <div className="flex justify-between font-mono text-xs">
                                <span className="text-zinc-400 uppercase tracking-wider font-bold">Rerank</span>
                                <span className={doc.rerank_score ? "text-emerald-400 font-bold" : "text-zinc-600 italic"}>
                                  {doc.rerank_score ? doc.rerank_score.toFixed(4) : "N/A"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </details>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
