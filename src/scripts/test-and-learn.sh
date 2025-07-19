#!/bin/bash
# Run all tests and then analyze with learning loop
# Usage: npm run test:all

echo "🧪 Running All Bridge Tests and Learning Loop"
echo "============================================="
echo ""

# Run the bridge tests
npm run test:bridge

echo ""
echo "🔄 Running learning loop to analyze results..."
echo "============================================="
npm run loop