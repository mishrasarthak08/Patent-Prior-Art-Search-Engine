#!/bin/bash
set -e

echo "Running smoke test..."

# Wait for backend to be ready
max_retries=15
retry_count=0
echo "Waiting for /health endpoint..."
while ! curl -s -f http://localhost:8000/health > /dev/null; do
    retry_count=$((retry_count+1))
    if [ $retry_count -ge $max_retries ]; then
        echo "Backend failed to start"
        exit 1
    fi
    echo "Waiting for backend..."
    sleep 2
done

echo "Backend is healthy."

# Check ready endpoint (checks Qdrant)
echo "Waiting for /ready endpoint..."
retry_count=0
while ! curl -s -f http://localhost:8000/ready > /dev/null; do
    retry_count=$((retry_count+1))
    if [ $retry_count -ge $max_retries ]; then
        echo "Backend /ready failed (Qdrant might be down)"
        exit 1
    fi
    echo "Waiting for Qdrant via backend..."
    sleep 2
done

echo "Backend and Qdrant are ready."

echo "Testing /search endpoint..."
# Hit search endpoint
RESPONSE=$(curl -s -X POST http://localhost:8000/search \
     -H "Content-Type: application/json" \
     -H "X-API-Key: dev_key" \
     -d '{"raw_claim": "A method for transmitting data comprising: generating a packet and sending it over a wireless network."}')

if echo "$RESPONSE" | grep -q "disclaimer"; then
    echo "Search endpoint responded successfully."
else
    echo "Search endpoint failed or returned unexpected response."
    echo "Response: $RESPONSE"
    exit 1
fi

echo "Smoke test passed successfully."
