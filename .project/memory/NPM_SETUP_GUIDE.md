# Nginx Proxy Manager Setup for AmpedFieldOps V2

## Current Status ✅
- **Redis:** Connected and healthy on port 6379
- **Backend:** Running on port 3002 (http://localhost:3002)
- **Frontend:** Running on port 5173 (http://localhost:5173)

## Problem
Frontend is configured with `VITE_BACKEND_URL=/api` (relative URL), which means:
- When you access `http://192.168.1.124:5173`, the browser tries to fetch from `http://192.168.1.124:5173/api` ❌
- But the backend is actually on `http://192.168.1.124:3002`

## Solution: Configure NPM Custom Locations

### Step 1: Access Nginx Proxy Manager
1. Open your NPM admin interface (usually on port 81 or wherever it's configured)
2. Login with your admin credentials

### Step 2: Edit the Proxy Host
1. Find your existing proxy host for `admin.ampedlogix.com` (or your domain)
2. Click the **3 dots** → **Edit**

### Step 3: Add Custom Locations
Click on the **"Custom Locations"** tab and add these 3 locations:

#### Location 1: API Routes
```
Define Location: ^~ /api
Scheme: http
Forward Hostname / IP: localhost
Forward Port: 3002
Forward Path: (leave empty or use /)
```
**Advanced settings:**
- ✅ Check "Websockets Support"
- Add Custom Nginx Config:
```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

#### Location 2: Admin Routes
```
Define Location: ^~ /admin
Scheme: http
Forward Hostname / IP: localhost
Forward Port: 3002
Forward Path: (leave empty or use /)
```
**Advanced settings:**
- ✅ Check "Websockets Support"
- Same custom Nginx config as above

#### Location 3: Xero Routes
```
Define Location: ^~ /xero
Scheme: http
Forward Hostname / IP: localhost
Forward Port: 3002
Forward Path: (leave empty or use /)
```
**Advanced settings:**
- ✅ Check "Websockets Support"
- Same custom Nginx config as above

### Step 4: Update Main Proxy Host Settings
In the **"Details"** tab:
```
Scheme: http
Forward Hostname / IP: localhost
Forward Port: 5173  (This is your Vite frontend)
```

### Step 5: Save and Test
1. Click **Save**
2. Access your site via your domain: `https://admin.ampedlogix.com`
3. Navigate to Settings → Xero Integration
4. Check browser console - should see API calls to `/api/admin/xero/status` succeeding

## How It Works

```
User → https://admin.ampedlogix.com
              ↓
         NPM (Port 80/443)
              ↓
    ┌─────────┴──────────────┐
    ↓                        ↓
  /  → localhost:5173    /api → localhost:3002
       (Frontend)        /admin → localhost:3002
                        /xero → localhost:3002
                           (Backend)
```

## Verification Commands

```bash
# Check services are running
systemctl status ampedlogix-frontend --no-pager
systemctl status ampedlogix-backend --no-pager

# Test backend directly
curl http://localhost:3002/health

# Test frontend directly
curl http://localhost:5173

# Check Redis
redis-cli ping
```

## Troubleshooting

### API calls still failing?
1. Check NPM logs in the UI
2. Verify Custom Locations are using `^~` prefix (priority match)
3. Ensure "Websockets Support" is enabled
4. Check backend logs: `journalctl -u ampedlogix-backend -f`

### Frontend not loading?
1. Verify Vite dev server running: `ss -tuln | grep 5173`
2. Check frontend logs: `journalctl -u ampedlogix-frontend -f`

### 502 Bad Gateway?
1. Verify ports match: `ss -tuln | grep -E "(5173|3002)"`
2. Check if services crashed: `systemctl status ampedlogix-*`

## What Changed Today (Jan 31, 2026)

### Redis Fix
- **Problem:** Redis container was running but port 6379 wasn't accessible on localhost
- **Solution:** Ran `docker compose down redis && docker compose up -d redis` from `/root/AmpedFieldOps`
- **Result:** ✅ Redis now accessible, backend connected successfully

### Backend Status
- Previously failing with `ECONNREFUSED` on Redis connection
- Now healthy with "✅ Redis connected" in logs
- Health endpoint responding: `http://localhost:3002/health`

### Environment Config
- Frontend `.env`: `VITE_BACKEND_URL=/api` (requires NPM routing)
- Backend `.env`: All credentials loaded, Redis URL set to `redis://localhost:6379`

## Next Steps

1. **Configure NPM** following the steps above (15 minutes)
2. **Test Xero page** at `https://admin.ampedlogix.com/app/settings/xero`
3. **Verify API calls** work without 502 errors
4. Optional: Set up SSL cert renewal if not already configured in NPM

## Production Notes

- This setup is production-ready
- No hardcoded IPs or URLs in frontend
- Works with any domain configured in NPM
- Services auto-restart via systemd
- Redis data persists in Docker volume

## Port Reference

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| NPM | 80/443 | HTTPS | Main entry point |
| Frontend | 5173 | HTTP | Vite dev server |
| Backend | 3002 | HTTP | Express API |
| Redis | 6379 | TCP | Job queue |
| OCR | 8000 | HTTP | OCR service |

**No ports need to be opened externally** - NPM handles all external access on 80/443.
Your existing port forwarding for NPM should be sufficient.
