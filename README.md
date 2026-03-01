# Quiz Builder (Vite + Firebase)

This app supports two modes in one page:

- Builder mode (`/`) - create a quiz and save it to Firestore
- Quiz mode (`/?quiz=<id>`) - load and solve a quiz by shared link

## 1) Install dependencies

```bash
npm install
```

## 2) Configure environment

Create `.env.local` from `.env.example` and fill your Firebase web config:

```bash
cp .env.example .env.local
```

Expected variables:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## 3) Firestore setup

Create a Firestore database and collection usage will be automatic (`quizzes`).

Recommended minimal Firestore rules for public quiz links:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /quizzes/{quizId} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if false;
    }
  }
}
```

Note: This is open for writes. For production, add Firebase Auth + stricter limits.

## 4) Run locally

```bash
npm run dev
```

## 5) Build for GitHub Pages

`vite.config.ts` uses `base: "./"`, so build output works from a repo subpath.

```bash
npm run build
```

Deploy the `dist/` folder using GitHub Pages (branch/folder strategy or GitHub Actions).
