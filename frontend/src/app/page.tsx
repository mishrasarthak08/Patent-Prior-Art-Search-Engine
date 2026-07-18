"use client";

import { useState } from "react";

const DISCLAIMER_TEXT = `This tool assists prior-art research and is NOT a substitute for a registered
patent attorney, patent agent, or professional prior-art search firm.
Results are retrieval-and-ranking outputs from an automated pipeline and
have not been reviewed by a legal professional. Do not rely on this tool's
output, alone, for any filing, licensing, litigation, or invalidity decision.`;

export default function Home() {
  const [claimText, setClaimText] = useState("");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_claim: claimText }),
      });
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
      alert("Search failed. Ensure backend and Qdrant are running.");
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Patent Prior-Art Search Engine</h1>
        <p className="text-gray-600 mt-2">A Hybrid-Retrieval, Reranked, Explainable Prior-Art Discovery System</p>
      </header>

      {/* Mandatory Disclaimer */}
      <div className="bg-red-50 border-l-4 border-red-500 p-4 text-sm text-red-900 font-mono whitespace-pre-wrap">
        <span className="font-bold block mb-1">LEGAL DISCLAIMER:</span>
        {DISCLAIMER_TEXT}
      </div>

      <form onSubmit={handleSearch} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Raw Patent Claim</label>
          <textarea
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border focus:ring-blue-500 focus:border-blue-500 font-mono text-sm text-black"
            rows={5}
            value={claimText}
            onChange={(e) => setClaimText(e.target.value)}
            placeholder="A device comprising a processor, a memory, and..."
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search Prior Art"}
        </button>
      </form>

      {results && (
        <div className="space-y-8">
          <section className="bg-gray-50 p-4 rounded-md">
            <h2 className="text-xl font-semibold mb-4 text-black">Decomposed Claim Elements</h2>
            <ul className="space-y-2">
              {results.query_claim.elements.map((elem: any) => (
                <li key={elem.element_id} className="flex gap-2 items-start">
                  <span className="bg-gray-200 text-xs px-2 py-1 rounded font-mono text-black">{elem.element_id}</span>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">{elem.element_type}</span>
                  <span className="text-gray-800">{elem.text}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-black">Ranked Results ({results.results.length})</h2>
            <div className="space-y-6">
              {results.results.map((doc: any, i: number) => (
                <div key={doc.doc_id} className="border border-gray-200 rounded-lg p-4 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-blue-600">#{i + 1} {doc.doc_id}</h3>
                      <p className="text-sm text-gray-500">{doc.title}</p>
                    </div>
                    <div className="flex gap-1">
                      {doc.retrieval_sources.map((src: string) => (
                        <span key={src} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded uppercase font-bold">
                          {src}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="text-gray-700 text-sm italic border-l-2 pl-3 border-gray-300">"{doc.snippet}"</p>
                  
                  <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-900 border border-yellow-200">
                    <span className="font-bold">Relevance Explanation:</span> {doc.explanation}
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-semibold text-gray-500">Matched Elements:</span>
                    {doc.matched_elements.map((elem_id: string) => (
                      <span key={elem_id} className="bg-gray-200 text-xs px-2 py-1 rounded font-mono text-black">{elem_id}</span>
                    ))}
                  </div>

                  <details className="text-sm text-gray-600 border-t pt-2 mt-2">
                    <summary className="cursor-pointer font-medium hover:text-blue-600">Ranking Debugger (How this result was found)</summary>
                    <div className="mt-2 grid grid-cols-2 gap-4 p-2 bg-gray-50 rounded">
                      <div>
                        <strong>Raw Scores:</strong>
                        <pre className="text-xs mt-1">{JSON.stringify(doc.raw_scores, null, 2)}</pre>
                      </div>
                      <div>
                        <strong>Fused Score:</strong> {doc.fused_score.toFixed(4)}<br/>
                        <strong>Rerank Score:</strong> {doc.rerank_score ? doc.rerank_score.toFixed(4) : "N/A"}
                      </div>
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
