# LifeLink API Documentation

Base URL: `http://localhost:5000/api`

All authenticated endpoints require: `Authorization: Bearer <JWT_TOKEN>`

## Authentication

### POST `/auth/verify`
Verify Firebase ID token and create/login user.

**Request:**
```json
{
  "idToken": "firebase-id-token",
  "role": "DONOR",
  "fullName": "Amit Sharma"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "jwt-session-token",
    "user": {
      "id": "uuid",
      "phone": "+919876543210",
      "fullName": "Amit Sharma",
      "role": "DONOR",
      "profileComplete": false
    }
  }
}
```

### POST `/auth/logout`
Invalidate device token (optional).

**Request:**
```json
{ "deviceToken": "fcm-token-to-remove" }
```

---

## Donor Endpoints

### GET `/donors/dashboard`
Returns donor dashboard data including profile, evaluation, donations, appointments, emergency responses, and nearby camps.

### GET `/donors/profile`
Returns donor profile with eligibility evaluation.

### PUT `/donors/profile`
Update donor profile.

**Request:**
```json
{
  "bloodGroup": "O_POS",
  "dateOfBirth": "1995-01-15",
  "weight": 65,
  "city": "Mumbai",
  "state": "Maharashtra",
  "latitude": 19.076,
  "longitude": 72.877
}
```

### PATCH `/donors/availability`
Toggle donor availability.

**Request:**
```json
{ "availability": "AVAILABLE" }
```

### GET `/donors/history`
Returns donation history.

---

## Hospital Endpoints

### POST `/hospitals/register`
Register hospital profile.

**Request:**
```json
{
  "name": "City General Hospital",
  "address": "123 Healthcare Avenue",
  "city": "Mumbai",
  "state": "Maharashtra",
  "latitude": 19.076,
  "longitude": 72.877,
  "contactPhone": "+919876543210",
  "representativeName": "Dr. Sharma"
}
```

### GET `/hospitals/dashboard`
Returns active emergencies, request history, nearby blood banks.

### GET `/hospitals/profile` | PUT `/hospitals/profile`
Read or update hospital profile.

---

## Emergency Endpoints

### POST `/emergencies`
Create emergency blood request. **Requires: HOSPITAL role, verified status.**

**Request:**
```json
{
  "bloodGroup": "O_POS",
  "requiredUnits": 3,
  "urgency": "EMERGENCY",
  "requiredBy": "2024-12-25T18:00:00Z",
  "patientRef": "PAT-001",
  "instructions": "Patient in ICU Ward 3"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "bloodGroup": "O_POS",
    "requiredUnits": 3,
    "status": "CREATED",
    "currentRadiusKm": 5,
    "notifiedCount": 0,
    "flaggedForReview": false
  }
}
```

### GET `/emergencies`
List hospital's emergency requests with donor responses.

### GET `/emergencies/:id`
Get emergency request detail. Donors see limited info (no patient ref). Hospitals see full detail with donor contacts.

### PATCH `/emergencies/:id/cancel`
Cancel an active emergency request.

### POST `/emergencies/:id/respond`
Donor responds to emergency. **Requires: DONOR role.**

**Request:**
```json
{ "response": "ACCEPTED" }
```

### PATCH `/emergencies/:id/responses/:responseId`
Hospital updates donor status. **Requires: HOSPITAL role.**

**Request:**
```json
{ "status": "ARRIVED" }
```

Allowed values: `ARRIVED`, `DONATION_COMPLETED`

---

## Blood Bank Endpoints

### POST `/blood-banks/register`
Register blood bank profile.

### GET `/blood-banks` | GET `/blood-banks/:id`
List verified blood banks or get one with inventory.

### GET `/blood-banks/inventory`
Get inventory for authenticated blood bank.

### POST `/blood-banks/inventory`
Add inventory item.

**Request:**
```json
{
  "bloodGroup": "O_POS",
  "componentType": "WHOLE_BLOOD",
  "availableUnits": 10,
  "collectionDate": "2024-12-01",
  "expiryDate": "2025-01-15"
}
```

### PATCH `/blood-banks/inventory/:id`
Update inventory item or perform actions.

**Reserve units:**
```json
{ "action": "reserve", "units": 2 }
```

**Release units:**
```json
{ "action": "release", "units": 1 }
```

**Mark expired:**
```json
{ "action": "mark_expired" }
```

### POST `/blood-banks/donations`
Record a donation.

**Request:**
```json
{
  "donorProfileId": "uuid",
  "bloodGroup": "O_POS",
  "donationType": "WHOLE_BLOOD",
  "donationDate": "2024-12-15",
  "certificateRef": "CERT-001"
}
```

### GET `/blood-banks/search`
Search blood availability by location.

**Query:** `?bloodGroup=O_POS&latitude=19.076&longitude=72.877&radiusKm=25`

### POST `/blood-banks/slots`
Create appointment slot.

**Request:**
```json
{
  "date": "2024-12-20",
  "startTime": "10:00",
  "endTime": "11:00",
  "capacity": 5
}
```

### GET `/blood-banks/slots` | GET `/blood-banks/:id/slots`
List available appointment slots.

---

## Blood Request Endpoints (Non-Emergency)

### POST `/blood-requests`
Create normal blood request. **Requires: HOSPITAL role.**

### GET `/blood-requests`
List hospital's blood requests.

### GET `/blood-requests/:id`
Get specific blood request.

### PATCH `/blood-requests/:id`
Update blood request.

### PATCH `/blood-requests/:id/cancel`
Cancel blood request.

---

## Appointment Endpoints

### POST `/appointments`
Book appointment.

**Request:**
```json
{
  "slotId": "uuid",
  "notes": "First time donor"
}
```

### GET `/appointments`
List appointments (donors see their own, blood banks see all theirs).

### PATCH `/appointments/:id`
Update appointment status. **Requires: BLOOD_BANK role.**

**Request:**
```json
{ "status": "CONFIRMED" }
```

---

## Camp Endpoints

### GET `/camps`
List approved/active camps. Optional filter: `?city=Mumbai`

### GET `/camps/:id`
Get camp detail with registration count.

### POST `/camps`
Create camp. **Requires: BLOOD_BANK or CAMP_ORGANIZER role.**

### POST `/camps/:id/register`
Register donor for camp. **Requires: DONOR role.**

### POST `/camps/check-in`
QR-based check-in at camp.

**Request:**
```json
{ "qrCode": "camp-qr-code" }
```

### POST `/camps/ngo`
Register NGO profile. **Requires: CAMP_ORGANIZER role.**

---

## Notification Endpoints

### GET `/notifications`
List notifications. Optional query: `?unreadOnly=true&page=1&limit=20`

### PATCH `/notifications/:id/read`
Mark notification as read.

### POST `/notifications/device-token`
Register FCM device token.

**Request:**
```json
{
  "token": "fcm-device-token",
  "deviceInfo": "Chrome/Windows"
}
```

### DELETE `/notifications/device-token`
Remove device token.

### GET `/notifications/preferences` | PATCH `/notifications/preferences`
Get or update notification preferences.

---

## Location Endpoints

### GET `/locations/nearby`
Find nearby blood banks, hospitals, and camps.

**Query:** `?latitude=19.076&longitude=72.877&radiusKm=25`

**Response:**
```json
{
  "success": true,
  "data": {
    "bloodBanks": [{ "id": "...", "name": "...", "distanceKm": 2.3, "type": "blood_bank" }],
    "hospitals": [...],
    "camps": [...],
    "center": { "latitude": 19.076, "longitude": 72.877 },
    "radiusKm": 25
  }
}
```

---

## Admin Endpoints

### GET `/admin/dashboard`
Platform analytics: user counts, active emergencies, pending verifications, fulfillment rate, inventory stats.

### GET `/admin/users`
List users with filtering. Query: `?role=DONOR&status=ACTIVE&search=amit&page=1&limit=20`

### PATCH `/admin/users/:id`
Update user status.

**Request:**
```json
{ "accountStatus": "SUSPENDED" }
```

### GET `/admin/verification`
Get all pending verifications (hospitals, blood banks, NGOs, camps).

### PATCH `/admin/hospitals/:id/verify`
Verify hospital.

**Request:**
```json
{ "status": "VERIFIED", "notes": "Documents verified" }
```

### PATCH `/admin/blood-banks/:id/verify`
Verify blood bank.

### PATCH `/admin/ngos/:id/verify`
Verify NGO.

### PATCH `/admin/camps/:id/approve`
Approve donation camp.

### GET `/admin/emergencies/flagged`
List flagged emergency requests.

### PATCH `/admin/emergencies/:id/clear-flag`
Clear flag on emergency request after review.

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "errorCode": "ERROR_CODE"
}
```

Common error codes:
- `VALIDATION_ERROR` (400) — Zod schema validation failed
- `UNAUTHORIZED` (401) — Missing or invalid auth token
- `FORBIDDEN` (403) — Insufficient permissions
- `NOT_FOUND` (404) — Resource not found
- `DUPLICATE` (409) — Record already exists
- `RATE_LIMIT` (429) — Too many requests
- `INTERNAL_ERROR` (500) — Unexpected server error
