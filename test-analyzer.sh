#!/bin/bash

echo "🚀 Testing Code Analyzer Backend..."

# Test with a simple repository
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "https://github.com/tarunraghav11/code-analyzer-backend"
  }' \
  --output test-analysis.pdf

if [ $? -eq 0 ]; then
    echo "✅ Analysis completed successfully!"
    echo "📄 PDF saved as test-analysis.pdf"
    ls -la test-analysis.pdf
else
    echo "❌ Analysis failed"
fi
