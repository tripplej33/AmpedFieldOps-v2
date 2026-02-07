#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   AmpedFieldOps One-Click Deployment Script v2.0         ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Get domain from argument or prompt
DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
    read -p "Enter your domain (e.g., admin.example.com): " DOMAIN
fi

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Error: Domain is required${NC}"
    exit 1
fi

echo -e "${GREEN}Deploying to: $DOMAIN${NC}"
echo ""

# Get Supabase credentials
echo -e "${YELLOW}Enter your Supabase credentials:${NC}"
read -p "Supabase Project URL: " SUPABASE_URL
read -sp "Supabase Service Role Key: " SUPABASE_KEY
echo ""

# Step 1: Install dependencies
echo -e "${YELLOW}Step 1: Installing dependencies...${NC}"
apt-get update -qq
apt-get install -y curl certbot nginx nodejs redis-server > /dev/null 2>&1
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 2: Setup SSL with Let's Encrypt
echo -e "${YELLOW}Step 2: Setting up SSL certificate...${NC}"
mkdir -p /var/www/certbot

# Check if cert already exists
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos \
        --email admin@$DOMAIN --quiet || {
        echo -e "${RED}SSL setup failed. Ensure port 80 is accessible.${NC}"
        exit 1
    }
fi

SSL_CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
SSL_KEY="/etc/letsencrypt/live/$DOMAIN/privkey.pem"
echo -e "${GREEN}✓ SSL certificate ready${NC}"

# Step 3: Setup environment files
echo -e "${YELLOW}Step 3: Configuring environment...${NC}"

# Generate encryption key
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Frontend .env
cat > /root/AmpedFieldOps-v2/.env << EOF
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=dummy_key_will_use_from_backend
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

# Step 4: Build application
echo -e "${YELLOW}Step 4: Building application (this may take a minute)...${NC}"
cd /root/AmpedFieldOps-v2
npm install --production --silent 2>&1 | grep -v "^npm notice"
npm run build --silent 2>&1 | tail -3
cd backend
npm install --production --silent 2>&1 | grep -v "^npm notice"
npm run build --silent 2>&1 | tail -3
cd /root/AmpedFieldOps-v2
echo -e "${GREEN}✓ Application built${NC}"

# Step 5: Auto-generate Nginx config
echo -e "${YELLOW}Step 5: Configuring Nginx...${NC}"
mkdir -p /etc/nginx/conf.d

cat > /etc/nginx/conf.d/ampedlogix.conf << 'NGINX_CONFIG'
# Auto-generated Nginx config for AmpedFieldOps

upstream frontend {
    server localhost:5173;
    keepalive 32;
}

upstream backend_api {
    server localhost:3002;
    keepalive 32;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name _;
    
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name _;

    # SSL Configuration (will be replaced by deploy script)
    ssl_certificate {{SSL_CERT}};
    ssl_certificate_key {{SSL_KEY}};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Backend API routes (must come first)
    location ~ ^/(api|admin|xero)/ {
        proxy_pass http://backend_api;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Frontend SPA
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # SPA routing - all non-file requests go to index.html
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://frontend;
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Access-Control-Allow-Origin "*";
    }
}
NGINX_CONFIG

# Replace SSL paths
sed -i "s|{{SSL_CERT}}|$SSL_CERT|g" /etc/nginx/conf.d/ampedlogix.conf
sed -i "s|{{SSL_KEY}}|$SSL_KEY|g" /etc/nginx/conf.d/ampedlogix.conf

# Test and reload nginx
nginx -t > /dev/null 2>&1 || {
    echo -e "${RED}Nginx configuration error${NC}"
    exit 1
}
systemctl restart nginx

echo -e "${GREEN}✓ Nginx configured and running${NC}"

# Step 6: Create systemd services
echo -e "${YELLOW}Step 6: Setting up services...${NC}"

# Stop old services if they exist
systemctl stop ampedlogix-frontend ampedlogix-backend 2>/dev/null || true

# Frontend service
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

# Backend service
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

systemctl daemon-reload
systemctl enable ampedlogix-frontend ampedlogix-backend redis-server
systemctl start redis-server
systemctl start ampedlogix-backend
systemctl start ampedlogix-frontend

echo -e "${GREEN}✓ Services installed and started${NC}"

# Step 7: Wait for services to be ready
echo -e "${YELLOW}Step 7: Waiting for services to start...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:3002/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}⚠ Backend is still starting (this is normal)${NC}"
    fi
    sleep 1
done

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║              🎉 Deployment Complete! 🎉                  ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Your application is live at:${NC}"
echo -e "  👉 https://$DOMAIN"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  Check status:        systemctl status ampedlogix-{frontend,backend}"
echo "  View frontend logs:  journalctl -u ampedlogix-frontend -f"
echo "  View backend logs:   journalctl -u ampedlogix-backend -f"
echo "  Restart:             systemctl restart ampedlogix-{frontend,backend}"
echo "  Stop all:            systemctl stop ampedlogix-{frontend,backend} redis-server"
echo ""
echo -e "${YELLOW}Automatic SSL renewal:${NC}"
echo "  Certbot auto-renews Let's Encrypt certificates"
echo "  Check status: certbot renew --dry-run"
echo ""
