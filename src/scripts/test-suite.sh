#!/bin/bash
# Run all three streamlined test scenarios
# Usage: npm run test:all

echo "🧪 Running Streamlined Bridge Tests"
echo "=================================="
echo ""

# Run autonomous Bridge test
echo "1️⃣ Running AUTONOMOUS-BRIDGE test (Claude decides whether to use Bridge)..."
npm run test:bridge autonomous-bridge
echo ""
echo "=================================="
echo ""

# Run conversation with Bridge
echo "2️⃣ Running WITH-BRIDGE test (Bridge tools available)..."
npm run test:bridge with-bridge
echo ""
echo "=================================="
echo ""

# Run conversation without Bridge
echo "3️⃣ Running WITHOUT-BRIDGE test (no Bridge tools)..."
npm run test:bridge without-bridge
echo ""
echo "=================================="
echo ""

echo "✅ All tests completed!"