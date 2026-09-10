# LifeLink Architecture

## System Overview

LifeLink is a full-stack web application built with a React frontend and Express.js backend, connected via REST API and WebSocket (Socket.IO) for real-time features.

## Architecture Diagram

```mermaid
graph TB
    subgraph Frontend["Frontend (React + Vite)"]
        LP[Landing Page]
        Auth[Auth Context]
        DD[Donor Dashboard]
        HD[Hospital Dashboard]
        BBD[Blood Bank Dashboard]
        AD[Admin Dashboard]
        SIO_C[Socket.IO Client]
    end

    subgraph Backend["Backend (Express.js)"]
        MW[Middleware Layer]
        RC[Route Controllers]
        SVC[Service Layer]
        SIO_S[Socket.IO Server]
        CRON[node-cron Scheduler]
    end

    subgraph Services["Business Logic Services"]
        ES[Emergency Service]
        DFS[Donor Filter Service]
        SS[Scoring Service]
        ELS[Eligibility Service]
        IS[Inventory Service]
        AS[Appointment Service]
        NS[Notification Service]
    end

    subgraph External["External Services"]
        FB[Firebase Auth]
        FCM[Firebase Cloud Messaging]
        PG[(PostgreSQL)]
    end

    Frontend -->|REST API| MW
    SIO_C <-->|WebSocket| SIO_S
    MW --> RC --> SVC
    SVC --> Services
    ES --> DFS --> SS
    ES --> NS --> FCM
    ELS --> PG
    IS --> PG
    AS --> PG
    NS --> PG
    Auth --> FB
    CRON --> PG
```

## Data Flow — Emergency Request

```mermaid
sequenceDiagram
    participant H as Hospital
    participant API as Express API
    participant ES as EmergencyService
    participant DFS as DonorFilterService
    participant SS as ScoringService
    participant NS as NotificationService
    participant FCM as Firebase FCM
    participant SIO as Socket.IO
    participant D as Donor

    H->>API: POST /api/emergencies
    API->>ES: startEmergencySearch(id)
    ES->>DFS: filterEligibleDonors(bloodGroup, radius)
    DFS->>SS: rankDonors(eligible, maxRadius)
    SS-->>DFS: ranked donors
    DFS-->>ES: filtered & ranked donors
    ES->>NS: createNotification(donorId, EMERGENCY_REQUEST)
    NS->>FCM: sendPushNotification(tokens)
    FCM-->>D: Push notification
    ES->>SIO: emit("emergency:notification-sent")
    SIO-->>H: Live update

    D->>API: POST /api/emergencies/:id/respond
    API->>ES: handleDonorResponse(id, donorId, ACCEPTED)
    ES->>SIO: emit("emergency:donor-response")
    SIO-->>H: Live update

    Note over ES: If insufficient responses after timeout...
    ES->>ES: expandRadius()
    ES->>DFS: filterEligibleDonors(bloodGroup, newRadius)
    ES->>SIO: emit("emergency:radius-expanded")

    Note over ES: When acceptedUnits >= requiredUnits
    ES->>ES: markFulfilled()
    ES->>SIO: emit("emergency:fulfilled")
```

## Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o| DonorProfile : "has"
    User ||--o| Hospital : "has"
    User ||--o| BloodBank : "has"
    User ||--o| NGO : "has"
    User ||--o{ DeviceToken : "has"
    User ||--o{ Notification : "receives"
    User ||--o| NotificationPreference : "has"

    Hospital ||--o{ EmergencyRequest : "creates"
    Hospital ||--o{ BloodRequest : "creates"

    EmergencyRequest ||--o{ EmergencyDonorResponse : "has"
    EmergencyRequest ||--o{ EmergencyRadiusLog : "has"
    DonorProfile ||--o{ EmergencyDonorResponse : "receives"

    BloodBank ||--o{ BloodInventory : "manages"
    BloodBank ||--o{ AppointmentSlot : "offers"
    BloodBank ||--o{ Donation : "records"
    BloodBank ||--o{ DonationCamp : "organizes"

    NGO ||--o{ DonationCamp : "organizes"
    DonorProfile ||--o{ Donation : "makes"
    DonorProfile ||--o{ Appointment : "books"
    DonorProfile ||--o{ CampRegistration : "registers"

    AppointmentSlot ||--o{ Appointment : "has"
    DonationCamp ||--o{ CampRegistration : "has"
```

## Layer Architecture

### Middleware Layer
- **`auth.js`** — Firebase token verification, JWT session management, role-based authorization
- **`validate.js`** — Zod schema validation for request bodies and query parameters
- **`rateLimiter.js`** — Configurable rate limiting per endpoint
- **`errorHandler.js`** — Global error handling with Prisma error translation

### Controller Layer
Controllers handle HTTP request/response and delegate to services:
- `authController` — Firebase verify, JWT issue, logout
- `donorController` — Profile CRUD, availability toggle, dashboard
- `hospitalController` — Registration, emergency CRUD, donor response management
- `bloodBankController` — Inventory, appointments, donations, blood search
- `campController` — NGO registration, camp CRUD, appointments, check-in
- `adminController` — Dashboard analytics, user management, verification
- `notificationController` — Device tokens, notification listing, preferences

### Service Layer
Services contain business logic and are database-aware:
- **`emergencyService`** — Core emergency workflow, radius expansion, donor notification orchestration
- **`donorFilterService`** — Blood compatibility filtering, eligibility check, distance filtering
- **`scoringService`** — Weighted donor ranking algorithm (ML-ready interface)
- **`eligibilityService`** — Configurable eligibility rules from database
- **`inventoryService`** — Transactional inventory operations
- **`appointmentService`** — Appointment booking with overbooking prevention
- **`notificationService`** — FCM push + in-app notification creation

### Utility Layer
- **`bloodCompatibility.js`** — ABO+Rh donor compatibility matrix
- **`distance.js`** — Haversine formula for geo-distance
- **`helpers.js`** — AppError class, async handler, response formatters

## Security Model

1. **Authentication**: Firebase Phone OTP → Firebase ID Token → Backend verification → JWT session
2. **Authorization**: Role-based middleware (`DONOR`, `HOSPITAL`, `BLOOD_BANK`, `CAMP_ORGANIZER`, `ADMIN`)
3. **Data Privacy**: Donor phone numbers only exposed to hospitals for accepted emergency responses
4. **Validation**: Zod schemas on all endpoints
5. **Rate Limiting**: Configurable per-endpoint limits
6. **Audit Trail**: AuditLog table tracks all critical operations

## Configuration

All business rules are database-configurable:
- **`EligibilityRule`** — min age, max age, min weight, donation interval
- **`DonorScoringConfig`** — scoring weights for each factor
- **`EmergencyRadiusConfig`** — radius stages and wait times
