# Naal — day planner (Android app + web app)

Oru visual timeline day planner. Android app (React Native / Expo) and web app (Next.js)
rendum same Firebase account use pannum — phone-la add panna task computer-la udane varum.

```
naal-planner/
├── packages/shared/   ← core logic (tasks, repeat, timeline, Firestore sync) — rendu app-um use pannum
├── apps/web/          ← Next.js web app
├── apps/mobile/       ← Expo (React Native) Android app
└── firestore.rules    ← database security rules
```

**Features:** day timeline with task pills (height = duration), live "now" line and progress,
free-time gaps (tap to add a task there), week strip with colour dots, month calendar,
Anytime tasks, Inbox for unscheduled ideas, repeat (daily / weekdays / weekly),
"delete only this day" for repeating tasks, day progress bar, dark mode, offline support.

---

## 1. Computer-la install pannanum

- **Node.js 22 LTS** — https://nodejs.org
- Project folder-la terminal open panni:

```bash
npm install
```

## 2. Firebase setup (free "Spark" plan — card thevai illa)

1. https://console.firebase.google.com → **Add project** → peru kudunga (e.g. `naal-planner`). Google Analytics off pannalam.
2. **Build → Authentication → Get started** → **Email/Password** enable pannunga.
   (Web-la Google login venum-na **Google** provider-um enable pannunga.)
3. **Build → Firestore Database → Create database** → location **asia-south1 (Mumbai)** → **Production mode**.
4. Firestore → **Rules** tab → `firestore.rules` file content-a paste panni **Publish**.
   (Idhu illana ungal data yaar venaalum padikkalam — skip pannaadheenga.)
5. **Project settings (⚙️) → Your apps → Web (</>)** → app register pannunga → `firebaseConfig` values copy pannunga.

## 3. Config values podunga

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
```

Rendu file-layum Firebase config values fill pannunga (same values dhaan, prefix mattum vera).

## 4. Web app run pannunga

```bash
npm run web
```

Browser-la http://localhost:3000 open pannunga → account create pannunga.

## 5. Phone-la test pannunga (development)

1. Phone-la Play Store-la irundhu **Expo Go** install pannunga.
2. Computer and phone same Wi-Fi-la irukkanum.
3. ```bash
   npm run mobile
   ```
4. Terminal-la vara QR code-a Expo Go app-la scan pannunga. Web-la create panna same email/password-la login pannunga.

Code maathina udane phone-la auto reload aagum.

## 6. Real APK build pannunga (phone-la permanent-aa install panna)

Expo-oda free EAS build service use pannalam (free account-la monthly konja builds free).

1. `apps/mobile/eas.json` file-la `"env"` section-la Firebase values fill pannunga.
2. ```bash
   npm install -g eas-cli
   eas login            # free account at https://expo.dev/signup
   cd apps/mobile
   eas build -p android --profile preview
   ```
3. Build mudinjadhum (~10–20 min) oru download link + QR varum. Phone-la open panni APK download pannunga.
4. Android "Install unknown apps" permission ask pannum → allow → install. Mudinjadhu! 🎉

App update panna: code maathittu `eas build` thirumba run panni pudhu APK install pannunga (data Firebase-la irukkadhala pogaadhu).

> Android Studio already irundha, free build limits illama local-aa build pannalam:
> `cd apps/mobile && npx expo run:android --variant release`

## 7. Web app-a free-aa online-la host panna (optional)

1. Code-a GitHub-la push pannunga.
2. https://vercel.com → **Add New Project** → repo select → **Root Directory: `apps/web`**.
3. Environment Variables-la `.env.local` values add panni **Deploy**.
4. Firebase → Authentication → **Settings → Authorized domains** → unga `xxx.vercel.app` domain add pannunga.

---

## Data model

Firestore path: `users/{uid}/tasks/{taskId}` — ovvoru user-um avanga tasks mattum dhaan paakka mudiyum.

```ts
{ title, emoji, color, date: "2026-09-27" | null (Inbox), start: minutes | null (Anytime),
  duration, repeat: "none" | "daily" | "weekdays" | "weekly",
  notes, done, doneDates[], skipDates[], createdAt, updatedAt }
```

## Next ideas to add

Task reminders (`expo-notifications`), subtasks, focus timer, Google Calendar import,
home-screen widget, drag to reschedule.

## Troubleshooting

- **"Component auth has not been registered yet"** (mobile) → `apps/mobile/metro.config.js` create pannunga:
  ```js
  const { getDefaultConfig } = require("expo/metro-config");
  const config = getDefaultConfig(__dirname);
  config.resolver.sourceExts.push("cjs");
  config.resolver.unstable_enablePackageExports = false;
  module.exports = config;
  ```
- **"Missing or insufficient permissions"** → Step 2.4 Firestore rules publish pannalaya nu check pannunga.
- **Expo Go "incompatible SDK"** → Play Store-la Expo Go update pannunga, illana `cd apps/mobile && npx expo install --fix`.
