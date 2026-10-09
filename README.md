# Speqtus Medical Ordering Platform

Welcome to the Speqtus Medical Ordering Platform! This is an Expo (React Native) application with a Supabase backend and Cloudflare R2 for storage.

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (version 18 or newer recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- (Optional) [Supabase CLI](https://supabase.com/docs/guides/cli) for local database development

## Installation

1. **Install dependencies**

   Run the following command in the root of the project to install all necessary packages:
   ```bash
   npm install
   ```

2. **Set up Environment Variables**

   Copy the `.env.example` template to create your own `.env` file:
   ```bash
   cp .env.example .env
   ```
   
   Open the `.env` file and fill in the required variables for your environment:
   - `EXPO_PUBLIC_SUPABASE_URL` & `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase project URL and anon key (used by the mobile/web app).
   - `SUPABASE_SERVICE_ROLE_KEY`: Service role key for privileged access (used only in scripts/Edge Functions).
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL_PREFIX`: Cloudflare R2 configuration for image storage and CDN.

## Running the Application

You can run the application on multiple platforms using Expo.

### Start the development server
```bash
npm start
```
This will start the Expo development server. From there, you can press `w` for web, `a` for Android, or `i` for iOS.

### Run directly on Web
```bash
npm run web
```

### Run on Android
You need to have an Android Emulator running or an Android device connected.
```bash
npm run android
```

### Run on iOS (macOS only)
You need to have Xcode and an iOS Simulator installed.
```bash
npm run ios
```

## Backend (Supabase)

This project uses Supabase for authentication and database services. The `supabase` directory contains migrations and edge functions.

If you are using a local Supabase environment, you can start it using:
```bash
npx supabase start
```

This will run the local Supabase stack and apply the migrations located in `supabase/migrations`.

## Scripts Available

- `npm start` - Start Expo development server
- `npm run android` - Start the app on Android
- `npm run ios` - Start the app on iOS
- `npm run web` - Start the app in a web browser
- `npm run build:web` - Export the app for web production
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Run TypeScript type checking
- `npm run test` - Run tests

## Additional Documentation

For architectural and planning documentation, please refer to the `Planning/` directory in the repository.
