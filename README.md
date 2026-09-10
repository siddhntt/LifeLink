# LifeLink – Smart Blood Donation & Emergency Response Platform

LifeLink is a full-stack blood donation coordination platform focused on **real-time emergency donor matching**. It connects verified hospitals with eligible, available donors using intelligent filtering, smart prioritization, push notifications, automatic radius expansion, and live Socket.IO tracking.

## Problem Statement

During medical emergencies, hospitals need compatible blood quickly. Traditional systems lack real-time donor coordination, intelligent matching, and automated search expansion when nearby donors don't respond. LifeLink solves this by providing an intelligent, real-time emergency response pipeline.

## Key Differentiators

| Feature | Description |
|---------|-------------|
| 🎯 **Intelligent Eligible-Donor Filtering** | Filters by blood compatibility, donation cooldown, age, weight, and availability |
| 📊 **Smart Donor Prioritization** | 4-factor weighted scoring: distance (40%), eligibility (25%), availability (20%), response history (15%) |
| 🔔 **Emergency Push Notifications** | FCM-powered real-time alerts to the highest-ranked eligible donors |
| 📡 **Automatic Radius Expansion** | Configurable stages (5 → 10 → 20 → 50 km) with timed auto-expansion |
| ⚡ **Real-Time Donor Response Tracking** | Socket.IO live updates as donors accept, arrive, and donate |
| 🕐 **Donor Availability Management** | Donors control when they're available for emergency requests |
| 🛡 **Emergency Request Verification** | Duplicate detection flags suspicious requests for admin review |
| 🤖 **ML-Ready Scoring Pipeline** | Deterministic scoring designed for future ML model replacement |

## Features

- **Phone OTP authentication** via Firebase Authentication
- **Role-based dashboards** for Donors, Hospitals, Blood Banks, NGOs, and Admins
- **Configurable eligibility engine** (informational screening only — not medical diagnosis)
- **Emergency blood requests** with smart donor filtering and prioritization
- **Automatic radius expansion** with configurable stages via database
- **FCM push notifications** for emergencies, appointments, and camp reminders
- **Real-time tracking** via Socket.IO with room-based emergency subscriptions
- **Blood inventory management** with transactional reserve/release
- **Appointment booking** with slot capacity control and overbooking prevention
- **Donation camps** with registration, QR check-in, and capacity tracking
- **Admin verification** for hospitals, blood banks, NGOs, and camps
- **Blood availability search** with distance-based results
- **Audit logging** for all critical operations
- **Scheduled jobs** for expiry cleanup and appointment reminders

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, Vite, Tailwind CSS v4, React Router 7, Axios, Lucide Icons, Leaflet, Socket.IO Client |
| Backend | Node.js, Express, Socket.IO, Zod, node-cron, Swagger |
| Database | PostgreSQL 14+, Prisma ORM |
| Auth | Firebase Auth (Phone OTP) + Firebase Admin SDK + JWT Sessions |
| Notifications | Firebase Cloud Messaging (FCM) |
| Testing | Jest |

## Project Structure

```
LifeLink/
├── frontend/                  # React + Vite SPA
│   ├── src/
│   │   ├── components/        # Shared UI components
│   │   ├── context/           # Auth context (Firebase + JWT)
│   │   ├── hooks/             # Custom hooks (useFCM)
│   │   ├── layouts/           # DashboardLayout with role-based nav
│   │   ├── pages/             # Route pages by role
│   │   │   ├── admin/         # Admin dashboard, users, verification
│   │   │   ├── blood-bank/    # Inventory, appointments, donations
│   │   │   ├── camps/         # Camp listing, detail, management
│   │   │   ├── donor/         # Dashboard, profile, appointments
│   │   │   └── hospital/      # Dashboard, emergency requests
│   │   ├── services/          # API endpoint functions
│   │   └── utils/             # Constants, formatters
│   └── public/                # FCM service worker
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Full database schema (18 models)
│   │   └── seed.js            # Demo data seeder
│   ├── src/
│   │   ├── config/            # Database, Firebase, app config
│   │   ├── controllers/       # Request handlers (7 controllers)
│   │   ├── middleware/        # Auth, validation, error handling, rate limiting
│   │   ├── routes/            # Express route definitions (11 route files)
│   │   ├── services/          # Business logic
│   │   │   ├── emergencyService.js      # Core emergency workflow
│   │   │   ├── donorFilterService.js    # Donor filtering pipeline
│   │   │   ├── scoringService.js        # Weighted donor scoring
│   │   │   ├── eligibilityService.js    # Configurable eligibility rules
│   │   │   ├── inventoryService.js      # Blood inventory operations
│   │   │   ├── appointmentService.js    # Appointment booking logic
│   │   │   └── notificationService.js   # FCM + in-app notifications
│   │   ├── utils/             # Helpers, blood compatibility, distance
│   │   └── validators/        # Zod validation schemas
│   └── tests/                 # Jest test suite
├── docs/                      # Architecture & workflow documentation
└── README.md
```

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Firebase project with Phone Auth and FCM enabled

## Setup

### 1. Clone and install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill in `DATABASE_URL`, Firebase credentials, and JWT secret. See `.env.example` files for all required variables.

### 3. Database setup

```bash
cd backend
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Run migrations
npm run db:seed        # Seed demo data
```

### 4. Run development servers

```bash
# Terminal 1 — Backend (port 5000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

- **Frontend:** http://localhost:5173
- **API:** http://localhost:5000/api
- **Swagger docs:** http://localhost:5000/api/docs

## Demo Data

The seed script creates labeled demo accounts. Firebase UIDs are placeholders — use real Firebase phone auth in development:

| Role | Phone | Name |
|------|-------|------|
| Admin | +919000000001 | Demo Admin |
| Hospital | +919000000050 | City General Hospital |
| Blood Bank | +919000000200 | LifeBlood Center |
| NGO / Camp Organizer | +919000000300 | Hope Foundation |
| Donors (×15) | +919000000101 – +919000000115 | Demo Donor 1–15 |

Seeded data also includes:
- 6 blood group inventory entries
- 1 donation camp (2 weeks ahead)
- 1 appointment slot
- Eligibility rules, scoring weights, and radius expansion configs

## Testing

```bash
cd backend
npm test
```

Tests cover:
- Blood compatibility (universal donor/recipient, all group combinations)
- Haversine distance calculation (same point, cross-city, edge cases)
- Eligibility engine (age, weight, cooldown, missing data)
- Donor scoring (distance score, eligibility score, ranking order)

## Emergency Workflow

```
Hospital creates request → System filters eligible donors → Ranks by weighted score
→ Sends FCM notifications → Donors respond (accept/reject) → Socket.IO live updates
→ If insufficient responses → Auto-expands radius → Repeats filtering → Fulfilled
```

See [docs/emergency-workflow.md](docs/emergency-workflow.md) for the complete step-by-step documentation.

## API Endpoints

| Resource | Methods | Auth Required |
|----------|---------|---------------|
| `/api/auth` | POST verify, POST logout | Public / Auth |
| `/api/donors` | GET/PUT profile, dashboard, history, availability | DONOR |
| `/api/hospitals` | POST register, GET/PUT profile, dashboard | HOSPITAL |
| `/api/emergencies` | CRUD + respond + status updates | HOSPITAL, DONOR |
| `/api/blood-banks` | Register, inventory, slots, donations, search | BLOOD_BANK |
| `/api/blood-requests` | CRUD for normal blood requests | HOSPITAL |
| `/api/camps` | List, create, register, check-in | Various |
| `/api/appointments` | Book, list, update status | DONOR, BLOOD_BANK |
| `/api/notifications` | List, read, device tokens, preferences | Auth |
| `/api/locations` | Nearby search (blood banks, hospitals, camps) | Optional |
| `/api/admin` | Dashboard, users, verification, flagged requests | ADMIN |

See [docs/api.md](docs/api.md) for detailed request/response examples.

## Documentation

- [Architecture](docs/architecture.md) — System design, data flow, ER diagram
- [API Overview](docs/api.md) — All endpoints with examples
- [Database Schema](docs/database.md) — Models, relationships, indexes
- [Emergency Workflow](docs/emergency-workflow.md) — Step-by-step emergency process

## Security & Privacy

- Donor phone numbers are only visible to hospitals for accepted emergency donors
- Exact donor locations are never exposed to the public
- All health-related data is treated as sensitive
- Firebase Authentication ensures phone verification
- JWT sessions with configurable expiry
- Rate limiting on all API endpoints
- Input validation via Zod on all endpoints

## Medical Disclaimer

LifeLink provides **informational eligibility screening** only. Final donation eligibility must always be determined by qualified medical personnel at a blood bank or hospital according to applicable guidelines. This platform does not make medical diagnoses.

## License

MIT
