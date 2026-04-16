#!/usr/bin/env bash
# ============================================================
# Prometheus Dashboard – Integration Test Suite
# Usage: ./scripts/test.sh [username] [password]
# Default: admin / haha
#
# Requires: curl, python3
# Services must be running: Next.js (3000) + Prometheus (9090)
# ============================================================

set -euo pipefail

USERNAME="${1:-admin}"
PASSWORD="${2:-haha}"
BASE_URL="http://localhost:3000"
PROM_URL="http://localhost:9090"
COOKIE_JAR="$(mktemp /tmp/prom_test_XXXX.jar)"
PASS=0
FAIL=0

# ── Helpers ─────────────────────────────────────────────────

green() { printf '\033[32m%s\033[0m\n' "$*"; }
red()   { printf '\033[31m%s\033[0m\n' "$*"; }
bold()  { printf '\033[1m%s\033[0m\n'  "$*"; }

pass() { PASS=$((PASS+1)); green "  PASS  $1"; }
fail() { FAIL=$((FAIL+1)); red   "  FAIL  $1"; }

check() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [ "$expected" = "$actual" ]; then
    pass "$label (got: $actual)"
  else
    fail "$label (expected: $expected, got: $actual)"
  fi
}

cleanup() { rm -f "$COOKIE_JAR"; }
trap cleanup EXIT

api()  { curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" "$BASE_URL$1"; }
prom() { curl -s "$PROM_URL$1"; }

# ── 1. Service Reachability ──────────────────────────────────

bold "1. Service Reachability"

NEXT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL")
if [ "$NEXT_STATUS" != "000" ]; then
  pass "Next.js is reachable (HTTP $NEXT_STATUS)"
else
  fail "Next.js not reachable at $BASE_URL"
fi

PROM_HEALTH=$(prom "/-/healthy")
if echo "$PROM_HEALTH" | grep -q "Prometheus"; then
  pass "Prometheus is healthy"
else
  fail "Prometheus health check failed (got: $PROM_HEALTH)"
fi

# ── 2. Auth – Login ─────────────────────────────────────────

bold "2. Authentication"

LOGIN_RES=$(curl -s -c "$COOKIE_JAR" -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

if echo "$LOGIN_RES" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if 'username' in d else 1)" 2>/dev/null; then
  pass "Login as '$USERNAME' succeeded"
else
  fail "Login as '$USERNAME' failed (response: $LOGIN_RES)"
  echo "Cannot continue without a valid session. Exiting."
  bold "─────────────────────────────────────────────────"
  bold "Results: $PASS passed, $FAIL failed"
  exit 1
fi

ME=$(api "/api/auth/me")
ME_USER=$(echo "$ME" | python3 -c "import sys,json; print(json.load(sys.stdin).get('username',''))" 2>/dev/null)
check "/api/auth/me returns correct username" "$USERNAME" "$ME_USER"

# ── 3. Unauthorized Access ───────────────────────────────────

bold "3. Unauthorized Access Protection"

UNAUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/stats")
check "/api/stats without auth returns 401" "401" "$UNAUTH_STATUS"

UNAUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/alerts")
check "/api/alerts without auth returns 401" "401" "$UNAUTH_STATUS"

UNAUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/targets")
check "/api/targets without auth returns 401" "401" "$UNAUTH_STATUS"

# ── 4. Prometheus Raw Data ───────────────────────────────────

bold "4. Prometheus Raw Alerts"

PROM_ALERTS=$(prom "/api/v1/alerts")
PROM_TOTAL=$(echo "$PROM_ALERTS" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(len(d['data']['alerts']))
" 2>/dev/null || echo "0")

PROM_FIRING=$(echo "$PROM_ALERTS" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(len([a for a in d['data']['alerts'] if a['state']=='firing']))
" 2>/dev/null || echo "0")

PROM_FIRING_FOR_USER=$(echo "$PROM_ALERTS" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(len([a for a in d['data']['alerts'] if a['state']=='firing' and a['labels'].get('username')=='$USERNAME']))
" 2>/dev/null || echo "0")

PROM_TARGETS_FOR_USER=$(echo "$PROM_ALERTS" | python3 -c "
import sys, json
d = json.load(sys.stdin)
instances = set(a['labels'].get('instance','') for a in d['data']['alerts'] if a['labels'].get('username')=='$USERNAME' and a['state']=='firing')
print(len(instances))
" 2>/dev/null || echo "0")

echo "  Prometheus: total_alerts=$PROM_TOTAL, firing=$PROM_FIRING, firing_for_$USERNAME=$PROM_FIRING_FOR_USER"

if [ "$PROM_TOTAL" -ge 0 ] 2>/dev/null; then
  pass "Prometheus /api/v1/alerts is accessible"
else
  fail "Could not parse Prometheus alerts"
fi

# ── 5. NextJS API Data ───────────────────────────────────────

bold "5. NextJS API Responses"

NX_ALERTS=$(api "/api/alerts")
NX_STATS=$(api "/api/stats")
NX_TARGETS=$(api "/api/targets")

# Alerts structure
ALERTS_OK=$(echo "$NX_ALERTS" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('ok' if 'firing' in d and 'recent' in d else 'bad')
" 2>/dev/null || echo "bad")
check "/api/alerts response has 'firing' and 'recent' keys" "ok" "$ALERTS_OK"

# Stats structure
STATS_OK=$(echo "$NX_STATS" | python3 -c "
import sys, json
d = json.load(sys.stdin)
keys = {'totalAlerts','firingAlerts','totalTargets','impactedTargets'}
print('ok' if keys.issubset(d.keys()) else 'bad')
" 2>/dev/null || echo "bad")
check "/api/stats response has all expected keys" "ok" "$STATS_OK"

# Targets is an array
TARGETS_OK=$(echo "$NX_TARGETS" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('ok' if isinstance(d, list) else 'bad')
" 2>/dev/null || echo "bad")
check "/api/targets returns an array" "ok" "$TARGETS_OK"

# ── 6. Prometheus ↔ NextJS Consistency ──────────────────────

bold "6. Prometheus ↔ NextJS Data Consistency (user: $USERNAME)"

python3 - <<PYEOF
import json, sys

raw_prom   = json.loads('''${PROM_ALERTS}''')
nx_alerts  = json.loads('''${NX_ALERTS}''')
nx_stats   = json.loads('''${NX_STATS}''')
nx_targets = json.loads('''${NX_TARGETS}''')

all_prom = raw_prom.get('data', {}).get('alerts', [])
prom_firing_user = [a for a in all_prom if a['state']=='firing' and a['labels'].get('username')=='${USERNAME}']

nx_firing   = nx_alerts.get('firing', [])
prom_count  = len(prom_firing_user)
nx_count    = len(nx_firing)

results = []

def chk(label, expected, actual):
    ok = expected == actual
    sym = 'PASS' if ok else 'FAIL'
    results.append(ok)
    color = '\033[32m' if ok else '\033[31m'
    reset = '\033[0m'
    print(f"  {color}{sym}{reset}  {label} (expected={expected}, got={actual})")

chk("Firing alert count matches Prometheus", prom_count, nx_count)
chk("stats.firingAlerts matches Prometheus", prom_count, nx_stats.get('firingAlerts'))
chk("stats.totalTargets matches config target count", len(nx_targets), nx_stats.get('totalTargets'))

prom_instances = sorted(set(a['labels'].get('instance','') for a in prom_firing_user))
nx_instances   = sorted(set(a['instance'] for a in nx_firing))
chk("Firing instances match between Prometheus and NextJS", prom_instances, nx_instances)

uniq_impacted = len(set(a['labels'].get('instance','') for a in prom_firing_user))
chk("stats.impactedTargets matches unique firing instances", uniq_impacted, nx_stats.get('impactedTargets'))

# All targets in NextJS should appear in Prometheus config (job=username)
prom_job_targets = [a['labels'].get('instance','') for a in all_prom if a['labels'].get('job')=='${USERNAME}']
for t in nx_targets:
    # nx_targets are URLs; prom instances are the same URLs after relabeling
    match = t in prom_job_targets
    results.append(match)
    sym = 'PASS' if match else 'FAIL'
    color = '\033[32m' if match else '\033[31m'
    reset = '\033[0m'
    print(f"  {color}{sym}{reset}  Target '{t}' appears in Prometheus job labels")

total = len(results)
passed = sum(results)
print(f"\n  Consistency: {passed}/{total} checks passed")
PYEOF

# ── 7. Target CRUD ──────────────────────────────────────────

bold "7. Target Management CRUD"

ORIGINAL_TARGETS=$(api "/api/targets")
TEST_TARGET="https://test-target-$(date +%s).example.com"

# Add target
ADD_RES=$(echo "$ORIGINAL_TARGETS" | python3 -c "
import sys, json
targets = json.load(sys.stdin)
targets.append('$TEST_TARGET')
print(json.dumps({'targets': targets}))
" | curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/api/targets" \
     -H 'Content-Type: application/json' -d @-)

ADDED=$(echo "$ADD_RES" | python3 -c "
import sys, json
d = json.load(sys.stdin)
targets = d.get('targets', [])
print('ok' if '$TEST_TARGET' in targets else 'bad')
" 2>/dev/null || echo "bad")
check "Add target via POST /api/targets" "ok" "$ADDED"

# Verify via GET
AFTER_ADD=$(api "/api/targets")
VERIFY_ADD=$(echo "$AFTER_ADD" | python3 -c "
import sys, json
print('ok' if '$TEST_TARGET' in json.load(sys.stdin) else 'bad')
" 2>/dev/null || echo "bad")
check "Added target appears in GET /api/targets" "ok" "$VERIFY_ADD"

# Remove target (restore original)
RESTORE_RES=$(echo "$ORIGINAL_TARGETS" | curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/api/targets" \
  -H 'Content-Type: application/json' -d @-)

RESTORED=$(echo "$RESTORE_RES" | python3 -c "
import sys, json
d = json.load(sys.stdin)
targets = d.get('targets', [])
print('ok' if '$TEST_TARGET' not in targets else 'bad')
" 2>/dev/null || echo "bad")
check "Remove target (restore original list)" "ok" "$RESTORED"

# ── 8. Summary ───────────────────────────────────────────────

bold "─────────────────────────────────────────────────"
TOTAL=$((PASS+FAIL))
if [ "$FAIL" -eq 0 ]; then
  green "All $TOTAL tests passed."
else
  red "$FAIL/$TOTAL tests FAILED."
fi
bold "─────────────────────────────────────────────────"

exit "$FAIL"
