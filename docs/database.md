# LifeLink Database Schema

## Overview

LifeLink uses PostgreSQL with Prisma ORM. The schema contains **18 models** covering users, donors, hospitals, blood banks, emergency requests, inventory, appointments, camps, and notifications.

## Entity Relationship

```
User (1) ──── (0..1) DonorProfile
User (1) ──── (0..1) Hospital
User (1) ──── (0..1) BloodBank
User (1) ──── (0..1) NGO
User (1) ──── (0..*) DeviceToken
User (1) ──── (0..*) Notification
User (1) ──── (0..1) NotificationPreference

Hospital (1) ──── (0..*) EmergencyRequest
Hospital (1) ──── (0..*) BloodRequest

EmergencyRequest (1) ──── (0..*) EmergencyDonorResponse
EmergencyRequest (1) ──── (0..*) EmergencyRadiusLog

DonorProfile (1) ──── (0..*) EmergencyDonorResponse
DonorProfile (1) ──── (0..*) Donation
DonorProfile (1) ──── (0..*) Appointment
DonorProfile (1) ──── (0..*) CampRegistration

BloodBank (1) ──── (0..*) BloodInventory
BloodBank (1) ──── (0..*) AppointmentSlot
BloodBank (1) ──── (0..*) Donation
BloodBank (1) ──── (0..*) DonationCamp

NGO (1) ──── (0..*) DonationCamp

AppointmentSlot (1) ──── (0..*) Appointment
DonationCamp (1) ──── (0..*) CampRegistration
```

## Enums

| Enum | Values |
|------|--------|
| `UserRole` | `DONOR`, `HOSPITAL`, `BLOOD_BANK`, `CAMP_ORGANIZER`, `ADMIN` |
| `AccountStatus` | `ACTIVE`, `INACTIVE`, `SUSPENDED` |
| `VerificationStatus` | `PENDING`, `VERIFIED`, `REJECTED` |
| `BloodGroup` | `A_POS`, `A_NEG`, `B_POS`, `B_NEG`, `AB_POS`, `AB_NEG`, `O_POS`, `O_NEG` |
| `EmergencyStatus` | `CREATED`, `SEARCHING`, `PARTIALLY_FULFILLED`, `FULFILLED`, `CANCELLED`, `EXPIRED` |
| `DonorResponseStatus` | `NOTIFIED`, `VIEWED`, `ACCEPTED`, `REJECTED`, `NO_SHOW`, `ARRIVED`, `DONATION_COMPLETED` |
| `RequestUrgency` | `NORMAL`, `URGENT`, `EMERGENCY` |
| `EligibilityStatus` | `ELIGIBLE`, `TEMPORARILY_UNAVAILABLE`, `NEEDS_MEDICAL_REVIEW` |
| `AvailabilityStatus` | `AVAILABLE`, `NOT_AVAILABLE` |
| `AppointmentStatus` | `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW` |
| `DonationType` | `WHOLE_BLOOD`, `PLATELETS`, `PLASMA` |
| `InventoryStatus` | `AVAILABLE`, `RESERVED`, `EXPIRED`, `USED` |
| `CampStatus` | `PENDING_APPROVAL`, `APPROVED`, `ACTIVE`, `COMPLETED`, `CANCELLED` |
| `Gender` | `MALE`, `FEMALE`, `OTHER`, `PREFER_NOT_TO_SAY` |

## Core Models

### User
Central authentication model linked to Firebase Auth.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `firebaseUid` | String | Unique, from Firebase Auth |
| `phone` | String | Unique, verified via OTP |
| `fullName` | String? | Set during registration |
| `role` | UserRole | Determines dashboard and permissions |
| `accountStatus` | AccountStatus | Default: `ACTIVE` |
| `verificationStatus` | VerificationStatus | Default: `PENDING` |
| `profileComplete` | Boolean | Default: `false` |
| `lastLoginAt` | DateTime? | Updated on each login |

### DonorProfile
Extended profile for donors with medical/location info.

| Field | Type | Notes |
|-------|------|-------|
| `bloodGroup` | BloodGroup? | Required for matching |
| `latitude` / `longitude` | Float? | Used for distance calculation |
| `weight` | Float? | Eligibility check |
| `dateOfBirth` | DateTime? | Age eligibility check |
| `lastDonationDate` | DateTime? | Cooldown period check |
| `availability` | AvailabilityStatus | Default: `AVAILABLE` |
| `eligibilityStatus` | EligibilityStatus | Default: `ELIGIBLE` |
| `totalDonations` | Int | Lifetime count |
| `responseCount` / `acceptCount` | Int | Emergency response stats |
| `activeEmergencyId` | String? | Currently responding to |

### EmergencyRequest
Core emergency model tracking the full lifecycle.

| Field | Type | Notes |
|-------|------|-------|
| `hospitalId` | FK → Hospital | Creating hospital |
| `bloodGroup` | BloodGroup | Required blood type |
| `requiredUnits` | Int | Number of units needed |
| `urgency` | RequestUrgency | Default: `EMERGENCY` |
| `status` | EmergencyStatus | Lifecycle state |
| `currentRadiusKm` | Float | Current search radius |
| `maxRadiusKm` | Float | Maximum allowed radius |
| `notifiedCount` | Int | Total donors notified |
| `respondedCount` | Int | Donors who responded |
| `acceptedUnits` | Int | Units accepted so far |
| `flaggedForReview` | Boolean | Duplicate detection flag |
| `expiresAt` | DateTime | Auto-expiry time |

### EmergencyDonorResponse
Tracks each donor's involvement in an emergency.

| Field | Type | Notes |
|-------|------|-------|
| `emergencyRequestId` | FK → EmergencyRequest | |
| `donorProfileId` | FK → DonorProfile | |
| `status` | DonorResponseStatus | NOTIFIED → ACCEPTED/REJECTED → ARRIVED → COMPLETED |
| `distanceKm` | Float? | Distance at time of notification |
| `priorityScore` | Float? | Computed ranking score |
| `responseTimeMs` | Int? | Time to respond (ms) |
| `notifiedAtRadiusKm` | Float? | Radius when notified |

## Configuration Models

### EligibilityRule
Database-configurable eligibility rules.

| Key | Default | Description |
|-----|---------|-------------|
| `minAge` | 18 | Minimum donor age |
| `maxAge` | 65 | Maximum donor age |
| `minWeight` | 45 | Minimum weight (kg) |
| `minDonationIntervalDays` | 90 | Cooldown between donations |

### DonorScoringConfig
Configurable weights for donor ranking.

| Key | Default Weight | Description |
|-----|---------------|-------------|
| `distance` | 0.40 | Proximity to hospital |
| `eligibility` | 0.25 | Current eligibility status |
| `availability` | 0.20 | Donor availability |
| `responseHistory` | 0.15 | Past response behavior |

### EmergencyRadiusConfig
Automatic radius expansion stages.

| Stage | Radius | Wait Time |
|-------|--------|-----------|
| 0 | 5 km | 5 min |
| 1 | 10 km | 5 min |
| 2 | 20 km | 5 min |
| 3 | 50 km | 5 min |

## Indexes

Key composite indexes for query performance:
- `EmergencyDonorResponse`: `(emergencyRequestId, donorProfileId)` — unique
- `CampRegistration`: `(campId, donorProfileId)` — unique
- `DeviceToken`: `(token)` — unique
- `BloodInventory`: `(bloodBankId, bloodGroup)`
- `Notification`: `(userId, isRead, createdAt)`
- `DonorProfile`: `(bloodGroup, availability, eligibilityStatus)`

## Audit Trail

The `AuditLog` model tracks critical operations:

| Action | Triggered When |
|--------|---------------|
| `EMERGENCY_CREATED` | Hospital creates emergency request |
| `EMERGENCY_FULFILLED` | Sufficient donors accept |
| `EMERGENCY_CANCELLED` | Hospital cancels request |
| `HOSPITAL_VERIFIED` | Admin verifies hospital |
| `BLOOD_BANK_VERIFIED` | Admin verifies blood bank |
| `NGO_VERIFIED` | Admin verifies NGO |
| `USER_DEACTIVATED` | Admin suspends/deactivates user |
| `CAMP_CREATED` | Admin approves camp |
