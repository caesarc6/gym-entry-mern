#!/usr/bin/env bash
# Archive Ethereal Gains (Capacitor iOS) and upload to App Store Connect.
#
# Defaults match frontend/ios/App (scheme App, team 34M67XKNV4,
# bundle com.etherealgains.gymentry). Override via env or flags.
#
# Required for upload (App Store Connect API key):
#   ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH  (path to AuthKey_XXXXXX.p8)
#
# Optional:
#   TEAM_ID, BUNDLE_ID, SCHEME, CONFIGURATION, IOS_PROJECT, ARCHIVE_PATH, EXPORT_PATH
#
# Usage (from repo root):
#   npm run ios:archive:upload -- --dry-run
#   npm run ios:archive:upload
#   ./scripts/ios-archive-upload.sh --skip-sync --archive-only

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="${ROOT_DIR}/frontend"

# --- Defaults discovered from frontend/ios/App ---
TEAM_ID="${TEAM_ID:-34M67XKNV4}"
BUNDLE_ID="${BUNDLE_ID:-com.etherealgains.gymentry}"
SCHEME="${SCHEME:-App}"
CONFIGURATION="${CONFIGURATION:-Release}"
IOS_PROJECT="${IOS_PROJECT:-${FRONTEND_DIR}/ios/App/App.xcodeproj}"
CAPACITOR_CONFIG="${CAPACITOR_CONFIG:-${FRONTEND_DIR}/ios/App/App/capacitor.config.json}"
BUILD_DIR="${BUILD_DIR:-${FRONTEND_DIR}/ios/App/build}"
ARCHIVE_PATH="${ARCHIVE_PATH:-${BUILD_DIR}/EtherealGains.xcarchive}"
EXPORT_PATH="${EXPORT_PATH:-${BUILD_DIR}/export}"
EXPORT_OPTIONS_PLIST="${EXPORT_OPTIONS_PLIST:-${BUILD_DIR}/ExportOptions.plist}"

ASC_KEY_ID="${ASC_KEY_ID:-${APP_STORE_CONNECT_API_KEY_ID:-}}"
ASC_ISSUER_ID="${ASC_ISSUER_ID:-${APP_STORE_CONNECT_ISSUER_ID:-}}"
ASC_KEY_PATH="${ASC_KEY_PATH:-${APP_STORE_CONNECT_API_KEY_PATH:-}}"

DRY_RUN=0
SKIP_SYNC=0
ARCHIVE_ONLY=0
DO_SYNC=1

usage() {
  cat <<'EOF'
Usage: ios-archive-upload.sh [options]

  --dry-run         Validate inputs and print xcodebuild/altool commands; no archive/upload
  --skip-sync       Do not run npm run cap:sync:ios:store (you already synced)
  --archive-only    Archive + export IPA only; skip App Store Connect upload
  --no-sync         Alias for --skip-sync
  -h, --help        Show this help

Environment:
  TEAM_ID           Apple Developer Team ID (default: 34M67XKNV4)
  BUNDLE_ID         App bundle id (default: com.etherealgains.gymentry)
  SCHEME            Xcode scheme (default: App)
  CONFIGURATION     Build configuration (default: Release)
  IOS_PROJECT       Path to App.xcodeproj
  ARCHIVE_PATH      .xcarchive output path
  EXPORT_PATH       Export directory for IPA
  ASC_KEY_ID        App Store Connect API Key ID
  ASC_ISSUER_ID     App Store Connect Issuer ID
  ASC_KEY_PATH      Path to AuthKey_<KEY_ID>.p8 (never commit this file)

Modern upload path: xcodebuild archive → exportArchive (destination=upload)
with ASC API key auth. Falls back to altool --upload-app if export upload is skipped.
EOF
}

log() { printf '==> %s\n' "$*"; }
warn() { printf 'warning: %s\n' "$*" >&2; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run]'
    printf ' %q' "$@"
    printf '\n'
  else
    "$@"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --skip-sync|--no-sync) SKIP_SYNC=1; DO_SYNC=0 ;;
    --archive-only) ARCHIVE_ONLY=1 ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown option: $1 (see --help)" ;;
  esac
  shift
done

# --- Preflight: paths ---
[[ -d "$FRONTEND_DIR" ]] || die "frontend/ not found at $FRONTEND_DIR"
[[ -d "$IOS_PROJECT" ]] || die "Xcode project missing: $IOS_PROJECT"
[[ -f "${IOS_PROJECT}/project.pbxproj" ]] || die "project.pbxproj missing under $IOS_PROJECT"

SCHEME_FILE="${IOS_PROJECT}/xcshareddata/xcschemes/${SCHEME}.xcscheme"
if [[ ! -f "$SCHEME_FILE" ]]; then
  die "Shared scheme '${SCHEME}' not found at $SCHEME_FILE (expected scheme App)"
fi

command -v xcodebuild >/dev/null || die "xcodebuild not found (install Xcode + CLT)"
command -v xcrun >/dev/null || die "xcrun not found"

# --- Preflight: live-reload must not be set ---
assert_no_live_reload() {
  if [[ ! -f "$CAPACITOR_CONFIG" ]]; then
    die "Missing $CAPACITOR_CONFIG — run npm run cap:sync:ios:store first"
  fi
  if command -v node >/dev/null; then
    node "${FRONTEND_DIR}/scripts/assert-no-live-reload.js" \
      || die "Live-reload server.url is set; refuse to archive. Run: npm run cap:sync:ios:store"
  else
    if grep -q '"url"' "$CAPACITOR_CONFIG" 2>/dev/null; then
      die "capacitor.config.json appears to set server.url (live-reload). Run cap:sync:ios:store"
    fi
  fi
}

# --- Preflight: signing team present in project or env ---
assert_signing() {
  if ! grep -q "DEVELOPMENT_TEAM = ${TEAM_ID};" "${IOS_PROJECT}/project.pbxproj"; then
    warn "DEVELOPMENT_TEAM = ${TEAM_ID} not found in project.pbxproj"
    die "Missing or mismatched signing team. Set TEAM_ID or fix Xcode Signing (expected ${TEAM_ID})"
  fi
  if ! grep -q "PRODUCT_BUNDLE_IDENTIFIER = ${BUNDLE_ID};" "${IOS_PROJECT}/project.pbxproj"; then
    die "BUNDLE_ID ${BUNDLE_ID} not found in project.pbxproj"
  fi
  log "Signing OK: TEAM_ID=${TEAM_ID} BUNDLE_ID=${BUNDLE_ID} SCHEME=${SCHEME}"
}

# --- Preflight: ASC API credentials (upload) ---
assert_asc_credentials() {
  [[ -n "$ASC_KEY_ID" ]] || die "ASC_KEY_ID is required for upload (App Store Connect API Key ID)"
  [[ -n "$ASC_ISSUER_ID" ]] || die "ASC_ISSUER_ID is required for upload"
  [[ -n "$ASC_KEY_PATH" ]] || die "ASC_KEY_PATH is required (path to AuthKey_${ASC_KEY_ID:-XXXXXX}.p8)"
  [[ -f "$ASC_KEY_PATH" ]] || die "ASC_KEY_PATH file not found: $ASC_KEY_PATH"
  case "$ASC_KEY_PATH" in
    *.p8) ;;
    *) warn "ASC_KEY_PATH does not end in .p8 — Apple AuthKey files are normally AuthKey_<KEY_ID>.p8" ;;
  esac
  log "ASC API key OK: KEY_ID=${ASC_KEY_ID} path=${ASC_KEY_PATH}"
}

write_export_options() {
  local destination="$1" # upload | export
  mkdir -p "$(dirname "$EXPORT_OPTIONS_PLIST")"
  cat >"$EXPORT_OPTIONS_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>method</key>
	<string>app-store-connect</string>
	<key>destination</key>
	<string>${destination}</string>
	<key>teamID</key>
	<string>${TEAM_ID}</string>
	<key>signingStyle</key>
	<string>automatic</string>
	<key>uploadSymbols</key>
	<true/>
	<key>manageAppVersionAndBuildNumber</key>
	<false/>
</dict>
</plist>
EOF
  log "Wrote ExportOptions.plist (destination=${destination}) → ${EXPORT_OPTIONS_PLIST}"
}

auth_args=()
if [[ -n "$ASC_KEY_ID" && -n "$ASC_ISSUER_ID" && -n "$ASC_KEY_PATH" ]]; then
  auth_args=(
    -authenticationKeyID "$ASC_KEY_ID"
    -authenticationKeyIssuerID "$ASC_ISSUER_ID"
    -authenticationKeyPath "$ASC_KEY_PATH"
  )
fi

log "Repo root: $ROOT_DIR"
log "Project:   $IOS_PROJECT"
log "Archive:   $ARCHIVE_PATH"
log "Dry-run:   $DRY_RUN  skip-sync: $SKIP_SYNC  archive-only: $ARCHIVE_ONLY"

assert_signing

if [[ "$DO_SYNC" -eq 1 ]]; then
  log "Running cap:sync:ios:store (clears live-reload server.url)"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] (cd %q && npm run cap:sync:ios:store)\n' "$ROOT_DIR"
  else
    (cd "$ROOT_DIR" && npm run cap:sync:ios:store)
  fi
else
  log "Skipping sync (--skip-sync); still checking capacitor.config.json"
fi

# Always refuse archive if live-reload is present (even on dry-run when config exists)
if [[ "$DRY_RUN" -eq 1 && ! -f "$CAPACITOR_CONFIG" ]]; then
  warn "capacitor.config.json missing (expected after sync) — skip live-reload check in dry-run"
else
  assert_no_live_reload
fi

if [[ "$ARCHIVE_ONLY" -eq 0 ]]; then
  EXPORT_DESTINATION="upload"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    if [[ -z "$ASC_KEY_ID" || -z "$ASC_ISSUER_ID" || -z "$ASC_KEY_PATH" || ! -f "${ASC_KEY_PATH:-}" ]]; then
      warn "ASC credentials incomplete — real upload would fail. Set ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH"
      auth_args=()
    else
      assert_asc_credentials
    fi
  else
    assert_asc_credentials
  fi
else
  EXPORT_DESTINATION="export"
  if [[ -z "$ASC_KEY_ID" || -z "$ASC_ISSUER_ID" || -z "$ASC_KEY_PATH" ]]; then
    warn "ASC credentials not fully set; archive/export will rely on local Xcode signing only"
    auth_args=()
  fi
fi

if [[ "$DRY_RUN" -eq 0 ]]; then
  mkdir -p "$BUILD_DIR" "$EXPORT_PATH"
  write_export_options "$EXPORT_DESTINATION"
else
  mkdir -p "$BUILD_DIR"
  write_export_options "$EXPORT_DESTINATION"
  log "Dry-run: ExportOptions written for inspection; archive/upload commands printed only"
fi

log "Archiving (${CONFIGURATION} / generic iOS)…"
ARCHIVE_CMD=(
  xcodebuild
  -project "$IOS_PROJECT"
  -scheme "$SCHEME"
  -configuration "$CONFIGURATION"
  -destination "generic/platform=iOS"
  -archivePath "$ARCHIVE_PATH"
  -allowProvisioningUpdates
  archive
)
if [[ ${#auth_args[@]} -gt 0 ]]; then
  ARCHIVE_CMD+=("${auth_args[@]}")
fi
run "${ARCHIVE_CMD[@]}"

log "Exporting for App Store Connect (destination=${EXPORT_DESTINATION})…"
EXPORT_CMD=(
  xcodebuild
  -exportArchive
  -archivePath "$ARCHIVE_PATH"
  -exportPath "$EXPORT_PATH"
  -exportOptionsPlist "$EXPORT_OPTIONS_PLIST"
  -allowProvisioningUpdates
)
if [[ ${#auth_args[@]} -gt 0 ]]; then
  EXPORT_CMD+=("${auth_args[@]}")
fi
run "${EXPORT_CMD[@]}"

if [[ "$ARCHIVE_ONLY" -eq 1 ]]; then
  log "Archive-only done. IPA (if exported) under: $EXPORT_PATH"
  exit 0
fi

# When destination=upload, exportArchive already uploaded. Still offer altool verification path
# if an IPA remains (destination=export) or user wants an explicit upload retry.
IPA_PATH="$(find "$EXPORT_PATH" -maxdepth 1 -name '*.ipa' 2>/dev/null | head -n 1 || true)"

if [[ "$EXPORT_DESTINATION" == "upload" ]]; then
  log "Export destination was upload — App Store Connect should have received the build."
  log "Check App Store Connect → TestFlight for processing."
  if [[ -n "$IPA_PATH" ]]; then
    log "Local IPA also present: $IPA_PATH"
  fi
  exit 0
fi

[[ -n "$IPA_PATH" ]] || die "No .ipa found under $EXPORT_PATH after export"
log "Uploading IPA via altool: $IPA_PATH"
# API key: altool looks up AuthKey_<id>.p8 in ASC_KEY_PATH's directory or ~/.private_keys
ALTOOL_CMD=(
  xcrun altool
  --upload-app
  --type ios
  --file "$IPA_PATH"
  --apiKey "$ASC_KEY_ID"
  --apiIssuer "$ASC_ISSUER_ID"
)
# Ensure altool can find the .p8 (it searches cwd, ~/private_keys, ~/.appstoreconnect/private_keys)
KEY_DIR="$(cd "$(dirname "$ASC_KEY_PATH")" && pwd)"
export API_PRIVATE_KEYS_DIR="${API_PRIVATE_KEYS_DIR:-$KEY_DIR}"
run env API_PRIVATE_KEYS_DIR="$API_PRIVATE_KEYS_DIR" "${ALTOOL_CMD[@]}"

log "Upload submitted. Wait for processing in App Store Connect → TestFlight."
