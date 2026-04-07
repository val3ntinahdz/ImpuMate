#!/usr/bin/env bash
# =============================================================================
# ImpuMate — test-endpoints.sh
# Runs 5 test cases per API endpoint against a live server.
# Resets the database before each run.
#
# Usage:
#   ./test-endpoints.sh [OPTIONS]
#
# Options:
#   --port PORT   API port (default: 3000)
#   --no-color    Disable colored output (for CI)
#   --verbose     Print full response body on failed assertions
#   --help        Show this message
#
# Requires: curl, node, npm, psql (already available in this project)
# =============================================================================

set -euo pipefail

# ── Resolve paths ─────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Parse flags ───────────────────────────────────────────────────────────────
PORT=3000
VERBOSE=false
COLOR=true

for arg in "$@"; do
  case "$arg" in
    --no-color) COLOR=false ;;
    --verbose)  VERBOSE=true ;;
    --port)     shift; PORT="$1" ;;
    --help)     sed -n '2,16p' "${BASH_SOURCE[0]}"; exit 0 ;;
    --port=*)   PORT="${arg#--port=}" ;;
  esac
done

BASE="http://localhost:$PORT"

# ── Cookie jars & temp files ──────────────────────────────────────────────────
COOKIE_MAIN=$(mktemp)   # primary authenticated user
COOKIE_B=$(mktemp)      # second user (isolation / cross-user tests)
COOKIE_ANON=$(mktemp)   # never logged in (unauthenticated tests)
BODY_FILE=$(mktemp)
SERVER_PID=""

# ── Colors ────────────────────────────────────────────────────────────────────
if [[ "$COLOR" == true ]]; then
  GREEN="\033[0;32m"; RED="\033[0;31m"; YELLOW="\033[1;33m"
  CYAN="\033[0;36m"; BOLD="\033[1m"; RESET="\033[0m"
else
  GREEN=""; RED=""; YELLOW=""; CYAN=""; BOLD=""; RESET=""
fi

# ── Counters ──────────────────────────────────────────────────────────────────
PASS=0
FAIL=0

# ── Shared state (populated during tests) ────────────────────────────────────
SID=""          # main fiscal session id
SID_ALT=""      # second fiscal session for isolation / delete tests
SRC_ID=""       # income source id
SRC_DEL=""      # income source for delete test
EXP_ID=""       # expense id
EXP_DEL=""      # expense for delete test

# =============================================================================
# HELPERS
# =============================================================================

group() {
  echo -e "\n${CYAN}${BOLD}══ $1 ══${RESET}"
}

# Perform HTTP request. Sets HTTP_STATUS and BODY globals.
req() {
  local method="$1" url="$2" cookies="${3:-$COOKIE_ANON}" data="${4:-}"
  if [[ -n "$data" ]]; then
    HTTP_STATUS=$(curl -s -b "$cookies" -c "$cookies" -X "$method" "$BASE$url" \
      -H "Content-Type: application/json" -d "$data" -o "$BODY_FILE" -w "%{http_code}")
  else
    HTTP_STATUS=$(curl -s -b "$cookies" -c "$cookies" -X "$method" "$BASE$url" \
      -o "$BODY_FILE" -w "%{http_code}")
  fi
  BODY=$(cat "$BODY_FILE")
}

pass() { echo -e "  ${GREEN}✓${RESET} $1"; PASS=$((PASS + 1)); }
fail() {
  echo -e "  ${RED}✗${RESET} $1"; FAIL=$((FAIL + 1))
  if [[ "$VERBOSE" == true ]]; then echo -e "    ${YELLOW}↳ $BODY${RESET}"; fi
}

assert_status() {
  local expected="$1" label="$2"
  if [[ "$HTTP_STATUS" == "$expected" ]]; then
    pass "$label [HTTP $expected]"
  else
    fail "$label [expected HTTP $expected, got HTTP $HTTP_STATUS]"
    if [[ "$VERBOSE" != true ]]; then echo -e "    ${YELLOW}↳ $BODY${RESET}"; fi
  fi
}

assert_contains() {
  local needle="$1" label="$2"
  if echo "$BODY" | grep -q "$needle"; then
    pass "$label [body ∋ '$needle']"
  else
    fail "$label [body ∌ '$needle']"
  fi
}

assert_not_contains() {
  local needle="$1" label="$2"
  if ! echo "$BODY" | grep -q "$needle"; then
    pass "$label [body ∌ '$needle']"
  else
    fail "$label [body should NOT contain '$needle']"
  fi
}

# Extract a top-level string value from JSON: "key":"value" → value
extract() {
  echo "$BODY" | grep -o "\"$1\":\"[^\"]*\"" | head -1 | cut -d'"' -f4
}

# Extract a top-level numeric value from JSON: "key":123 → 123
extract_num() {
  echo "$BODY" | grep -o "\"$1\":[0-9]*" | head -1 | cut -d':' -f2
}

# =============================================================================
# SERVER LIFECYCLE
# =============================================================================

start_server() {
  echo -e "${BOLD}Starting API server on port $PORT...${RESET}"
  cd "$API_DIR"
  PORT="$PORT" node src/server.js > /tmp/impumate-test-server.log 2>&1 &
  SERVER_PID=$!
  local attempts=0
  until curl -sf "$BASE/health" > /dev/null 2>&1 || [[ $attempts -ge 30 ]]; do
    sleep 0.5; attempts=$((attempts + 1))
  done
  if curl -sf "$BASE/health" > /dev/null 2>&1; then
    echo -e "${GREEN}Server ready (PID $SERVER_PID)${RESET}\n"
  else
    echo -e "${RED}Server failed to start. Check /tmp/impumate-test-server.log${RESET}"
    exit 1
  fi
}

stop_server() {
  if [[ -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" 2>/dev/null || true
    echo -e "\n${BOLD}Server stopped.${RESET}"
  fi
  rm -f "$COOKIE_MAIN" "$COOKIE_B" "$COOKIE_ANON" "$BODY_FILE"
}

trap stop_server EXIT

# =============================================================================
# DATABASE RESET
# =============================================================================

echo -e "${BOLD}Resetting database...${RESET}"
bash "$SCRIPT_DIR/setup-db.sh" --reset
echo ""

# =============================================================================
# START SERVER
# =============================================================================

start_server

# =============================================================================
# TESTS
# =============================================================================

# ── GET /health ───────────────────────────────────────────────────────────────
group "GET /health"

req GET /health
assert_status 200 "returns 200"
assert_contains '"status"' "body has status key"
assert_contains '"ok"' "status is ok"

req GET /health
assert_contains "ok" "repeated call still returns ok"

# curl with wrong method (POST) should either 404 or 405 — not 200
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/health")
BODY=""
if [[ "$HTTP_STATUS" != "200" ]]; then pass "POST /health is not 200"; else fail "POST /health should not be 200"; fi

# nonexistent route returns 404
req GET /api/nonexistent-route
assert_status 404 "unknown route returns 404"

# health is accessible without auth
req GET /health "$COOKIE_ANON"
assert_status 200 "health accessible without auth"

# ── POST /api/auth/register ───────────────────────────────────────────────────
group "POST /api/auth/register"

req POST /api/auth/register "$COOKIE_MAIN" \
  '{"email":"main@test.com","password":"Pass1234","rfc":"MAIN900101ABC","nombreCompleto":"Main User"}'
assert_status 201 "valid registration returns 201"
assert_contains '"email"' "response includes email field"
assert_not_contains '"passwordHash"' "response excludes passwordHash"

req POST /api/auth/register "$COOKIE_ANON" \
  '{"password":"Pass1234","rfc":"NOEMAIL1ABC","nombreCompleto":"No Email"}'
assert_status 400 "missing email returns 400"

req POST /api/auth/register "$COOKIE_ANON" \
  '{"email":"nopass@test.com","rfc":"NOPAS01ABC","nombreCompleto":"No Pass"}'
assert_status 400 "missing password returns 400"

req POST /api/auth/register "$COOKIE_ANON" \
  '{"email":"norfc@test.com","password":"Pass1234","nombreCompleto":"No RFC"}'
assert_status 400 "missing rfc returns 400"

req POST /api/auth/register "$COOKIE_ANON" \
  '{"email":"main@test.com","password":"Pass1234","rfc":"DUPL900101ABC","nombreCompleto":"Duplicate"}'
assert_status 409 "duplicate email returns 409"

# Register second user for isolation tests (done after main user exists)
req POST /api/auth/register "$COOKIE_B" \
  '{"email":"userb@test.com","password":"Pass1234","rfc":"USRB900101XYZ","nombreCompleto":"User B"}'
assert_status 201 "second user registration returns 201"

# ── POST /api/auth/login ──────────────────────────────────────────────────────
group "POST /api/auth/login"

# Log out main user so we can test login fresh
req POST /api/auth/logout "$COOKIE_MAIN"

req POST /api/auth/login "$COOKIE_MAIN" \
  '{"email":"main@test.com","password":"Pass1234"}'
assert_status 200 "valid credentials return 200"
assert_contains '"email"' "response includes email"
assert_not_contains '"passwordHash"' "response excludes passwordHash"

req POST /api/auth/login "$COOKIE_ANON" \
  '{"email":"main@test.com","password":"WRONGPASS"}'
assert_status 401 "wrong password returns 401"

req POST /api/auth/login "$COOKIE_ANON" \
  '{"email":"ghost@test.com","password":"Pass1234"}'
assert_status 401 "unknown email returns 401"

req POST /api/auth/login "$COOKIE_ANON" \
  '{"password":"Pass1234"}'
assert_status 400 "missing email returns 400"

req POST /api/auth/login "$COOKIE_ANON" \
  '{"email":"main@test.com"}'
assert_status 400 "missing password returns 400"

# ── POST /api/auth/logout ─────────────────────────────────────────────────────
group "POST /api/auth/logout"

# Re-login main user before testing logout
req POST /api/auth/login "$COOKIE_MAIN" \
  '{"email":"main@test.com","password":"Pass1234"}'

req POST /api/auth/logout "$COOKIE_MAIN"
assert_status 200 "logout returns 200"
assert_contains "cerrada" "body confirms session closed"

# After logout, protected endpoint returns 401
req GET /api/profile "$COOKIE_MAIN"
assert_status 401 "accessing protected route after logout returns 401"

# Logout without an active session (anon cookie) still returns 200 (destroy is idempotent in express-session)
req POST /api/auth/logout "$COOKIE_ANON"
assert_status 200 "logout without session returns 200"

# Re-login for remaining tests
req POST /api/auth/login "$COOKIE_MAIN" \
  '{"email":"main@test.com","password":"Pass1234"}'
assert_status 200 "re-login after logout returns 200"

# Confirm session is active after re-login
req GET /api/profile "$COOKIE_MAIN"
assert_status 200 "profile accessible after re-login"

# ── GET /api/profile ──────────────────────────────────────────────────────────
group "GET /api/profile"

req GET /api/profile "$COOKIE_MAIN"
assert_status 200 "authenticated user gets profile"
assert_contains '"email"' "profile includes email"
assert_not_contains '"passwordHash"' "passwordHash excluded from profile"

req GET /api/profile "$COOKIE_ANON"
assert_status 401 "unauthenticated request returns 401"

req GET /api/profile "$COOKIE_MAIN"
assert_contains '"rfc"' "profile includes rfc field"

req GET /api/profile "$COOKIE_MAIN"
assert_contains '"nombreCompleto"' "profile includes nombreCompleto"

req GET /api/profile "$COOKIE_B"
assert_status 200 "second user gets their own profile"
# Ensure userB does not see mainUser's email
assert_not_contains '"main@test.com"' "userB profile does not expose main@test.com"

# ── PUT /api/profile ──────────────────────────────────────────────────────────
group "PUT /api/profile"

req PUT /api/profile "$COOKIE_MAIN" \
  '{"nombreCompleto":"Main User Updated"}'
assert_status 200 "update nombreCompleto returns 200"
assert_contains "Updated" "body reflects updated name"

req PUT /api/profile "$COOKIE_ANON" \
  '{"nombreCompleto":"Hacker"}'
assert_status 401 "unauthenticated PUT returns 401"

req PUT /api/profile "$COOKIE_MAIN" \
  '{"esSocioAccionista":true}'
assert_status 200 "update boolean field returns 200"
assert_contains '"esSocioAccionista":true' "boolean field persisted"

req PUT /api/profile "$COOKIE_MAIN" \
  '{"prefiereResico":false}'
assert_status 200 "update prefiereResico returns 200"

req PUT /api/profile "$COOKIE_MAIN" \
  '{"estadoCumplimientoSat":"AL_CORRIENTE"}'
assert_status 200 "update estadoCumplimientoSat returns 200"
assert_contains "AL_CORRIENTE" "estadoCumplimientoSat value persisted"

# ── GET /api/profile/sat-regimes ─────────────────────────────────────────────
group "GET /api/profile/sat-regimes"

req GET /api/profile/sat-regimes "$COOKIE_MAIN"
assert_status 200 "authenticated request returns 200"
assert_contains '"satRegimes"' "body has satRegimes key"

req GET /api/profile/sat-regimes "$COOKIE_ANON"
assert_status 401 "unauthenticated request returns 401"

req GET /api/profile/sat-regimes "$COOKIE_MAIN"
# Array might be empty initially
assert_contains '"satRegimes":\[\]' "satRegimes is empty array initially" || \
  assert_contains '"satRegimes"' "satRegimes key present"

req GET /api/profile/sat-regimes "$COOKIE_B"
assert_status 200 "second user can read their own sat-regimes"

# After we PUT regimes, GET reflects them
req PUT /api/profile/sat-regimes "$COOKIE_MAIN" '{"satRegimes":["612","621"]}'
req GET /api/profile/sat-regimes "$COOKIE_MAIN"
assert_contains '"612"' "GET reflects previously PUT regime"

# ── PUT /api/profile/sat-regimes ─────────────────────────────────────────────
group "PUT /api/profile/sat-regimes"

req PUT /api/profile/sat-regimes "$COOKIE_MAIN" \
  '{"satRegimes":["612","621"]}'
assert_status 200 "valid array of regimes returns 200"
assert_contains '"satRegimes"' "response includes satRegimes"

req PUT /api/profile/sat-regimes "$COOKIE_ANON" \
  '{"satRegimes":["612"]}'
assert_status 401 "unauthenticated request returns 401"

req PUT /api/profile/sat-regimes "$COOKIE_MAIN" \
  '{"satRegimes":"not-an-array"}'
assert_status 400 "non-array satRegimes returns 400"

req PUT /api/profile/sat-regimes "$COOKIE_MAIN" \
  '{"satRegimes":[]}'
assert_status 200 "empty array clears regimes"

req PUT /api/profile/sat-regimes "$COOKIE_MAIN" \
  '{"satRegimes":["625"]}'
assert_status 200 "replacing with single regime returns 200"
assert_contains '"625"' "updated regime is in response"

# ── GET /api/profile/sat-obligations ─────────────────────────────────────────
group "GET /api/profile/sat-obligations"

req GET /api/profile/sat-obligations "$COOKIE_MAIN"
assert_status 200 "authenticated request returns 200"
assert_contains '"satObligations"' "body has satObligations key"

req GET /api/profile/sat-obligations "$COOKIE_ANON"
assert_status 401 "unauthenticated request returns 401"

req GET /api/profile/sat-obligations "$COOKIE_B"
assert_status 200 "second user reads their own obligations"

# After PUT, GET reflects new data
req PUT /api/profile/sat-obligations "$COOKIE_MAIN" \
  '{"satObligations":["ACTIVIDAD_EMPRESARIAL_REGIMEN_GENERAL"]}'
req GET /api/profile/sat-obligations "$COOKIE_MAIN"
assert_contains "ACTIVIDAD_EMPRESARIAL" "GET reflects previously PUT obligation"

req GET /api/profile/sat-obligations "$COOKIE_MAIN"
assert_not_contains '"passwordHash"' "obligations response excludes sensitive fields"

# ── PUT /api/profile/sat-obligations ─────────────────────────────────────────
group "PUT /api/profile/sat-obligations"

req PUT /api/profile/sat-obligations "$COOKIE_MAIN" \
  '{"satObligations":["SERVICIOS_PROFESIONALES_REGIMEN_GENERAL"]}'
assert_status 200 "valid obligations array returns 200"

req PUT /api/profile/sat-obligations "$COOKIE_ANON" \
  '{"satObligations":["SERVICIOS_PROFESIONALES_REGIMEN_GENERAL"]}'
assert_status 401 "unauthenticated request returns 401"

req PUT /api/profile/sat-obligations "$COOKIE_MAIN" \
  '{"satObligations":"not-an-array"}'
assert_status 400 "non-array satObligations returns 400"

req PUT /api/profile/sat-obligations "$COOKIE_MAIN" \
  '{"satObligations":[]}'
assert_status 200 "empty array clears obligations"

req PUT /api/profile/sat-obligations "$COOKIE_MAIN" \
  '{"satObligations":["SUELDOS_Y_SALARIOS","ARRENDAMIENTO_REGIMEN_GENERAL"]}'
assert_status 200 "multiple obligations accepted"
assert_contains "SUELDOS_Y_SALARIOS" "first obligation in response"

# ── POST /api/fiscal-sessions ─────────────────────────────────────────────────
group "POST /api/fiscal-sessions"

req POST /api/fiscal-sessions "$COOKIE_MAIN" \
  '{"exerciseYear":2026,"isrAlreadyWithheldMxn":5000,"ivaAlreadyPaidMxn":1200,"bufferHorizonMonths":3}'
assert_status 201 "valid session creation returns 201"
assert_contains '"exerciseYear"' "response includes exerciseYear"
SID=$(extract "id")

req POST /api/fiscal-sessions "$COOKIE_ANON" \
  '{"exerciseYear":2026}'
assert_status 401 "unauthenticated request returns 401"

req POST /api/fiscal-sessions "$COOKIE_MAIN" \
  '{"isrAlreadyWithheldMxn":0}'
assert_status 400 "missing exerciseYear returns 400"

req POST /api/fiscal-sessions "$COOKIE_MAIN" \
  '{"exerciseYear":"not-a-number"}'
assert_status 400 "non-numeric exerciseYear returns 400"

req POST /api/fiscal-sessions "$COOKIE_MAIN" \
  '{"exerciseYear":2026}'
assert_status 409 "duplicate session for same year returns 409"

# Create a second session (different year) for isolation and delete tests
req POST /api/fiscal-sessions "$COOKIE_MAIN" \
  '{"exerciseYear":2025}'
assert_status 201 "session for alternate year returns 201"
SID_ALT=$(extract "id")

# ── GET /api/fiscal-sessions ──────────────────────────────────────────────────
group "GET /api/fiscal-sessions"

req GET /api/fiscal-sessions "$COOKIE_MAIN"
assert_status 200 "authenticated list returns 200"
assert_contains '"exerciseYear"' "list includes exerciseYear"

req GET /api/fiscal-sessions "$COOKIE_ANON"
assert_status 401 "unauthenticated request returns 401"

req GET /api/fiscal-sessions "$COOKIE_MAIN"
assert_contains "$SID" "main session appears in list"

# UserB should not see main user's sessions
req GET /api/fiscal-sessions "$COOKIE_B"
assert_status 200 "userB gets their own (empty) list"
assert_not_contains "$SID" "userB cannot see main user sessions"

req GET /api/fiscal-sessions "$COOKIE_MAIN"
assert_contains "2026" "year 2026 session is in the list"

# ── GET /api/fiscal-sessions/:sessionId ───────────────────────────────────────
group "GET /api/fiscal-sessions/:sessionId"

req GET "/api/fiscal-sessions/$SID" "$COOKIE_MAIN"
assert_status 200 "owner fetches their session"
assert_contains '"exerciseYear"' "response includes exerciseYear"

req GET "/api/fiscal-sessions/$SID" "$COOKIE_ANON"
assert_status 401 "unauthenticated request returns 401"

req GET "/api/fiscal-sessions/$SID" "$COOKIE_B"
assert_status 404 "userB cannot fetch main user session"

req GET "/api/fiscal-sessions/00000000-0000-0000-0000-000000000000" "$COOKIE_MAIN"
assert_status 404 "nonexistent session returns 404"

req GET "/api/fiscal-sessions/$SID" "$COOKIE_MAIN"
assert_contains "2026" "session year matches what was created"

# ── PUT /api/fiscal-sessions/:sessionId ───────────────────────────────────────
group "PUT /api/fiscal-sessions/:sessionId"

req PUT "/api/fiscal-sessions/$SID" "$COOKIE_MAIN" \
  '{"isrAlreadyWithheldMxn":8000,"bufferHorizonMonths":6}'
assert_status 200 "valid update returns 200"
assert_contains "8000" "updated ISR withheld is reflected"

req PUT "/api/fiscal-sessions/$SID" "$COOKIE_ANON" \
  '{"bufferHorizonMonths":6}'
assert_status 401 "unauthenticated update returns 401"

req PUT "/api/fiscal-sessions/$SID" "$COOKIE_B" \
  '{"bufferHorizonMonths":6}'
assert_status 404 "userB cannot update main user session"

req PUT "/api/fiscal-sessions/00000000-0000-0000-0000-000000000000" "$COOKIE_MAIN" \
  '{"ivaAlreadyPaidMxn":500}'
assert_status 404 "updating nonexistent session returns 404"

req PUT "/api/fiscal-sessions/$SID" "$COOKIE_MAIN" \
  '{"ivaAlreadyPaidMxn":2500}'
assert_status 200 "partial update (ivaAlreadyPaidMxn only) returns 200"
assert_contains "2500" "updated IVA is reflected"

# ── DELETE /api/fiscal-sessions/:sessionId ────────────────────────────────────
group "DELETE /api/fiscal-sessions/:sessionId"

req DELETE "/api/fiscal-sessions/$SID_ALT" "$COOKIE_ANON"
assert_status 401 "unauthenticated delete returns 401"

req DELETE "/api/fiscal-sessions/$SID_ALT" "$COOKIE_B"
assert_status 404 "userB cannot delete main user session"

req DELETE "/api/fiscal-sessions/00000000-0000-0000-0000-000000000000" "$COOKIE_MAIN"
assert_status 404 "deleting nonexistent session returns 404"

req DELETE "/api/fiscal-sessions/$SID_ALT" "$COOKIE_MAIN"
assert_status 200 "owner deletes their session"
assert_contains "eliminada" "body confirms deletion"

req DELETE "/api/fiscal-sessions/$SID_ALT" "$COOKIE_MAIN"
assert_status 404 "deleting already-deleted session returns 404"

# ── POST /api/fiscal-sessions/:sessionId/income-sources ──────────────────────
group "POST /api/fiscal-sessions/:sessionId/income-sources"

req POST "/api/fiscal-sessions/$SID/income-sources" "$COOKIE_MAIN" \
  '{"idFuente":"src1","descripcion":"Salario empresa","montoAnualEstimado":480000,"quienPaga":"PERSONA_MORAL","existeRelacionSubordinada":true,"recibeCfdiNomina":true}'
assert_status 201 "valid income source creation returns 201"
SRC_ID=$(extract "id")
assert_contains '"idFuente"' "response includes idFuente" || assert_contains '"id"' "response includes id"

req POST "/api/fiscal-sessions/$SID/income-sources" "$COOKIE_ANON" \
  '{"idFuente":"src2","montoAnualEstimado":100000,"quienPaga":"PERSONA_MORAL"}'
assert_status 401 "unauthenticated request returns 401"

req POST "/api/fiscal-sessions/$SID/income-sources" "$COOKIE_MAIN" \
  '{"descripcion":"Missing required fields"}'
assert_status 400 "missing required fields returns 400"

req POST "/api/fiscal-sessions/$SID/income-sources" "$COOKIE_B" \
  '{"idFuente":"src3","montoAnualEstimado":100000,"quienPaga":"PERSONA_MORAL"}'
assert_status 404 "userB cannot add source to main user session"

# Add a second source for delete test
req POST "/api/fiscal-sessions/$SID/income-sources" "$COOKIE_MAIN" \
  '{"idFuente":"src_del","descripcion":"Para borrar","montoAnualEstimado":60000,"quienPaga":"PERSONA_FISICA","otorgaUsoGoceInmueble":true}'
assert_status 201 "second income source created for delete test"
SRC_DEL=$(extract "id")

# ── GET /api/fiscal-sessions/:sessionId/income-sources ───────────────────────
group "GET /api/fiscal-sessions/:sessionId/income-sources"

req GET "/api/fiscal-sessions/$SID/income-sources" "$COOKIE_MAIN"
assert_status 200 "authenticated list returns 200"
assert_contains '"idFuente"' "response includes idFuente"

req GET "/api/fiscal-sessions/$SID/income-sources" "$COOKIE_ANON"
assert_status 401 "unauthenticated request returns 401"

req GET "/api/fiscal-sessions/$SID/income-sources" "$COOKIE_B"
assert_status 404 "userB cannot list main user's sources"

req GET "/api/fiscal-sessions/00000000-0000-0000-0000-000000000000/income-sources" "$COOKIE_MAIN"
assert_status 404 "nonexistent session returns 404"

req GET "/api/fiscal-sessions/$SID/income-sources" "$COOKIE_MAIN"
assert_contains "$SRC_ID" "created source appears in list"

# ── PUT /api/fiscal-sessions/:sessionId/income-sources/:sourceId ─────────────
group "PUT /api/fiscal-sessions/:sessionId/income-sources/:sourceId"

req PUT "/api/fiscal-sessions/$SID/income-sources/$SRC_ID" "$COOKIE_MAIN" \
  '{"montoAnualEstimado":520000}'
assert_status 200 "valid update returns 200"
assert_contains "520000" "updated amount is reflected"

req PUT "/api/fiscal-sessions/$SID/income-sources/$SRC_ID" "$COOKIE_ANON" \
  '{"montoAnualEstimado":100}'
assert_status 401 "unauthenticated update returns 401"

req PUT "/api/fiscal-sessions/$SID/income-sources/$SRC_ID" "$COOKIE_B" \
  '{"montoAnualEstimado":100}'
assert_status 404 "userB cannot update main user source"

req PUT "/api/fiscal-sessions/$SID/income-sources/00000000-0000-0000-0000-000000000000" "$COOKIE_MAIN" \
  '{"montoAnualEstimado":100}'
assert_status 404 "nonexistent source returns 404"

req PUT "/api/fiscal-sessions/$SID/income-sources/$SRC_ID" "$COOKIE_MAIN" \
  '{"descripcion":"Salario actualizado","isSubjectToIva":false}'
assert_status 200 "partial update of multiple fields returns 200"
assert_contains "Salario actualizado" "updated descripcion is reflected"

# ── DELETE /api/fiscal-sessions/:sessionId/income-sources/:sourceId ──────────
group "DELETE /api/fiscal-sessions/:sessionId/income-sources/:sourceId"

req DELETE "/api/fiscal-sessions/$SID/income-sources/$SRC_DEL" "$COOKIE_ANON"
assert_status 401 "unauthenticated delete returns 401"

req DELETE "/api/fiscal-sessions/$SID/income-sources/$SRC_DEL" "$COOKIE_B"
assert_status 404 "userB cannot delete main user source"

req DELETE "/api/fiscal-sessions/$SID/income-sources/00000000-0000-0000-0000-000000000000" "$COOKIE_MAIN"
assert_status 404 "nonexistent source returns 404"

req DELETE "/api/fiscal-sessions/$SID/income-sources/$SRC_DEL" "$COOKIE_MAIN"
assert_status 200 "owner deletes their source"
assert_contains "eliminada" "body confirms deletion"

req DELETE "/api/fiscal-sessions/$SID/income-sources/$SRC_DEL" "$COOKIE_MAIN"
assert_status 404 "deleting already-deleted source returns 404"

# ── POST /api/fiscal-sessions/:sessionId/regime/select ───────────────────────
group "POST /api/fiscal-sessions/:sessionId/regime/select"

req POST "/api/fiscal-sessions/$SID/regime/select" "$COOKIE_MAIN" \
  '{"obligations":["SUELDOS_Y_SALARIOS"]}'
assert_status 200 "valid manual obligation selection returns 200"
assert_contains '"obligations"' "response includes obligations"

req POST "/api/fiscal-sessions/$SID/regime/select" "$COOKIE_ANON" \
  '{"obligations":["SUELDOS_Y_SALARIOS"]}'
assert_status 401 "unauthenticated request returns 401"

req POST "/api/fiscal-sessions/$SID/regime/select" "$COOKIE_B" \
  '{"obligations":["SUELDOS_Y_SALARIOS"]}'
assert_status 404 "userB cannot set obligations on main user session"

req POST "/api/fiscal-sessions/$SID/regime/select" "$COOKIE_MAIN" \
  '{"obligations":[]}'
assert_status 400 "empty obligations array returns 400"

req POST "/api/fiscal-sessions/$SID/regime/select" "$COOKIE_MAIN" \
  '{"obligations":["SUELDOS_Y_SALARIOS","ARRENDAMIENTO_REGIMEN_GENERAL"]}'
assert_status 200 "multiple obligations accepted"
assert_contains "ARRENDAMIENTO" "second obligation is reflected"

# ── POST /api/fiscal-sessions/:sessionId/regime/run ──────────────────────────
group "POST /api/fiscal-sessions/:sessionId/regime/run"

# First remove the only source so we can test the "no sources" error
# Then re-add source for the algorithm run
req POST "/api/fiscal-sessions/$SID/regime/run" "$COOKIE_MAIN" '{}'
# Should succeed because we still have SRC_ID
assert_status 200 "regime run with existing income sources returns 200"

req POST "/api/fiscal-sessions/$SID/regime/run" "$COOKIE_ANON" '{}'
assert_status 401 "unauthenticated request returns 401"

req POST "/api/fiscal-sessions/$SID/regime/run" "$COOKIE_B" '{}'
assert_status 404 "userB cannot run regime on main user session"

req POST "/api/fiscal-sessions/00000000-0000-0000-0000-000000000000/regime/run" "$COOKIE_MAIN" '{}'
assert_status 404 "nonexistent session returns 404"

# Create a fresh session with no sources to test that error path
req POST /api/fiscal-sessions "$COOKIE_B" '{"exerciseYear":2026}'
SID_B=$(extract "id")
req POST "/api/fiscal-sessions/$SID_B/regime/run" "$COOKIE_B" '{}'
assert_status 400 "session with no income sources returns 400"

# ── GET /api/fiscal-sessions/:sessionId/regime/results ───────────────────────
group "GET /api/fiscal-sessions/:sessionId/regime/results"

req GET "/api/fiscal-sessions/$SID/regime/results" "$COOKIE_MAIN"
assert_status 200 "authenticated fetch returns 200"

req GET "/api/fiscal-sessions/$SID/regime/results" "$COOKIE_ANON"
assert_status 401 "unauthenticated request returns 401"

req GET "/api/fiscal-sessions/$SID/regime/results" "$COOKIE_B"
assert_status 404 "userB cannot fetch main user regime results"

req GET "/api/fiscal-sessions/00000000-0000-0000-0000-000000000000/regime/results" "$COOKIE_MAIN"
assert_status 404 "nonexistent session returns 404"

req GET "/api/fiscal-sessions/$SID_B/regime/results" "$COOKIE_B"
assert_status 404 "session without regime run returns 404"

# ── GET /api/fiscal-sessions/:sessionId/regime/obligations ───────────────────
group "GET /api/fiscal-sessions/:sessionId/regime/obligations"

# Restore manual selection after algorithm run
req POST "/api/fiscal-sessions/$SID/regime/select" "$COOKIE_MAIN" \
  '{"obligations":["SUELDOS_Y_SALARIOS"]}'

req GET "/api/fiscal-sessions/$SID/regime/obligations" "$COOKIE_MAIN"
assert_status 200 "authenticated request returns 200"
assert_contains '"obligations"' "response includes obligations"

req GET "/api/fiscal-sessions/$SID/regime/obligations" "$COOKIE_ANON"
assert_status 401 "unauthenticated request returns 401"

req GET "/api/fiscal-sessions/$SID/regime/obligations" "$COOKIE_B"
assert_status 404 "userB cannot read main user obligations"

req GET "/api/fiscal-sessions/00000000-0000-0000-0000-000000000000/regime/obligations" "$COOKIE_MAIN"
assert_status 404 "nonexistent session returns 404"

req GET "/api/fiscal-sessions/$SID_B/regime/obligations" "$COOKIE_B"
assert_status 404 "session without obligations returns 404"

# ── POST /api/fiscal-sessions/:sessionId/expenses ────────────────────────────
group "POST /api/fiscal-sessions/:sessionId/expenses"

req POST "/api/fiscal-sessions/$SID/expenses" "$COOKIE_MAIN" \
  '{"category":"PERSONAL_MEDICAL","amountMXN":3500,"hasCFDI":true,"paymentMethod":"CREDIT_CARD","paidFromTaxpayerAccount":true,"paidInRelevantFiscalYear":true,"beneficiaryRelationship":"SELF","providerHasRequiredProfessionalLicense":true,"invoiceReceiverRFCMatchesTaxpayer":true}'
assert_status 201 "valid expense creation returns 201"
assert_contains '"expense"' "response includes expense"
EXP_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

req POST "/api/fiscal-sessions/$SID/expenses" "$COOKIE_ANON" \
  '{"category":"PERSONAL_MEDICAL","amountMXN":1000,"hasCFDI":true,"paymentMethod":"CREDIT_CARD"}'
assert_status 401 "unauthenticated request returns 401"

req POST "/api/fiscal-sessions/$SID/expenses" "$COOKIE_B" \
  '{"category":"PERSONAL_MEDICAL","amountMXN":1000,"hasCFDI":true,"paymentMethod":"CREDIT_CARD"}'
assert_status 404 "userB cannot add expense to main user session"

req POST "/api/fiscal-sessions/00000000-0000-0000-0000-000000000000/expenses" "$COOKIE_MAIN" \
  '{"category":"PERSONAL_MEDICAL","amountMXN":1000}'
assert_status 404 "nonexistent session returns 404"

req POST "/api/fiscal-sessions/$SID/expenses" "$COOKIE_MAIN" \
  '{"category":"HONORARIOS_MEDICOS","amountMXN":1000,"hasCFDI":true,"paymentMethod":"ELECTRONIC"}'
assert_status 400 "invalid category/payment returns 400"
assert_contains '"error"' "invalid payload includes error"

# Create expense for delete test
req POST "/api/fiscal-sessions/$SID/expenses" "$COOKIE_MAIN" \
  '{"category":"PERSONAL_FUNERAL","amountMXN":8000,"hasCFDI":true,"paymentMethod":"TRANSFER","paidFromTaxpayerAccount":true,"paidInRelevantFiscalYear":true,"beneficiaryRelationship":"SELF","invoiceReceiverRFCMatchesTaxpayer":true}'
assert_status 201 "second expense created for delete test"
EXP_DEL=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# ── GET /api/fiscal-sessions/:sessionId/expenses ─────────────────────────────
group "GET /api/fiscal-sessions/:sessionId/expenses"

req GET "/api/fiscal-sessions/$SID/expenses" "$COOKIE_MAIN"
assert_status 200 "authenticated list returns 200"

req GET "/api/fiscal-sessions/$SID/expenses" "$COOKIE_ANON"
assert_status 401 "unauthenticated request returns 401"

req GET "/api/fiscal-sessions/$SID/expenses" "$COOKIE_B"
assert_status 404 "userB cannot list main user expenses"

req GET "/api/fiscal-sessions/00000000-0000-0000-0000-000000000000/expenses" "$COOKIE_MAIN"
assert_status 404 "nonexistent session returns 404"

req GET "/api/fiscal-sessions/$SID/expenses" "$COOKIE_MAIN"
assert_contains "$EXP_ID" "created expense appears in list"

# ── GET /api/fiscal-sessions/:sessionId/expenses/:expenseId ──────────────────
group "GET /api/fiscal-sessions/:sessionId/expenses/:expenseId"

req GET "/api/fiscal-sessions/$SID/expenses/$EXP_ID" "$COOKIE_MAIN"
assert_status 200 "owner fetches their expense"
assert_contains '"category"' "response includes category"

req GET "/api/fiscal-sessions/$SID/expenses/$EXP_ID" "$COOKIE_ANON"
assert_status 401 "unauthenticated request returns 401"

req GET "/api/fiscal-sessions/$SID/expenses/$EXP_ID" "$COOKIE_B"
assert_status 404 "userB cannot fetch main user expense"

req GET "/api/fiscal-sessions/$SID/expenses/00000000-0000-0000-0000-000000000000" "$COOKIE_MAIN"
assert_status 404 "nonexistent expense returns 404"

req GET "/api/fiscal-sessions/$SID/expenses/$EXP_ID" "$COOKIE_MAIN"
assert_contains "PERSONAL_MEDICAL" "category matches what was created"

# ── PUT /api/fiscal-sessions/:sessionId/expenses/:expenseId ──────────────────
group "PUT /api/fiscal-sessions/:sessionId/expenses/:expenseId"

req PUT "/api/fiscal-sessions/$SID/expenses/$EXP_ID" "$COOKIE_MAIN" \
  '{"amountMXN":4000}'
assert_status 200 "valid update returns 200"
assert_contains "4000" "updated amount is reflected"

req PUT "/api/fiscal-sessions/$SID/expenses/$EXP_ID" "$COOKIE_ANON" \
  '{"amountMXN":100}'
assert_status 401 "unauthenticated update returns 401"

req PUT "/api/fiscal-sessions/$SID/expenses/$EXP_ID" "$COOKIE_B" \
  '{"amountMXN":100}'
assert_status 404 "userB cannot update main user expense"

req PUT "/api/fiscal-sessions/$SID/expenses/00000000-0000-0000-0000-000000000000" "$COOKIE_MAIN" \
  '{"amountMXN":100}'
assert_status 404 "nonexistent expense returns 404"

req PUT "/api/fiscal-sessions/$SID/expenses/$EXP_ID" "$COOKIE_MAIN" \
  '{"hasCFDI":false,"paymentMethod":"CASH"}'
assert_status 200 "updating multiple fields returns 200"

# ── DELETE /api/fiscal-sessions/:sessionId/expenses/:expenseId ───────────────
group "DELETE /api/fiscal-sessions/:sessionId/expenses/:expenseId"

req DELETE "/api/fiscal-sessions/$SID/expenses/$EXP_DEL" "$COOKIE_ANON"
assert_status 401 "unauthenticated delete returns 401"

req DELETE "/api/fiscal-sessions/$SID/expenses/$EXP_DEL" "$COOKIE_B"
assert_status 404 "userB cannot delete main user expense"

req DELETE "/api/fiscal-sessions/$SID/expenses/00000000-0000-0000-0000-000000000000" "$COOKIE_MAIN"
assert_status 404 "nonexistent expense returns 404"

req DELETE "/api/fiscal-sessions/$SID/expenses/$EXP_DEL" "$COOKIE_MAIN"
assert_status 200 "owner deletes their expense"
assert_contains "eliminado" "body confirms deletion"

req DELETE "/api/fiscal-sessions/$SID/expenses/$EXP_DEL" "$COOKIE_MAIN"
assert_status 404 "deleting already-deleted expense returns 404"

# ── GET /api/fiscal-sessions/:sessionId/deduction-catalog ────────────────────
group "GET /api/fiscal-sessions/:sessionId/deduction-catalog"

req GET "/api/fiscal-sessions/$SID/deduction-catalog" "$COOKIE_MAIN"
assert_status 200 "authenticated request with obligations returns 200"
assert_contains '"catalog"' "response includes catalog"

req GET "/api/fiscal-sessions/$SID/deduction-catalog" "$COOKIE_ANON"
assert_status 401 "unauthenticated request returns 401"

req GET "/api/fiscal-sessions/$SID/deduction-catalog" "$COOKIE_B"
assert_status 404 "userB cannot access main user deduction catalog"

req GET "/api/fiscal-sessions/00000000-0000-0000-0000-000000000000/deduction-catalog" "$COOKIE_MAIN"
assert_status 404 "nonexistent session returns 404"

req GET "/api/fiscal-sessions/$SID_B/deduction-catalog" "$COOKIE_B"
assert_status 400 "session without obligations returns 400"

# ── GET /api/fiscal-sessions/:sessionId/deductions/summary ───────────────────
group "GET /api/fiscal-sessions/:sessionId/deductions/summary"

req GET "/api/fiscal-sessions/$SID/deductions/summary" "$COOKIE_MAIN"
assert_status 200 "session with expenses returns summary"
assert_contains '"totalPersonalDeductiblesMxn"' "summary includes personal deductibles"

req GET "/api/fiscal-sessions/$SID/deductions/summary" "$COOKIE_ANON"
assert_status 401 "unauthenticated request returns 401"

req GET "/api/fiscal-sessions/$SID/deductions/summary" "$COOKIE_B"
assert_status 404 "userB cannot access main user deductions summary"

req GET "/api/fiscal-sessions/00000000-0000-0000-0000-000000000000/deductions/summary" "$COOKIE_MAIN"
assert_status 404 "nonexistent session returns 404"

req GET "/api/fiscal-sessions/$SID_B/deductions/summary" "$COOKIE_B"
assert_status 404 "session with no expenses returns 404"

# ── POST /api/fiscal-sessions/:sessionId/tax-buffer/calculate ────────────────
group "POST /api/fiscal-sessions/:sessionId/tax-buffer/calculate"

req POST "/api/fiscal-sessions/$SID/tax-buffer/calculate" "$COOKIE_MAIN" '{}'
assert_status 200 "valid calculation returns 200"
assert_contains '"recommendedMonthlyBuffer"' "response includes recommendedMonthlyBuffer"

req POST "/api/fiscal-sessions/$SID/tax-buffer/calculate" "$COOKIE_ANON" '{}'
assert_status 401 "unauthenticated request returns 401"

req POST "/api/fiscal-sessions/$SID/tax-buffer/calculate" "$COOKIE_B" '{}'
assert_status 404 "userB cannot calculate on main user session"

req POST "/api/fiscal-sessions/00000000-0000-0000-0000-000000000000/tax-buffer/calculate" "$COOKIE_MAIN" '{}'
assert_status 404 "nonexistent session returns 404"

req POST "/api/fiscal-sessions/$SID_B/tax-buffer/calculate" "$COOKIE_B" '{}'
assert_status 400 "session without income sources returns 400"

# ── GET /api/fiscal-sessions/:sessionId/tax-buffer/latest ────────────────────
group "GET /api/fiscal-sessions/:sessionId/tax-buffer/latest"

req GET "/api/fiscal-sessions/$SID/tax-buffer/latest" "$COOKIE_MAIN"
assert_status 200 "after calculation, latest returns 200"
assert_contains '"recommendedMonthlyBuffer"' "response includes recommendedMonthlyBuffer"

req GET "/api/fiscal-sessions/$SID/tax-buffer/latest" "$COOKIE_ANON"
assert_status 401 "unauthenticated request returns 401"

req GET "/api/fiscal-sessions/$SID/tax-buffer/latest" "$COOKIE_B"
assert_status 404 "userB cannot access main user tax buffer"

req GET "/api/fiscal-sessions/00000000-0000-0000-0000-000000000000/tax-buffer/latest" "$COOKIE_MAIN"
assert_status 404 "nonexistent session returns 404"

req GET "/api/fiscal-sessions/$SID_B/tax-buffer/latest" "$COOKIE_B"
assert_status 404 "session without prior calculation returns 404"

# =============================================================================
# SUMMARY
# =============================================================================

echo ""
echo -e "${BOLD}══════════════════════════════════════════${RESET}"
echo -e "${BOLD}  Results: ${GREEN}$PASS passed${RESET} / ${RED}$FAIL failed${RESET}"
echo -e "${BOLD}══════════════════════════════════════════${RESET}"

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
