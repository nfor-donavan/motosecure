# MotoSecure

**Safer Riders · Smarter Transport · Stronger Cameroon**

MotoSecure is a multi-tenant SaaS platform for managing urban motorcycle
taxi ("bendskin"/okada) transport and security in Cameroon. It gives
municipal authorities, riders' syndicates and enforcement officers one
shared, trusted system built on the MERN stack (MongoDB, Express, React,
Node) plus an Expo-powered mobile app.

## The three surfaces

1. **Mayoral Command Dashboard** (`web/`) — a live view of every
   syndicate, rider and bike under a council's authority, with
   compliance alerts, an incident timeline and rider status charts.
2. **Syndicate Enrollment Portal** (`web/` — `/register`) — unions
   register their riders and motorcycles directly; council approval is
   built into the workflow.
3. **Public Enforcement App** (`mobile/`) — officers scan a rider's QR
   badge and get an instant, trustworthy verdict on their status and
   vehicle, and can log incidents on the spot.

All three surfaces share one Express/MongoDB API (`backend/`).

## Project structure

```
motosecure/
├── backend/     Express API + MongoDB models (Node.js)
├── web/         React + Vite dashboard & portals (light/dark, EN/FR)
└── mobile/      Expo React Native enforcement app (light/dark, EN/FR)
```

## Quick start

### 1. Backend API

```bash
cd backend
cp .env.example .env      # then edit MONGO_URI, JWT_SECRET, etc.
npm install
npm run seed               # populates rich demo data (see below)
npm run dev                 # starts on http://localhost:5000
```

You need a MongoDB instance — either local (`mongodb://127.0.0.1:27017`)
or a free MongoDB Atlas cluster. Paste the connection string into
`backend/.env` as `MONGO_URI`.

### 2. Web dashboard

```bash
cd web
cp .env.example .env       # points VITE_API_URL at your backend
npm install
npm run dev                  # starts on http://localhost:5173
```

Visit `http://localhost:5173` for the public landing page, or go
straight to `/login`.

### 3. Mobile enforcement app

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go, or run `npm run android` / `npm run ios`.
**Note:** edit `mobile/src/lib/api.js` and replace `localhost` with your
computer's LAN IP address if you're testing on a physical device (a
phone can't reach your laptop's `localhost`).

## Demo / presentation data

`npm run seed` (inside `backend/`) populates the database with a
realistic, ready-to-present dataset:

- **3 municipalities**: Buea (South West, fully populated & active —
  use this one for the pitch), Douala V (Littoral, standard plan), and
  Bamenda III (North West, trial plan) — showing the platform already
  scales across regions.
- **6 syndicates** across those councils, most approved and one left
  `pending` so you can demo the approval workflow live.
- **~40+ riders** with realistic mixed statuses (active, under review,
  suspended, revoked) and a few expired licenses, so every status
  filter and badge color has real examples.
- **Matching bikes** for every rider, with varied insurance expiry
  dates and a small number flagged as not roadworthy.
- **A full enforcement history** — verification scans and incident
  reports spread across the last 30 days — so the dashboard's charts,
  recent-activity feed and 30-day incident counter are populated from
  the moment you log in.

The seed script prints every demo login it creates. Key ones to
remember for a live pitch (all for the **Buea** council):

| Role | Email | Password |
|---|---|---|
| Mayor | `mayor@buea.cm` | `Mayor123!` |
| Syndicate admin | `syndicate@buea.cm` | `Syndicate123!` |
| Enforcement officer | `officer@buea.cm` | `Officer123!` |
| Platform super admin | `admin@motosecure.cm` | value of `SEED_SUPERADMIN_PASSWORD` in `.env` |

Run `npm run seed` again any time to reset to a fresh dataset.

## Design & UX

- **Branding**: built around the MotoSecure logo — deep navy and
  gold, with a Cameroon-flag accent used sparingly.
- **Light & dark mode**: toggle in the top bar (web) or Settings
  screen (mobile); the choice is remembered per device.
- **Bilingual (EN/FR)**: every screen is fully translated; switch
  languages from the top bar (web) or Settings screen (mobile).
- **Responsive**: the web dashboard collapses tables into stacked
  cards and the sidebar into a slide-over drawer on mobile screens.

## Tech stack

- **Backend**: Node.js, Express, MongoDB/Mongoose, JWT auth, bcrypt,
  QR code generation, rate limiting, Helmet.
- **Web**: React 18, Vite, Tailwind CSS, React Router, react-i18next,
  Recharts, Framer Motion.
- **Mobile**: Expo (React Native), expo-camera for QR scanning,
  React Navigation, react-i18next, AsyncStorage.

## Security notes before going to production

- Replace every default password (`Mayor123!` etc.) and the
  `JWT_SECRET` before any real deployment.
- Restrict `CLIENT_ORIGINS` in `backend/.env` to your real domains.
- Put the API behind HTTPS (e.g. via a reverse proxy or platform like
  Render/Railway) — the JWT is a bearer token and must not travel over
  plain HTTP.
- Review the `roles` in `backend/models/User.js` and adjust route
  permissions in `backend/middleware/auth.js` to match your council's
  exact governance structure before rollout.
