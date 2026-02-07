# V2 Deployment Status - January 28, 2026

## Session Summary
**Date:** January 28, 2026 | **Time:** 09:22 - 09:30 UTC
**Issue:** Port 81 not loading for v2 application
**Status:** ✅ Port 81 now serving frontend + backend proxies

---

## What We Fixed Today

### 1. Port 81 Access Issue
**Problem:** User reported `192.168.1.124:81` not loading anything
**Root Cause:** No Nginx reverse proxy listening on port 81; v1 Docker containers were running instead of v2 services

**Solution Implemented:**
- Created Nginx config at `/etc/nginx/sites-enabled/v2-app` to proxy:
  - `/` → Vite dev server on port 5173 (frontend)
  - `/api/` → Backend on port 3002
  - `/admin/` → Backend on port 3002
  - `/xero/` → Backend on port 3002
- Restarted Nginx and verified port 81 now listening ✅

### 2. V2 Services Status
**Frontend Service:** ✅ Running via systemd
- Service: `ampedlogix-frontend.service`
- Process: `npm run dev`
- Port: 5173
- Status: Active and serving

**Backend Service:** ⚠️ Running but with Redis connection issues
- Service: `ampedlogix-backend.service`
- Process: `npm run dev`
- Port: 3002
- Status: Active but failing to connect to Redis

### 3. Environment Configuration
**Frontend `.env` (v2 root):**
```
VITE_SUPABASE_URL=https://dcssbsxjtfibwfxoagxl.supabase.co
VITE_SUPABASE_ANON_KEY=dummy
VITE_BACKEND_URL=/api
VITE_ENV=production
```
✅ Correct - uses relative URL `/api` for production-agnostic deployment

**Backend `.env` (v2/backend):**
```
PORT=3002
NODE_ENV=production
FRONTEND_URL=https://admin.ampedlogix.com
SUPABASE_URL=https://dcssbsxjtfibwfxoagxl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
REDIS_URL=redis://localhost:6379
ENCRYPTION_KEY=nbl2a051zEvbRA9VMWeEPNEqU+eVZVKnT0vVzBSgVys=
```
✅ Correct - all credentials loaded

---

## Current Issues Blocking Full Functionality

### 🔴 Critical: Redis Connection Failed
**Issue:** Backend service cannot connect to `localhost:6379`

**Status:**
- Multiple Redis containers were conflicting on port 6379
- Attempted to clean up and restart Redis from v1 docker-compose
- Redis container started but `redis-cli ping` fails (connection refused)

**What Needs to Happen:**
1. Verify Redis is actually listening on port 6379
2. Ensure v2 backend can reach it (may need to use Docker network or TCP instead of localhost)
3. Restart `ampedlogix-backend` service once Redis is accessible

**Container Names:**
- `ampedfieldops-redis` (from v1 docker-compose) - supposed to provide Redis for v2 backend
- `ampedfieldops-ocr` (OCR service, running on 8000)

### Port Status:
```
Port 81:   ✅ Nginx proxy listening
Port 3002: ✅ Backend service listening (but error state due to Redis)
Port 5173: ✅ Frontend dev server listening
Port 6379: ❌ Redis not accessible from localhost
```

---

## Nginx Configuration Deployed

**File:** `/etc/nginx/sites-enabled/v2-app`

```nginx
server {
    listen 81;
    server_name _;
    client_max_body_size 100M;

    # Frontend (Vite dev server on 5173)
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API routes
    location /api/ {
        proxy_pass http://localhost:3002/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /admin/ {
        proxy_pass http://localhost:3002/admin/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /xero/ {
        proxy_pass http://localhost:3002/xero/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Services and Systemd Files

### Backend Service: `/etc/systemd/system/ampedlogix-backend.service`
```
[Unit]
Description=AmpedFieldOps Backend
After=network.target redis.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/AmpedFieldOps-v2/backend
ExecStart=/usr/bin/npm run dev
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Frontend Service: `/etc/systemd/system/ampedlogix-frontend.service`
```
[Unit]
Description=AmpedFieldOps Frontend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/AmpedFieldOps-v2
ExecStart=/usr/bin/npm run dev
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Both enabled with `systemctl enable` for auto-start.

---

## Docker Containers in Use

**V1 Containers (from `/root/AmpedFieldOps`):**
- `ampedfieldops-redis` - Redis for job queue (NEEDS PORT MAPPING FIX)
- `ampedfieldops-ocr` - OCR service on port 8000
- `ampedfieldops-api` - V1 backend (NOT USED IN V2)
- `ampedfieldops-web` - V1 frontend (NOT USED IN V2)

**Note:** V2 is running services directly via systemd, not Docker. Only uses `ampedfieldops-redis` container from v1 compose for the Redis dependency.

---

## Next Steps for Tomorrow

### 1. Fix Redis Connection (BLOCKING)
```bash
# Test Redis connectivity
docker exec ampedfieldops-redis redis-cli ping

# If failing, check docker logs
cd /root/AmpedFieldOps && docker compose logs redis --tail=50

# Ensure port 6379 is exposed
docker port ampedfieldops-redis

# Alternative: Use Docker internal network
# Modify backend .env: REDIS_URL=redis://ampedfieldops-redis:6379
```

### 2. Restart Backend After Redis Fix
```bash
systemctl restart ampedlogix-backend
systemctl status ampedlogix-backend --no-pager
```

### 3. Test Access
```
HTTP: http://192.168.1.124:81
Nginx logs: tail -f /var/log/nginx/error.log
Backend logs: journalctl -u ampedlogix-backend -f
Frontend logs: journalctl -u ampedlogix-frontend -f
```

### 4. Verify Working
- [ ] Frontend loads on port 81
- [ ] API calls work (`/api/` routes)
- [ ] Admin settings accessible (`/admin/` routes)
- [ ] Xero integration page loads (`/xero/` routes)
- [ ] Redis connection established (backend logs should show no ECONNREFUSED)

---

## Key Files Modified Today

| File | Change | Status |
|------|--------|--------|
| `/etc/nginx/sites-enabled/v2-app` | Created Nginx proxy config | ✅ Active |
| `/etc/systemd/system/ampedlogix-backend.service` | Service already existed | ✅ Running |
| `/etc/systemd/system/ampedlogix-frontend.service` | Service already existed | ✅ Running |
| `/root/AmpedFieldOps-v2/.env` | Pre-configured (no changes) | ✅ Correct |
| `/root/AmpedFieldOps-v2/backend/.env` | Pre-configured (no changes) | ✅ Correct |

---

## Architecture Summary

```
User Browser (192.168.1.124:81)
        ↓
   Nginx on :81
        ↓
   ┌────┴──────────────────┐
   ↓                       ↓
Vite :5173             Express :3002
(Frontend)             (Backend)
                            ↓
                        Redis :6379
                    (ampedfieldops-redis)
```

Frontend and backend both running as systemd services on the same server.
Nginx acts as single entry point on port 81.
All configured for production use with relative URLs.

---

## Commands to Know

```bash
# Check v2 service status
systemctl status ampedlogix-backend ampedlogix-frontend --no-pager

# View logs
journalctl -u ampedlogix-backend -f   # Backend logs
journalctl -u ampedlogix-frontend -f  # Frontend logs

# Check ports
ss -tuln | grep -E "(81|3002|5173|6379)"

# Restart services
systemctl restart ampedlogix-backend ampedlogix-frontend

# Check Redis
docker exec ampedfieldops-redis redis-cli ping
docker exec ampedfieldops-redis redis-cli -i 30

# Check Nginx
systemctl status nginx
nginx -t
tail -f /var/log/nginx/error.log
```

---

## What's Working ✅
- Frontend Vite dev server
- Backend Express server
- Nginx reverse proxy on port 81
- Environment configuration correct
- Systemd auto-restart services
- Supabase credentials loaded

## What's Broken ❌
- Redis connection from backend to localhost:6379
- Backend cannot start BullMQ job queue
- No job processing until Redis fixed

## Estimated Time to Fix
~15 minutes - just need to verify/expose Redis on port 6379 and restart backend.
