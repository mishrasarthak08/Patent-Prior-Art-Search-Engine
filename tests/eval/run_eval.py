import csv
import datetime
import os
import uuid

from backend.app.db.models import EvaluationRecord
from backend.app.db.session import SessionLocal
from tests.eval.harness import EvaluationHarness


def main():
    print("=" * 60)
    print("RUNNING SCIENTIFIC RETRIEVAL BENCHMARK & ABLATION EXPERIMENTS")
    print("=" * 60)

    harness = EvaluationHarness()
    results = harness.run_ablation_benchmark("eval/benchmark_dataset.json")

    run_name = f"ablation-run-{datetime.datetime.now().strftime('%Y%m%d-%H%M')}"
    print(f"\nRun Name: {run_name}")
    print("-" * 60)
    print(f"{'System':<16} | {'P@5':<8} | {'R@5':<8} | {'MRR':<8} | {'nDCG@5':<8}")
    print("-" * 60)

    os.makedirs("eval/results", exist_ok=True)
    csv_rows = []

    db = SessionLocal()
    try:
        for sys_name, m in results.items():
            print(f"{sys_name:<16} | {m['P@5']:<8.4f} | {m['R@5']:<8.4f} | {m['MRR']:<8.4f} | {m['nDCG@5']:<8.4f}")
            csv_rows.append([sys_name, f"{m['P@5']:.2f}", f"{m['R@5']:.2f}", f"{m['MRR']:.2f}", f"{m['nDCG@5']:.2f}"])

            rec = EvaluationRecord(
                id=str(uuid.uuid4()),
                run_name=run_name,
                dataset_name="Multi-Domain Benchmark v2.0",
                system_type=sys_name,
                p_at_5=m["P@5"],
                r_at_5=m["R@5"],
                mrr=m["MRR"],
                ndcg_at_5=m["nDCG@5"],
                execution_metadata={"dataset_path": "eval/benchmark_dataset.json"},
            )
            db.add(rec)
        db.commit()
    finally:
        db.close()

    # Write versioned lift table
    csv_path = "eval/results/lift_table.csv"
    with open(csv_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["System", "P@5", "R@5", "MRR", "nDCG@5"])
        writer.writerows(csv_rows)

    # Also keep tests/eval/results/lift_table.csv updated
    os.makedirs("tests/eval/results", exist_ok=True)
    with open("tests/eval/results/lift_table.csv", "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["System", "P@5", "R@5", "MRR", "nDCG@5"])
        writer.writerows(csv_rows)

    print("-" * 60)
    print(f"Evaluation complete. Results written to {csv_path} and relational database.")


if __name__ == "__main__":
    main()
