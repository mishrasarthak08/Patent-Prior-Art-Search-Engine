import requests
import json
import time

BASE_URL = "http://localhost:8000"
API_KEY = "dev_key"
HEADERS = {"X-API-Key": API_KEY, "Content-Type": "application/json"}

print("Testing /health...")
r = requests.get(f"{BASE_URL}/health")
print(f"Status: {r.status_code}")

print("\nTesting /ready...")
r = requests.get(f"{BASE_URL}/ready")
print(f"Status: {r.status_code}")

print("\nTesting /eval/latest with API key...")
r = requests.get(f"{BASE_URL}/eval/latest", headers=HEADERS)
print(f"Status: {r.status_code}")
if r.status_code == 200:
    print(json.dumps(r.json(), indent=2))
else:
    print(r.text)

print("\nTesting /eval/latest without API key...")
r = requests.get(f"{BASE_URL}/eval/latest")
print(f"Status: {r.status_code} (Expected 401)")

print("\nTesting /search empty payload...")
r = requests.post(f"{BASE_URL}/search", json={"raw_claim": ""}, headers=HEADERS)
print(f"Status: {r.status_code} (Expected 422)")

print("\nTesting /search large payload...")
r = requests.post(f"{BASE_URL}/search", json={"raw_claim": "A" * 15000}, headers=HEADERS)
print(f"Status: {r.status_code} (Expected 422)")

print("\nTesting /search valid payload...")
payload = {"raw_claim": "A method for machine learning using a neural network comprising a convolutional layer and a pooling layer."}
r = requests.post(f"{BASE_URL}/search", json=payload, headers=HEADERS)
print(f"Status: {r.status_code}")
if r.status_code == 200:
    data = r.json()
    print("Decomposed Claim:", data.get("query_claim"))
    print(f"Results Count: {len(data.get('results', []))}")
    if data.get("results"):
        print("First result score:", data["results"][0].get("fused_score"))
else:
    print(r.text)

print("\nTesting rate limiting... (Sending 6 requests)")
for i in range(6):
    r = requests.post(f"{BASE_URL}/search", json={"raw_claim": f"Test claim {i}"}, headers=HEADERS)
    print(f"Req {i+1} Status: {r.status_code}")
    if r.status_code == 429:
        print("Rate limit exceeded successfully caught.")
