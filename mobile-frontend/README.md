# Syscall mobile frontend

The mobile app is implemented with Expo Router and native React Native views. It calls the Syscall API directly; it does not load the web deployment or use a WebView. The UI follows the responsive web app's Inter and Outfit typefaces, colors, spacing, mobile header, category chips, message rows, mailbox drawer, and bottom compose action.

## Expo Go on Android and iOS

1. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` to an API address reachable from the phone. On a physical phone, use the development computer's LAN IP and keep both devices on the same network. The API uses port `3000` by default.
2. Start the API service, then run:

   ```powershell
   npm run start:go
   ```

3. Scan the Metro QR code using Expo Go on Android or iOS.

The native UI and API flows run in Expo Go. Remote push delivery requires a development build on both platforms; Expo Go cannot test remote push on Android from SDK 53 onward. Notification token registration and notification-open navigation are enabled in development and standalone builds.

## Remote push notifications

The API stores Expo push tokens per signed-in user. Incoming messages are queued by the SMTP service and delivered by the worker through Expo Push Service. Notification payloads include the message ID so tapping one opens the native reader.

1. Link the app to an EAS project from this directory using `npx eas-cli@latest init`.
2. Put the EAS project ID in `EXPO_PUBLIC_EAS_PROJECT_ID` in `.env`.
3. Configure Android FCM v1 credentials and the iOS APNs key in EAS.
4. Build and install a development client:

   ```powershell
   npx eas-cli@latest build --profile development --platform android
   npx eas-cli@latest build --profile development --platform ios
   npm run start:dev-client
   ```

An Apple Developer account is required for iOS device push credentials.

## API address

`EXPO_PUBLIC_API_URL` is the API service root without a trailing slash. Docker Compose exposes it on port `3000` by default. For a physical phone, use the computer's LAN address. For an Android emulator use `http://10.0.2.2:3000`; for the iOS simulator use `http://localhost:3000`. Production builds should use a public HTTPS URL.
