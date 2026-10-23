# Smart Finance: Mobile App

A personal finance tracker for Android, built with React Native and Expo. It is the mobile companion to the [Smart Finance Tracker](https://github.com/Abd1920/smart-finance-tracker) web app and uses the same backend.

Web app: https://smart-finance-tracker-drab.vercel.app

## Features

- **Accounts** in 9 currencies (LKR, QAR, USD, SAR, INR, AED, EUR, GBP, KRW) with live exchange rates and cross-currency transfers
- **Dashboard** with date filters, balances, income and expenses, upcoming dues, charts and recent transactions
- **Transactions** with search, filters (type, category, account, month, year, date range), a date-grouped list, infinite scroll, edit and delete
- **Debts & loans** (I Owe / Owe Me / Settled), net position, due-date chips, settle through any account with currency conversion
- **Reports** with monthly and yearly views, comparison with the previous period, monthly trends, savings trend, category breakdown and account balances
- **Authentication**: email and password with a verification code, Google sign-in, forgot password
- **Reminders** for debt due dates (local notifications)
- Dark, light and system themes, profile photo upload, account deletion

## Tech stack

- React Native, Expo (SDK 57), TypeScript, expo-router
- react-native-gifted-charts, react-native-svg
- axios, expo-secure-store, expo-notifications, @react-native-google-signin/google-signin
- EAS Build for installable APKs
- Backend: Node.js, Express and MongoDB (see the web app repository)

## Getting started

```bash
git clone https://github.com/Abd1920/smart-finance-mobile.git
cd smart-finance-mobile
npm install
```

The app uses native modules (Google Sign-In, notifications), so it needs a development build instead of Expo Go:

```bash
npx eas-cli build --platform android --profile development
npx expo start --dev-client
```

Install the APK on your phone, open it and scan the QR code.

## Configuration

- API base URL: `src/services/api.ts`
- Google web client ID: `src/context/AuthContext.tsx`
- Google sign-in also needs an Android OAuth client with the package name `com.abd1920.smartfinancemobile` and the SHA-1 of your signing key

## Build an installable APK

```bash
npx eas-cli build --platform android --profile preview
```

## Project structure

```
src/
  app/          screens (expo-router): tabs, login, register, forms
  components/   shared UI: form inputs, bottom sheets, charts
  context/      auth and theme
  services/     API client, notification scheduling
  utils/        currencies, categories, notification rules
```
