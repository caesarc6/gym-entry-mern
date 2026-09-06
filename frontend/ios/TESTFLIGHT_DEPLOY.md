# Ethereal Gains — iPhone → TestFlight → App Store

Bundle ID: `com.etherealgains.gymentry`  
Team: `34M67XKNV4`  
API: `https://gym-entry-mern.vercel.app`  
Always sync with **no** live-reload: `npm run cap:sync:ios:store`

---

## 1. Run on your iPhone (USB)

1. Plug in iPhone, unlock, tap **Trust**.
2. On iPhone: **Settings → Privacy & Security → Developer Mode → On** (reboot if asked).
3. After the first install, on iPhone: **Settings → General → VPN & Device Management** → your developer certificate → **Trust** (required or launch fails with “invalid code signature / not trusted”).
3. From repo root (already done if you just synced):
   ```bash
   npm run cap:sync:ios:store
   npm run cap:open:ios
   ```
4. In Xcode:
   - Scheme: **App** (not WorkoutHabitWidget)
   - Destination: your **physical iPhone** (not a Simulator)
   - **App** target → Signing & Capabilities → Team `34M67XKNV4`, Automatic
   - **WorkoutHabitWidget** target → same Team / Automatic
   - Confirm App Groups includes `group.com.etherealgains.gymentry` on both targets
5. **Product → Clean Build Folder**, then press **▶ Run**.
6. Smoke test: sign in / OAuth return, create workout, photo upload, widget (optional).

If the widget shows “failed to launch / valid code signature”: that’s an Xcode 16+ debug-dylib issue. The widget target already has `ENABLE_DEBUG_DYLIB = NO`. Clean build, run scheme **App** only, and ignore attaching to the widget extension.

If signing fails: Apple Developer → Identifiers → enable **App Groups** on both App IDs, then Xcode → Product → Clean Build Folder and retry.

---

## 2. Archive → Upload → TestFlight

1. [App Store Connect](https://appstoreconnect.apple.com) → **Apps → +** (if needed):
   - Name: **Ethereal Gains**
   - Bundle ID: `com.etherealgains.gymentry`
   - SKU: `ethereal-gains-ios`
   - Platform: iOS
2. Xcode: set destination to **Any iOS Device (arm64)**.
3. **Product → Archive**.
4. Organizer → select archive → **Distribute App** → **App Store Connect** → **Upload**.
5. Wait for processing in App Store Connect → **TestFlight**.
6. Export compliance: should be auto-cleared (`ITSAppUsesNonExemptEncryption` = false).
7. **Internal Testing** → create group → add yourself → enable the build.
8. On iPhone: install **TestFlight** → install Ethereal Gains.

Bump `CURRENT_PROJECT_VERSION` in Xcode (or `project.pbxproj`) before every new upload. Keep marketing version `1.0` until you ship a user-facing version change.

---

## 3. App Store listing (submit after TestFlight looks good)

Required in App Store Connect → your app → **App Store** tab:

| Item | Notes |
|------|--------|
| Privacy Policy URL | `https://gym-entry-mern.vercel.app/privacy-policy` (or your custom domain) |
| Support URL | Site home or a contact page; email `support@etherealgains.com` is already in-app |
| App Privacy (nutrition labels) | Account, fitness/workout content, photos/camera as used |
| Age rating | Complete questionnaire |
| Category | Health & Fitness |
| Screenshots | 6.7" iPhone required (and others Apple prompts for) |
| Description + keywords | Short marketing copy |
| Review contact | Your email + phone |
| Demo account | Username/password if login required for review |
| Version 1.0 “What’s New” | First release notes |

### Suggested privacy nutrition labels (edit if inaccurate)

- **Contact Info** (email/name) — Account + App Functionality
- **User Content** (photos, workout posts) — App Functionality
- **Identifiers** (User ID) — App Functionality
- **Usage Data** (if analytics) — Analytics / App Functionality
- Linked to user: yes for account data; tracking: no (unless you add ad/tracking SDKs)

Submit for Review only after the same build is healthy on TestFlight.

### Preflight already done in repo

- `ITSAppUsesNonExemptEncryption` = false in Info.plist
- `PrivacyInfo.xcprivacy` on App + WorkoutHabitWidget (UserDefaults CA92.1 + 1C8F.1)
- Store sync produces `capacitor.config.json` **without** a live-reload `server.url`
- Release build validated with `xcodebuild` (CODE_SIGNING_ALLOWED=NO)
- WorkoutHabitWidget has `ENABLE_DEBUG_DYLIB = NO` (fixes Xcode 16+ device launch/signature errors)
- Shared **App** scheme launches the main app only (widget is embedded, not debugged)
