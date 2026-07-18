import os
import json
import csv
from eval.harness import EvaluationHarness

def generate_synthetic_data():
    queries = [
        {"query_id": "q1", "claim_text": "A device comprising a processor, a memory, and a display."},
        {"query_id": "q2", "claim_text": "A method for transmitting data securely over a network using RSA."}
    ]
    gold_set = {
        "q1": ["SYNTH_DOC_1"], # We'll just assume this exists or use a metric baseline of 0 for smoke test
        "q2": ["SYNTH_DOC_2"]
    }
    return queries, gold_set

def main():
    print("Initializing Evaluation Harness...")
    harness = EvaluationHarness()
    
    gold_set_path = "eval/gold_set.json"
    if not os.path.exists(gold_set_path):
        print("No gold set found. Using synthetic data for smoke test...")
        queries, gold = generate_synthetic_data()
    else:
        with open("eval/queries.json", "r") as f:
            queries = json.load(f)
        with open(gold_set_path, "r") as f:
            gold = json.load(f)
            
    print("Running evaluation (this may take a few minutes if real LLMs are invoked)...")
    try:
        agg_results = harness.evaluate(queries, gold)
        
        # Write lift table
        os.makedirs("eval/results", exist_ok=True)
        with open("eval/results/lift_table.csv", "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["System", "P@5", "R@5", "MRR", "nDCG@5"])
            for sys_name in ["baseline", "hybrid", "full"]:
                metrics = agg_results.get(sys_name, {"P@5":0, "R@5":0, "MRR":0, "nDCG@5":0})
                writer.writerow([sys_name, metrics["P@5"], metrics["R@5"], metrics["MRR"], metrics["nDCG@5"]])
                
        print("Evaluation complete. Results written to eval/results/lift_table.csv")
    except Exception as e:
        print(f"Evaluation failed: {e}")

if __name__ == "__main__":
    main()
