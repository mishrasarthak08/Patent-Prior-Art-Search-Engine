import os

import pandas as pd


def generate_dummy_corpus():
    docs = [
        {
            "id": "US10000001",
            "title": "Quantum Battery Energy Storage System",
            "abstract": "A quantum battery that uses entanglement for rapid charging.",
            "claims": [
                "1. A battery comprising quantum entangled cells.",
                "2. The battery of claim 1, further comprising a supercooled containment unit.",
            ],
            "cpc_codes": ["H01M"],
            "publication_date": "2024-01-01",
            "citations": [],
        },
        {
            "id": "US10000002",
            "title": "Lithium-Ion Silicon Anode Construction",
            "abstract": "An improved structural matrix for lithium-ion battery anodes.",
            "claims": [
                "1. An anode comprising silicon and graphene layers.",
                "2. A device comprising the anode and a solid-state electrolyte.",
            ],
            "cpc_codes": ["H01M"],
            "publication_date": "2023-05-12",
            "citations": ["US10000001"],
        },
        {
            "id": "US10000003",
            "title": "Neural Processor with Resistive RAM",
            "abstract": "An AI chip utilizing ReRAM for low-power matrix multiplication.",
            "claims": [
                "1. A processor device comprising a memory array of ReRAM cells.",
                "2. The processor wherein the memory is tightly coupled to the compute cores.",
            ],
            "cpc_codes": ["G06F", "H01L"],
            "publication_date": "2025-02-28",
            "citations": [],
        },
    ]

    df = pd.DataFrame(docs)
    os.makedirs("data/corpus", exist_ok=True)
    df.to_parquet("data/corpus/corpus.parquet", index=False)
    print("Generated 3 dummy patents to data/corpus/corpus.parquet")


if __name__ == "__main__":
    generate_dummy_corpus()
