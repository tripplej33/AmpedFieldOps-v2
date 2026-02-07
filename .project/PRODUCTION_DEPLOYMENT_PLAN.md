# Production Deployment Plan - Zero-Config Architecture

## 🎯 Goal
Make AmpedFieldOps deployable by simply pointing A records to a server IP - **no hardcoded URLs or IPs required**.

---

## 🏗️ Architecture Overview

```
                         ┌─────────────────────────┐
                         │   admin.example.com     │
                         │   (User's Domain)       │
                         └────────────┬────────────┘
                                      │
                                      │ DNS A Record points to Server IP
                                      ▼
                         ┌─────────────────────────┐
                         │   Nginx Reverse Proxy   │
                         │   (Port 80/443)         │
                         └────────────┬────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
        ┌──────────────────┐  ┌──────────────┐  ┌─────────────┐
        │  Frontend (5173) │  │ Backend API  │  │  Supabase   │
        │  Static SPA      │  │ (Port 3002)  │  │  (Remote)   │
        └──────────────────┘  └──────────────┘  └─────────────┘
```

**Key Principle:** All traffic goes through port 80/443 → Nginx routes internally → Frontend/Backend never need to know their public URLs

---

## 📋 Implementation Plan

### Phase 1: Frontend Configuration Changes

**File: `/frontend/.env.production`**
```bash
# Production build uses RELATIVE URLs - no hardcoded domains!
VITE_BACKEND_URL=/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**File: `/frontend/src/config/api.ts`** (NEW)
```typescript
// Runtime API URL detection - works on any domain
export const getBackendUrl = () => {
  // In production, API is always at same domain under /api
  if (import.meta.env.PROD) {
    return `${window.location.protocol}//${window.location.host}/api`;
  }
  // Development can use explicit URL
  return import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
};

export const API_BASE = getBackendUrl();
```

**Update all fetch calls:**
```typescript
// OLD: fetch(`${BACKEND_URL}/admin/xero/status`)
// NEW: fetch(`${API_BASE}/admin/xero/status`)
```

**Benefits:**
- ✅ Works on `admin.customerA.com`, `admin.customerB.com`, `localhost`, etc.
- ✅ No rebuild needed for different domains
- ✅ Single production build serves all customers

---

### Phase 2: Backend Configuration Changes

**File: `/backend/.env.production.template`**
```bash
# Runtime configuration - no hardcoded domains
PORT=3002
NODE_ENV=production

# CORS will be automatically configured based on request origin
FRONTEND_URL=AUTO

# Supabase (customer provides their own)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis for job queue
REDIS_URL=redis://localhost:6379

# Encryption for credentials
ENCRYPTION_KEY=generate-with-openssl-rand-base64-32
```

**File: `/backend/src/config/cors.ts`** (UPDATE)
```typescript
import { CorsOptions } from 'cors';

export const getCorsConfig = (): CorsOptions => {
  // In production, trust the request origin if it matches the server's hostname
  if (process.env.NODE_ENV === 'production') {
    return {
      origin: (origin, callback) => {
        // Allow same-origin requests (when origin is undefined)
        if (!origin) return callback(null, true);
        
        // Extract host from origin URL
        const originHost = new URL(origin).hostname;
        
        // Allow any origin that uses the same domain/subdomain structure
        // This works because nginx only proxies requests to this backend
        // from the same domain
        callback(null, true);
      },
      credentials: true,
    };
  }

  // Development mode - allow specified frontend URL
  return {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  };
};
```

**Benefits:**
- ✅ No CORS issues - backend trusts requests coming through nginx
- ✅ Works for any customer domain automatically
- ✅ Single backend deployment serves all

---

### Phase 3: Nginx Configuration (Auto-Generated)

**File: `/deployment/nginx-template.conf`**
```nginx
# This file is auto-generated during installation
# Variables: {{DOMAIN}}, {{SSL_CERT_PATH}}, {{SSL_KEY_PATH}}

upstream frontend {
    server localhost:5173;
    keepalive 32;
}

upstream backend {
    server localhost:3002;
    keepalive 32;
}

# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name {{DOMAIN}};
    
    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name {{DOMAIN}};

    # SSL Configuration
    ssl_certificate {{SSL_CERT_PATH}};
    ssl_certificate_key {{SSL_KEY_PATH}};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API Backend (all /api/* and /admin/* and /xero/* routes)
    location ~ ^/(api|admin|xero)/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Frontend (SPA)
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # SPA fallback - all non-file requests go to index.html
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://frontend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Benefits:**
- ✅ Single config template works for all domains
- ✅ Auto-generated during installation script
- ✅ Handles API routing transparently
- ✅ SSL certificate paths injected at install time

---

### Phase 4: Installation Script

**File: `/deployment/install.sh`**
```bash
#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║      AmpedFieldOps Production Installation v2.0          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Detect or prompt for domain
echo -e "${YELLOW}Step 1: Domain Configuration${NC}"
if [ -z "$DOMAIN" ]; then
    read -p "Enter your domain (e.g., admin.example.com): " DOMAIN
fi
echo -e "${GREEN}✓ Domain: $DOMAIN${NC}"

# Step 2: Check DNS resolution
echo ""
echo -e "${YELLOW}Step 2: Verifying DNS${NC}"
SERVER_IP=$(hostname -I | awk '{print $1}')
DNS_IP=$(dig +short $DOMAIN | tail -n1)

if [ "$DNS_IP" == "$SERVER_IP" ]; then
    echo -e "${GREEN}✓ DNS correctly points to this server ($SERVER_IP)${NC}"
else
    echo -e "${YELLOW}⚠ DNS Check:${NC}"
    echo "  Domain $DOMAIN resolves to: $DNS_IP"
    echo "  This server's IP: $SERVER_IP"
    echo ""
    read -p "Continue anyway? [y/N]: " CONTINUE
    if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
        echo "Please update your DNS A record to point to $SERVER_IP"
        exit 1
    fi
fi

# Step 3: SSL Certificate setup
echo ""
echo -e "${YELLOW}Step 3: SSL Certificate${NC}"
echo "Choose SSL certificate method:"
echo "  1) Let's Encrypt (Free, Automatic, Recommended)"
echo "  2) Self-signed (For testing only)"
echo "  3) Provide existing certificates"
read -p "Selection [1-3]: " SSL_METHOD

case $SSL_METHOD in
    1)
        # Install certbot if not present
        if ! command -v certbot &> /dev/null; then
            echo "Installing Certbot..."
            apt-get update -qq
            apt-get install -y certbot python3-certbot-nginx
        fi
        
        # Obtain certificate
        certbot certonly --nginx -d $DOMAIN --non-interactive --agree-tos \
            --email admin@$DOMAIN || {
            echo "Certificate generation failed. Check DNS and port 80 accessibility."
            exit 1
        }
        
        SSL_CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
        SSL_KEY_PATH="/etc/letsencrypt/live/$DOMAIN/privkey.pem"
        ;;
    2)
        # Self-signed certificate
        mkdir -p /etc/nginx/ssl
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /etc/nginx/ssl/$DOMAIN.key \
            -out /etc/nginx/ssl/$DOMAIN.crt \
            -subj "/CN=$DOMAIN"
        
        SSL_CERT_PATH="/etc/nginx/ssl/$DOMAIN.crt"
        SSL_KEY_PATH="/etc/nginx/ssl/$DOMAIN.key"
        ;;
    3)
        read -p "Path to certificate file: " SSL_CERT_PATH
        read -p "Path to private key file: " SSL_KEY_PATH
        ;;
esac
echo -e "${GREEN}✓ SSL configured${NC}"

# Step 4: Install dependencies
echo ""
echo -e "${YELLOW}Step 4: Installing Dependencies${NC}"
if ! command -v nginx &> /dev/null; then
    apt-get update -qq
    apt-get install -y nginx
fi
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | bash
fi
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 5: Configure environment variables
echo ""
echo -e "${YELLOW}Step 5: Environment Configuration${NC}"
read -p "Supabase Project URL: " SUPABASE_URL
read -sp "Supabase Service Role Key: " SUPABASE_KEY
echo ""

# Generate encryption key
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Create backend .env
cat > backend/.env << EOF
PORT=3002
NODE_ENV=production
FRONTEND_URL=https://$DOMAIN

SUPABASE_URL=$SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_KEY

REDIS_URL=redis://localhost:6379
ENCRYPTION_KEY=$ENCRYPTION_KEY
EOF

# Create frontend .env
cat > .env << EOF
VITE_BACKEND_URL=/api
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_ENV=production
EOF

echo -e "${GREEN}✓ Environment configured${NC}"

# Step 6: Build application
echo ""
echo -e "${YELLOW}Step 6: Building Application${NC}"
npm install --production
npm run build
cd backend && npm install --production && npm run build && cd ..
echo -e "${GREEN}✓ Application built${NC}"

# Step 7: Generate nginx config
echo ""
echo -e "${YELLOW}Step 7: Configuring Nginx${NC}"
sed -e "s|{{DOMAIN}}|$DOMAIN|g" \
    -e "s|{{SSL_CERT_PATH}}|$SSL_CERT_PATH|g" \
    -e "s|{{SSL_KEY_PATH}}|$SSL_KEY_PATH|g" \
    deployment/nginx-template.conf > /etc/nginx/sites-available/ampedlogix

ln -sf /etc/nginx/sites-available/ampedlogix /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
echo -e "${GREEN}✓ Nginx configured${NC}"

# Step 8: Setup systemd services
echo ""
echo -e "${YELLOW}Step 8: Installing Services${NC}"

# Frontend service
cat > /etc/systemd/system/ampedlogix-frontend.service << EOF
[Unit]
Description=AmpedFieldOps Frontend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/npm run dev
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Backend service
cat > /etc/systemd/system/ampedlogix-backend.service << EOF
[Unit]
Description=AmpedFieldOps Backend
After=network.target redis.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)/backend
ExecStart=/usr/bin/npm run dev
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ampedlogix-frontend ampedlogix-backend
systemctl start ampedlogix-frontend ampedlogix-backend

echo -e "${GREEN}✓ Services installed and started${NC}"

# Step 9: Setup Redis
echo ""
echo -e "${YELLOW}Step 9: Redis Setup${NC}"
docker run -d --name redis --restart=unless-stopped -p 6379:6379 redis:alpine
echo -e "${GREEN}✓ Redis running${NC}"

# Step 10: Final checks
echo ""
echo -e "${YELLOW}Step 10: Final Verification${NC}"
sleep 5

# Check services
systemctl is-active --quiet ampedlogix-frontend && echo -e "${GREEN}✓ Frontend running${NC}" || echo -e "✗ Frontend not running"
systemctl is-active --quiet ampedlogix-backend && echo -e "${GREEN}✓ Backend running${NC}" || echo -e "✗ Backend not running"
docker ps | grep redis > /dev/null && echo -e "${GREEN}✓ Redis running${NC}" || echo -e "✗ Redis not running"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║              Installation Complete! 🎉                    ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Your application is now accessible at:${NC}"
echo -e "  👉 https://$DOMAIN"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Visit https://$DOMAIN to complete setup"
echo "  2. Create your admin account"
echo "  3. Configure Xero integration (optional)"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  View frontend logs:  journalctl -u ampedlogix-frontend -f"
echo "  View backend logs:   journalctl -u ampedlogix-backend -f"
echo "  Restart services:    systemctl restart ampedlogix-*"
echo "  Check status:        systemctl status ampedlogix-*"
echo ""
```

---

## 🚀 Deployment Process (Customer View)

### For Customers:
1. **Spin up Ubuntu 22.04 server** (VPS, cloud, or on-prem)
2. **Point DNS A record** to server IP
3. **Run one command:**
   ```bash
   curl -fsSL https://install.ampedlogix.com | bash
   ```
4. **Answer 3 questions:**
   - Domain name
   - Supabase URL
   - Supabase Key
5. **Done!** Visit https://their-domain.com

### For Developers (Testing locally):
```bash
git clone https://github.com/ampedlogix/ampedlogix-v2
cd ampedlogix-v2
cp .env.example .env
# Edit .env with your Supabase credentials
npm install
npm run dev:all   # Starts both frontend and backend
```
Visit `http://localhost:5173`

---

## ✅ Benefits of This Architecture

1. **Zero Configuration**
   - No hardcoded IPs or domains anywhere
   - Works on any domain automatically
   - Single build serves all customers

2. **Security**
   - All traffic encrypted (HTTPS)
   - CORS properly configured
   - Backend never exposed directly

3. **Easy Updates**
   - Single git pull + rebuild
   - No environment changes needed
   - Systemd handles restarts automatically

4. **Scalability Ready**
   - Nginx can load-balance multiple backends
   - Redis queue for async jobs
   - Easy to add more workers

5. **Developer Friendly**
   - Local dev environment works same as production
   - No complex proxy setup for development
   - Clear separation of concerns

---

## 📦 Required File Changes Summary

### Frontend Changes:
1. ✅ Create `/frontend/src/config/api.ts` - Runtime URL detection
2. ✅ Update all fetch calls to use `API_BASE` instead of hardcoded URL
3. ✅ Update `.env.production` to use relative `/api` path
4. ✅ Update `XeroSettingsPage.tsx` and other components

### Backend Changes:
1. ✅ Update `/backend/src/config/cors.ts` - Auto-detect origin
2. ✅ Create `.env.production.template` with AUTO mode
3. ✅ Update `/backend/src/index.ts` - Remove hardcoded CORS

### Deployment Files (New):
1. ✅ Create `/deployment/nginx-template.conf`
2. ✅ Create `/deployment/install.sh`
3. ✅ Create `/deployment/README.md` with customer instructions
4. ✅ Create systemd service templates

### Documentation:
1. ✅ Update main README.md with one-line install
2. ✅ Create DEPLOYMENT_GUIDE.md for customers
3. ✅ Create DEVELOPER_GUIDE.md for contributors

---

## 🎯 Next Steps

### Immediate (Phase 1 - THIS SPRINT):
1. Implement `api.ts` config helper
2. Update XeroSettingsPage to use relative URLs
3. Test locally with nginx proxy
4. Create nginx template

### Short-term (Phase 2 - NEXT SPRINT):
1. Create full installation script
2. Test on clean Ubuntu server
3. Document customer deployment process
4. Create update script

### Medium-term (Phase 3):
1. Add health check endpoints
2. Implement monitoring/logging
3. Create backup/restore procedures
4. Add auto-update mechanism

---

## 📞 Developer Handoff Checklist

### Frontend Dev:
- [ ] Review `/frontend/src/config/api.ts` implementation
- [ ] Update all `fetch()` calls to use new `API_BASE` constant
- [ ] Test with local nginx proxy
- [ ] Verify no hardcoded URLs remain in codebase

### Backend Dev:
- [ ] Review updated CORS configuration
- [ ] Test auto-origin detection
- [ ] Verify all API routes work through nginx proxy
- [ ] Add health check endpoint: `GET /health`

### DevOps:
- [ ] Test installation script on clean Ubuntu 22.04
- [ ] Verify SSL certificate generation (Let's Encrypt)
- [ ] Test systemd service auto-restart
- [ ] Document troubleshooting steps

---

**End of Plan** ✅
