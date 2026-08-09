#!/bin/bash
# push-changes — commit all changes and push to Base44
# Usage: bash push-changes [commit message]

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

COMMIT_MSG="${1:-Auto-update: Haven app changes}"

echo "=== PUSHING CHANGES TO BASE44 ==="

# 1. Add all changes
echo "→ Staging changes..."
git add -A

# 2. Commit (does nothing if nothing changed)
if git diff --cached --quiet; then
  echo "✓ No changes to commit."
else
  git commit -m "$COMMIT_MSG"
  echo "✓ Committed: $COMMIT_MSG"
fi

# 3. Push to GitHub
echo "→ Pushing to GitHub..."
git push origin main
echo "✓ Pushed to github.com/byadmo/haven"

# 4. Open the Base44 dashboard so you can publish
echo "→ Opening Base44 dashboard..."
echo "  URL: https://app.base44.com/apps/6a6ff469f9cfad6a3f8fdc66/editor/workspace/overview"
echo ""
echo "Go to the dashboard and click 'Publish' to deploy."

# 5. Give you a quick status
echo ""
echo "=== DONE ==="
echo "Git: $(git rev-parse --short HEAD)"
echo "Changes committed: $(git rev-list --count HEAD)"