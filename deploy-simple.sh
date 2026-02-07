#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Setting up AmpedFieldOps...${NC}"

# Get domain
DOMAIN="${1:-admin.ampedlogix.com}"
SUPABASE_URL="${2:-https://dcssbsxjtfibwfxoagxl.supabase.co}"
SUPABASE_KEY="${3:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjc3Nic3hqdGZpYndmeG9hZ3hsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODUyOTk0NSwiZXhwIjoyMDg0MTA1OTQ1fQ.t2e3QIeyrY020ld3IpdCA8fQTLFA0kdAmGzCWe7A-tk}"

# Setup environment files
echo -e "${YELLOW}Configuring environment...${NC}"

ENCRYPTION_KEY=$(openssl rand -base64 32)

# Frontend .env
cat > /root/AmpedFieldOps-v2/.env << EOF
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=dummy
VITE_BACKEND_URL=/api
VITE_ENV=production
EOF

# Backend .env
cat > /root/AmpedFieldOps-v2/backend/.env << EOF
PORT=3002
NODE_ENV=production
FRONTEND_URL=https://$DOMAIN

SUPABASE_URL=$SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_KEY

REDIS_URL=redis://localhost:6379
ENCRYPTION_KEY=$ENCRYPTION_KEY
EOF

echo -e "${GREEN}✓ Environment configured${NC}"

# Build
echo -e "${YELLOW}Building frontend...${NC}"
cd /root/AmpedFieldOps-v2
npm run build --silent 2>&1 | tail -2
echo -e "${GREEN}✓ Built${NC}"

# Setup systemd services
echo -e "${YELLOW}Setting up services...${NC}"

systemctl stop ampedlogix-backend 2>/dev/null || true
systemctl stop ampedlogix-frontend 2>/dev/null || true

cat > /etc/systemd/system/ampedlogix-backend.service << EOF
[Unit]
Description=AmpedFieldOps Backend
After=network.target redis-server.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/AmpedFieldOps-v2/backend
ExecStart=/usr/bin/npm run dev
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/ampedlogix-frontend.service << EOF
[Unit]
Description=AmpedFieldOps Frontend
After=network.target
Wants=ampedlogix-backend.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/AmpedFieldOps-v2
ExecStart=/usr/bin/npm run dev
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ampedlogix-backend ampedlogix-frontend redis-server
systemctl start redis-server
systemctl start ampedlogix-backend
systemctl start ampedlogix-frontend

echo -e "${GREEN}✓ Services started${NC}"

# Configure nginx routes (assuming NPM is already running)
echo -e "${YELLOW}Configuring Nginx Proxy Manager routes...${NC}"
echo ""
echo "NPM should already be running. If not accessed yet:"
echo "  Visit: http://localhost:81"
echo ""
echo "To route API requests to backend, add these Custom Locations:"
echo ""
echo "Location 1:"
echo "  Path: ^~ /api"
echo "  Forward to: http://localhost:3002"
echo ""
echo "Location 2:"
echo "  Path: ^~ /admin"
echo "  Forward to: http://localhost:3002"
echo ""
echo "Location 3:"
echo "  Path: ^~ /xero"
echo "  Forward to: http://localhost:3002"
echo ""

# Wait for services
echo -e "${YELLOW}Waiting for services...${NC}"
sleep 3
for i in {1..15}; do
    if curl -s http://localhost:3002/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend ready${NC}"
        break
    fi
    sleep 1
done

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║              ✅ Setup Complete!                          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Visit: https://$DOMAIN/app/settings/xero"
echo ""
echo "If you get 502 errors, manually add the custom locations in NPM:"
echo "  http://localhost:81"
echo ""
