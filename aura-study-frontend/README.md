# AuraStudy MVP (Expo + React Native)

A self-contained student productivity prototype with Dashboard, task CRUD, Pomodoro focus timer, session logging, weekly mock stats, and light/dark mode.

## Requirements
- Node.js LTS
- Expo Go on your phone, or Android Studio / Xcode simulator
- Internet connection for the initial dependency install

## Run locally
```bash
npx create-expo-app@latest AuraStudy
cd AuraStudy
npx expo install @react-native-async-storage/async-storage
```
Replace the generated `App.js` with the `App.js` in this package. If your template uses an `app/` directory and Expo Router, create a blank project with the blank template or put this screen in the root App.js entry point.

Then run:
```bash
npx expo start
```
- Physical Android/iPhone: install Expo Go, scan the QR code.
- Android emulator: start an emulator in Android Studio, then press `a` in the Expo terminal.
- iOS simulator (macOS): press `i`.

## MVP features
- Dashboard with daily focus goal, active tasks, streak counter, and weekly mock activity.
- Create, edit, complete, filter, and delete tasks with priority and deadline.
- Focus/Break timer with start, pause/resume, reset, selectable focus duration, and session log.
- Light/dark mode toggle.
- Local persistence for tasks, focus sessions, daily goal, streak, and theme using AsyncStorage.
- Reset demo data from Settings.

## Notes / limitations
- Weekly chart, streak count, and initial tasks are presentation mock data. The streak counter is not yet calculated from actual consecutive days.
- Session history and task data remain on the device; there is no account sync or backend.
- A session is logged when a timer completes, or when the user chooses “End session and log elapsed time”. Pausing does not create a log.
- For a production release, add input validation/date picker, accessibility labels, tests, robust timer recovery after app backgrounding, and a backend or encrypted sync if needed.
