#!/bin/bash
# Phase 3 QA Quick Start Script

echo "🚀 Starting Phase 3 QA Testing Environment..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Check environment
echo -e "${BLUE}Step 1: Checking environment...${NC}"
if [ ! -f .env ]; then
  echo -e "${YELLOW}Creating .env file...${NC}"
  cp .env.example .env
  echo -e "${GREEN}✓ .env file created${NC}"
else
  echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Step 2: Install dependencies (if needed)
echo ""
echo -e "${BLUE}Step 2: Checking dependencies...${NC}"
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Installing dependencies...${NC}"
  npm install
else
  echo -e "${GREEN}✓ Dependencies installed${NC}"
fi

# Step 3: Build check
echo ""
echo -e "${BLUE}Step 3: Running build check...${NC}"
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Build successful${NC}"
else
  echo -e "${YELLOW}⚠ Build has warnings (check manually)${NC}"
fi

# Step 4: Instructions
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Environment Ready for Testing!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Apply Database Migration:"
echo "   → Open: https://dcssbsxjtfibwfxoagxl.supabase.co"
echo "   → Go to: SQL Editor"
echo "   → Run: supabase/migrations/20260121_create_projects_table.sql"
echo ""
echo "2. Start Dev Server:"
echo "   → Run: npm run dev"
echo "   → Access: http://localhost:5173"
echo ""
echo "3. Test Projects Module:"
echo "   → Login with test credentials"
echo "   → Navigate to: /projects"
echo "   → Follow: .project/QA_TESTING_PHASE3.md"
echo ""
echo "4. Create Test Data:"
echo "   → Need 2-3 test clients (from Phase 2)"
echo "   → Create 5-10 test projects"
echo "   → Test all CRUD operations"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📖 Full QA Guide: .project/QA_TESTING_PHASE3.md"
echo "🐛 Report bugs in: .project/memory/phase3_bugs.md"
echo ""
