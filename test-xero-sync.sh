#!/bin/bash

# Test Xero Sync Endpoints
# This script tests the new Xero sync functionality

set -e

API_BASE="http://localhost:81/api"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjc3Nic3hqdGZpYndmeG9hZ3hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1Mjk5NDUsImV4cCI6MjA4NDEwNTk0NX0.SwXX6sn_FKBVY1caY33P9Mq7oh7zOlTjwoXq8IkRoCQ"

echo "========================================="
echo "Testing Xero Sync Endpoints"
echo "========================================="

# Test 1: Get Xero Status
echo ""
echo "1. Testing GET /admin/xero/status"
curl -s -X GET "${API_BASE}/admin/xero/status" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "apikey: ${ANON_KEY}" | python3 -m json.tool

# Test 2: Queue client sync
echo ""
echo "2. Testing POST /admin/xero/sync-clients"
curl -s -X POST "${API_BASE}/admin/xero/sync-clients" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" | python3 -m json.tool

# Test 3: Queue items sync
echo ""
echo "3. Testing POST /admin/xero/sync-items"
curl -s -X POST "${API_BASE}/admin/xero/sync-items" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" | python3 -m json.tool

# Test 4: Queue payment sync
echo ""
echo "4. Testing POST /admin/xero/sync-payments"
curl -s -X POST "${API_BASE}/admin/xero/sync-payments" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" | python3 -m json.tool

# Test 5: Get sync log
echo ""
echo "5. Testing GET /admin/xero/sync-log (after small delay for job to run)"
sleep 3
curl -s -X GET "${API_BASE}/admin/xero/sync-log" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "apikey: ${ANON_KEY}" | python3 -m json.tool

echo ""
echo "========================================="
echo "Sync tests complete!"
echo "========================================="
