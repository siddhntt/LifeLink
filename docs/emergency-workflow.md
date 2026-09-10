# Emergency Workflow — LifeLink

This document describes the complete emergency blood request lifecycle from creation to fulfillment.

## Overview

```
Hospital creates request → Duplicate check → Donor filtering → Scoring → Notification
→ Donor response → Status tracking → Radius expansion (if needed) → Fulfillment
```

## Step-by-Step Workflow

### 1. Hospital Creates Emergency Request

**Endpoint:** `POST /api/emergencies`

A verified hospital submits an emergency request with:
- `bloodGroup` — Required blood group (e.g., `O_POS`)
- `requiredUnits` — Number of units needed (1–20)
- `urgency` — `NORMAL`, `URGENT`, or `EMERGENCY`
- `requiredBy` — Deadline timestamp
- `patientRef` — Optional internal patient reference
- `instructions` — Optional instructions for donors

**Automatic actions:**
- Expiry time is calculated (`config.emergency.requestExpiryHours` hours from now)
- Duplicate detection checks for similar requests from the same hospital within 1 hour
- If duplicate suspected → `flaggedForReview = true`, `flagReason` set
- Audit log entry created: `EMERGENCY_CREATED`

### 2. Emergency Search Begins

**Function:** `emergencyService.startEmergencySearch(emergencyId)`

This runs asynchronously after the HTTP response is sent:

1. Load the emergency request with hospital coordinates
2. Load radius expansion configuration from `EmergencyRadiusConfig` table
3. Start at Stage 0 (smallest radius, e.g., 5 km)
4. Call `filterAndNotifyDonors()` for the initial radius

### 3. Donor Filtering

**Function:** `donorFilterService.filterEligibleDonors(bloodGroup, lat, lng, radiusKm, excludeIds)`

The filtering pipeline:

1. **Blood Compatibility Filter** — Get all blood groups that can donate to the required group using the compatibility matrix (e.g., for `A+`: accepts `A+`, `A-`, `O+`, `O-`)
2. **Query Eligible Donors** — Find donors with:
   - Compatible blood group
   - `availability = 'AVAILABLE'`
   - `eligibilityStatus = 'ELIGIBLE'`
   - Not already in the exclude list (previously notified)
   - Have `latitude` and `longitude` set
3. **Distance Calculation** — Calculate haversine distance from hospital to each donor
4. **Radius Filter** — Keep only donors within the current search radius
5. **Scoring & Ranking** — Pass to `scoringService.rankDonors()`

### 4. Donor Scoring & Ranking

**Function:** `scoringService.rankDonors(donors, maxRadius)`

Each donor receives a weighted score (0–100) based on four configurable factors:

| Factor | Default Weight | Description |
|--------|---------------|-------------|
| **Distance** | 40% | `1 - (distanceKm / maxRadius)` — closer = higher |
| **Eligibility** | 25% | `ELIGIBLE` = 1.0, `TEMPORARILY_UNAVAILABLE` = 0.3, else 0 |
| **Availability** | 20% | `AVAILABLE` = 1.0, else 0.2 |
| **Response History** | 15% | Accept ratio + response time bonus |

**Formula:**
```
priorityScore = (distanceScore × distanceWeight +
                 eligibilityScore × eligibilityWeight +
                 availabilityScore × availabilityWeight +
                 historyScore × historyWeight) × 100
```

Weights are loaded from the `DonorScoringConfig` database table, allowing runtime tuning without code changes.

Donors are sorted by `priorityScore` descending (highest-priority first).

### 5. Push Notification Delivery

**Function:** `notificationService.createNotification(userId, 'EMERGENCY_REQUEST', ...)`

For each eligible donor (up to `config.emergency.maxDonorsPerBatch`):

1. Create an `EmergencyDonorResponse` record with status `NOTIFIED`
2. Create an in-app `Notification` record
3. Check `NotificationPreference` — skip push if disabled
4. Send FCM push notification via `firebase.sendPushNotification()`
5. The notification includes the emergency request ID for deep linking
6. Emit Socket.IO event: `emergency:notification-sent`

### 6. Donor Response

**Endpoint:** `POST /api/emergencies/:id/respond`

A donor can respond with:
- `ACCEPTED` — Willing to donate, will head to the hospital
- `REJECTED` — Cannot donate right now

**On response:**
1. Update `EmergencyDonorResponse.status`
2. Record `responseTimeMs` (time between notification and response)
3. Update the emergency request counters (`respondedCount`, `acceptedUnits`)
4. Update donor's profile stats (`responseCount`, `acceptCount`)
5. Set `activeEmergencyId` on the donor profile if accepted
6. Emit Socket.IO event: `emergency:donor-response`
7. If `acceptedUnits >= requiredUnits` → mark as `FULFILLED`

### 7. Radius Expansion

**Function:** `emergencyService.scheduleRadiusExpansion(emergencyId, stages, currentStage)`

If not enough donors respond within the configured wait time:

1. A timer fires after `responseWaitMs` (default: 5 minutes per stage)
2. Check if the request is still active and not fulfilled
3. Expand to the next radius stage
4. Create `EmergencyRadiusLog` record documenting the expansion
5. Update `currentRadiusKm` on the emergency request
6. Run `filterAndNotifyDonors()` with the new radius (excluding already-notified donors)
7. Emit Socket.IO event: `emergency:radius-expanded`
8. Schedule the next expansion (if more stages exist)

**Default radius stages (configurable in DB):**

| Stage | Radius | Wait Time |
|-------|--------|-----------|
| 0 | 5 km | 5 min |
| 1 | 10 km | 5 min |
| 2 | 20 km | 5 min |
| 3 | 50 km | 5 min |

### 8. Hospital Tracks Progress

**Page:** `EmergencyRequestDetail.jsx`

The hospital sees a real-time dashboard showing:
- Number of donors notified, responded, accepted
- Current search radius
- Donor list with names, distances, scores, and statuses
- Radius expansion history timeline
- Buttons to mark donors as `ARRIVED` or `DONATION_COMPLETED`

All updates arrive via Socket.IO events — no polling needed.

### 9. Donor Status Updates

**Endpoint:** `PATCH /api/emergencies/:id/responses/:responseId`

Hospital staff can update a donor's status:
- `ARRIVED` — Donor has arrived at the hospital
- `DONATION_COMPLETED` — Donation successfully completed

### 10. Fulfillment

When `acceptedUnits >= requiredUnits`:
1. Emergency status changes to `FULFILLED`
2. Radius expansion timer is cancelled
3. No further notifications are sent
4. Audit log entry created: `EMERGENCY_FULFILLED`
5. Socket.IO event emitted: `emergency:fulfilled`

### 11. Expiry & Cleanup

**Function:** `scheduler.js` (runs via `node-cron`)

- Every 10 minutes: check for expired requests (`expiresAt < now`, status still active)
- Mark expired requests as `EXPIRED`
- Cancel any pending radius expansion timers

### 12. Cancellation

**Endpoint:** `PATCH /api/emergencies/:id/cancel`

A hospital can cancel an active request:
1. Status changes to `CANCELLED`
2. `cancelledAt` timestamp recorded
3. Audit log entry: `EMERGENCY_CANCELLED`
4. Socket.IO event: `emergency:cancelled`

## Socket.IO Events

| Event | Direction | Payload | Trigger |
|-------|-----------|---------|---------|
| `emergency:notification-sent` | Server → Client | `{ requestId, donorCount }` | After batch notifications sent |
| `emergency:donor-response` | Server → Client | `{ requestId, donorProfileId, response, donorName }` | Donor accepts/rejects |
| `emergency:radius-expanded` | Server → Client | `{ requestId, fromRadius, toRadius, newDonorsNotified }` | Auto-expansion fires |
| `emergency:fulfilled` | Server → Client | `{ requestId, acceptedUnits }` | Sufficient donors accepted |
| `emergency:cancelled` | Server → Client | `{ requestId, status }` | Hospital cancels request |

Clients join an emergency room via: `socket.emit('join-emergency', emergencyId)`

## Duplicate Detection

When a hospital creates an emergency request, the system checks for existing requests from the same hospital with:
- Same blood group
- Created within the last 1 hour
- Status is not `CANCELLED` or `EXPIRED`

If found, the new request is flagged (`flaggedForReview = true`) but **still processed**. Admins can review flagged requests via the admin dashboard.

## Future: ML-Ready Scoring

The scoring engine is designed for ML replacement:
- `scoringService.rankDonors()` has a clean input/output interface
- Input: array of donor objects with features
- Output: same array with `priorityScore` added
- Weights are configurable in the database
- The function can be swapped with an ML model call without changing the rest of the pipeline
