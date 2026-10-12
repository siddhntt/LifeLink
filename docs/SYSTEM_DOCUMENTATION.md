# LifeLink: Smart Blood Donation & Emergency Coordination Platform
## Complete Master Specification: Every Large-to-Small Feature, Engine & Technical Mechanism

---

## 1. Executive Summary & The Problem LifeLink Solves

### The Problem
During critical medical emergencies—such as severe trauma accidents, complex surgeries, or post-partum hemorrhages—the first hour, known as the **"Golden Hour"**, determines whether a patient survives. Today, traditional blood procurement is plagued by:
- **Chaotic, Manual Communication**: Frantic WhatsApp forwards, social media posts, and desperate phone calls to friends and family.
- **Geographic Inefficiency**: Donors 30 km away are called while willing, compatible donors 2 km away have no idea an emergency exists.
- **Donor Fatigue & Spam**: Donors get called when they are busy, traveling, or ineligible due to a recent donation.
- **Fragmented Blood Bank Visibility**: Hospitals do not know which blood bank currently holds compatible units or components.
- **Lack of Transit Visibility**: Once a donor agrees to donate, surgical teams have no way of knowing if or when the donor will actually arrive at the hospital.

### The Solution: LifeLink
**LifeLink** is an intelligent, automated, and real-time emergency blood dispatch platform. It bridges the critical time gap by functioning like a 911 dispatch network combined with an Uber-like live GPS tracking radar for blood donors:
1. **30-Second Emergency Dispatch**: Hospitals broadcast urgent requirements in seconds.
2. **Automated Compatibility & Proximity Matching**: Discovers eligible donors within immediate vicinity using geospatial search and medical safety rules.
3. **Dynamic Expanding Search Radius**: Expands automatically in timed stages (5 km $\to$ 10 km $\to$ 20 km $\to$ 50 km) if units aren't fulfilled.
4. **Live Donor Transit Radar**: Hospitals watch accepted donors travel toward the hospital in real time on an interactive map.
5. **Centralized Inventory & Safe Reservations**: Atomic database transactions guarantee blood units are never double-booked.
6. **Community Drives & Contactless Check-In**: NGOs and blood banks run blood donation drives with digital QR code check-in passes.

---

## 2. Master Feature Catalog (From High-Level Systems to Granular Micro-Features)

### 2.1. Emergency Matching & Dispatch System
1. **30-Second Emergency Request Creation**: Hospital submits blood group, units needed (1–20), urgency (`NORMAL`, `URGENT`, `EMERGENCY`), required-by date-time, and clinical instructions.
2. **Duplicate Request Detection (Fraud & Spam Guard)**: `checkDuplicateRequest()` automatically checks if the same hospital created a request for the same blood group within the last 60 minutes. If detected, the request is automatically flagged for review (`flaggedForReview: true`, reason: *"Similar request created within the last hour"*).
3. **Patient Reference Privacy Masking (HIPAA Protection)**: When donors view an emergency detail via `GET /emergency-requests/:id`, the backend automatically strips the `patientRef` (medical record number / patient name), ensuring private patient data never leaks to donors or public endpoints.
4. **Universal Blood Compatibility Engine**: Implements clinical red blood cell compatibility tables (`bloodCompatibility.js`):
   - **O- (Universal Donor)**: Can donate to O-, O+, A-, A+, B-, B+, AB-, AB+.
   - **O+**: Can donate to O+, A+, B+, AB+.
   - **A-**: Can donate to A-, A+, AB-, AB+.
   - **A+**: Can donate to A+, AB+.
   - **B-**: Can donate to B-, B+, AB-, AB+.
   - **B+**: Can donate to B+, AB+.
   - **AB-**: Can donate to AB-, AB+.
   - **AB+ (Universal Recipient)**: Can only donate to AB+.
5. **Dynamic Expanding Radius Stages**: Staged search stored in `EmergencyRadiusConfig`:
   - Stage 0: 0 – 5 km (Immediate neighborhood).
   - Stage 1: 5 – 10 km (Wider city radius).
   - Stage 2: 10 – 20 km (Suburban zone).
   - Stage 3: 20 – 50 km (Regional emergency zone).
6. **Timed Auto-Expansion**: If required units are not fulfilled within `responseWaitMs` (default: 5 minutes), the search circle expands automatically to the next stage, alerting a fresh ring of donors without re-notifying previously contacted donors.
7. **Emergency Radius Audit Logging (`EmergencyRadiusLog`)**: Records every radius jump (`fromRadiusKm`, `toRadiusKm`, `donorsNotified`, `expandedAt`) for transparent auditing.
8. **Multi-Factor Prioritization Scoring Formula (`scoringService.js`)**:
   $$\text{Score} = (0.40 \times \text{Distance}) + (0.25 \times \text{Eligibility}) + (0.20 \times \text{Availability}) + (0.15 \times \text{Response History})$$
   - *Distance Score*: Normalized inverted distance $1 - (\text{dist} / \text{maxRadius})$.
   - *Eligibility Score*: 100 for `ELIGIBLE`, 0 for `TEMPORARILY_UNAVAILABLE`, 30 for `NEEDS_MEDICAL_REVIEW`.
   - *Availability Score*: 100 for `AVAILABLE`, 0 for `NOT_AVAILABLE`.
   - *Response History*: Based on historical acceptance rate ($\text{accepts} / \text{responses}$) plus a bonus for fast response times under 10 minutes ($< 600,000 \text{ ms}$).
9. **Emergency Cancellation with Instant Multicast**: When a hospital cancels an emergency (`PATCH /emergency-requests/:id/cancel`), status transitions to `CANCELLED`, emits `emergency:cancelled` over Socket.IO, and logs an immutable `AuditLog` entry.

---

### 2.2. Real-Time Radar & Live GPS Tracking
10. **Live Hospital Radar Screen (`EmergencyRequestDetail.jsx`)**: An interactive Leaflet map featuring:
    - Hospital center marker with hospital name and address popup.
    - Semi-transparent concentric radius circles showing 5 km, 10 km, 20 km, and 50 km search zones.
    - Dynamic pulsing markers representing donors who have accepted and are traveling to the hospital.
11. **Browser Geolocation Streaming (`watchPosition`)**: High-accuracy GPS watcher (`enableHighAccuracy: true`, `maximumAge: 0`, `timeout: 10000`) streaming live latitude, longitude, and accuracy.
12. **GPS Update Throttling (Battery & Server Guard)**: The socket server enforces a strict throttle (`LOCATION_THROTTLE_MS = 5000`) per donor per request. Updates sent faster than 5 seconds are ignored, preventing mobile battery drain and server event spam.
13. **Donor Live Telemetry Persistence (`DonorLiveLocation`)**: Each throttled coordinate update upserts `DonorLiveLocation` (coordinates, accuracy, timestamp) before broadcasting.
14. **Selective Radar Broadcast**: Coordinates are transmitted via `socket.to("emergency-request:${requestId}").emit("donor:location-update")` so only the hospital managing that specific emergency receives the telemetry.
15. **Donor Lifecycle State Machine**:
    $$\text{NOTIFIED} \longrightarrow \text{VIEWED} \longrightarrow \text{ACCEPTED} \longrightarrow \text{ARRIVED} \longrightarrow \text{DONATION\_COMPLETED}$$
    - `ARRIVED` is restricted so hospital staff can only mark a donor as arrived if the donor has previously `ACCEPTED`.
    - Automatically records `viewedAt`, `respondedAt`, `arrivedAt`, `completedAt`, and computes `responseTimeMs`.

---

### 2.3. Donor Experience & Clinical Safety
16. **Automatic Location Capture on Mount**: When a donor, hospital, or blood bank opens their registration or profile page, `navigator.geolocation.getCurrentPosition` requests permissions and auto-populates coordinates without requiring manual map pinpointing.
17. **Clinical Eligibility Engine (`eligibilityService.js`)**:
    - **Age Validation**: Rejects users younger than 18 or older than 65 years.
    - **Weight Validation**: Requires minimum weight of 45 kg.
    - **Cooling-Off Cooldown**: Enforces mandatory 90-day interval between donations.
    - **Status Determination**: Automatically evaluates donor into `ELIGIBLE`, `TEMPORARILY_UNAVAILABLE`, or `NEEDS_MEDICAL_REVIEW`.
18. **Next Eligible Date Countdown**: Donors in cooling-off period see a live countdown calculation:
    $$\text{Next Date} = \text{lastDonationDate} + 90 \text{ days}$$
19. **Donor Availability Toggle**: Donors switch between `AVAILABLE` and `NOT_AVAILABLE`. When not available, they are excluded from emergency scoring and push notifications.
20. **One-Tap Response Interface**: Donors can accept or reject emergency requests in one click.
21. **Donation History & Digital Certificate References**: Keeps an immutable timeline of completed donations with blood bank name, city, donation type, date, and certificate identifier.
22. **Notification Preferences**: Donors can toggle preferences for:
    - Emergency Alerts.
    - Appointment Reminders.
    - Camp Reminders.
    - Request Updates.
    - Account Updates.

---

### 2.4. Blood Bank & Inventory Operations
23. **Stock Level Matrix**: Tracks all 8 blood groups across 3 component types: **Whole Blood**, **Platelets**, and **Plasma**.
24. **ACID Transaction Unit Reservations**:
    - `reserve`: Decrements `availableUnits`, increments `reservedUnits` inside a `prisma.$transaction`.
    - `release`: Reverses reserved units back to available units.
    - `mark_expired`: Marks spoiled units as expired with 0 available units.
25. **Expiry Date & Shelf-Life Tracking**: Every inventory item records collection date and expiration date.
26. **Low-Stock Alerting**: Highlights any blood group in the dashboard with fewer than 5 available units.
27. **Appointment Slot Management**:
    - Blood banks create daily time slots (`AppointmentSlot`) with date, start time, end time, and maximum capacity (default: 5).
    - Prevents overbooking: Booking transactions check `bookedCount < capacity` before confirming.
28. **Walk-in Donation Logging**:
    - Blood bank logs walk-in donations (`recordDonation`).
    - Creates `Donation` record, increments donor's `totalDonations`, sets `lastDonationDate = now`, resets `activeEmergencyId = null`, and triggers immediate eligibility re-evaluation.

---

### 2.5. Community Drives & NGOs (Camps)
29. **Blood Donation Camp Creation**: NGOs and blood banks create camps with venue, address, date, hours, and target capacity.
30. **Admin Camp Approval Flow**: Newly created camps are placed in `PENDING_APPROVAL` status until an administrator verifies the details and approves them (`APPROVED`).
31. **Camp Capacity Cap Enforcement**:
    - Donors register for upcoming camps.
    - The registration runs inside an atomic transaction:
      $$\text{registeredCount} < \text{capacity}$$
      If the camp is at full capacity, registration is rejected with `CAMP_FULL`.
32. **Contactless QR-Code Digital Pass**:
    - Each camp generates a unique UUID-based QR code (`qrCode`).
    - Donors receive a digital camp pass. At the venue, the organizer scans the QR code to verify registration and mark the donor as `CHECKED_IN`.

---

### 2.6. Background Automated Cron Jobs (`scheduler.js`)
33. **Hourly Emergency Expiry Job (`0 * * * *`)**:
    - Scans all emergency requests in `CREATED`, `SEARCHING`, or `PARTIALLY_FULFILLED` status where `expiresAt <= now`.
    - Automatically updates their status to `EXPIRED`.
34. **Daily Inventory Shelf-Life Job (`0 2 * * *` at 2:00 AM)**:
    - Finds all blood inventory items with `status: AVAILABLE` and `expiryDate <= now`.
    - Updates status to `EXPIRED` and sets `availableUnits: 0, reservedUnits: 0`.
35. **Daily Appointment Reminder Job (`0 9 * * *` at 9:00 AM)**:
    - Finds confirmed appointments scheduled for tomorrow (24 hours in advance).
    - Generates and dispatches `APPOINTMENT_REMINDER` notifications to donors.
36. **Weekly Stale FCM Token Cleanup Job (`0 3 * * 0` on Sundays at 3:00 AM)**:
    - Purges inactive device tokens or tokens unused for over 30 days (`lastUsedAt < 30 days ago`).

---

### 2.7. Administration, Compliance & Security
37. **Medical Facility Verification Queue**:
    - Dedicated queue for administrators to review pending Hospitals, Blood Banks, and NGOs.
    - Admins review registration numbers, license numbers, phone, and representative name, then click **Verify** or **Reject** with verification notes.
    - Unverified hospitals cannot create emergency requests.
38. **Flagged Emergencies Dashboard (`AdminFlaggedEmergencies.jsx`)**:
    - Dedicated view for administrators to monitor emergency requests that were flagged due to duplicate detection or low response rate.
    - Admins can inspect the donor response breakdown and clear the flag (`clearEmergencyFlag`) with audit trail logging.
39. **Comprehensive System Audit Logging (`AuditLog`)**:
    - Logs every critical system action: `USER_CREATED`, `USER_UPDATED`, `USER_DEACTIVATED`, `HOSPITAL_VERIFIED`, `BLOOD_BANK_VERIFIED`, `NGO_VERIFIED`, `EMERGENCY_CREATED`, `EMERGENCY_CANCELLED`, `EMERGENCY_FULFILLED`, `DONOR_RESPONSE`, `INVENTORY_UPDATED`, `APPOINTMENT_CREATED`, `CAMP_CREATED`, `LOGIN`, `LOGOUT`.
    - Captures actor ID, target entity, entity ID, action type, IP address, and JSON details.
40. **User Account Status Controls**: Admins can suspend or deactivate users (`ACTIVE`, `INACTIVE`, `SUSPENDED`).
41. **Rate Limiting & DDoS Protection**: Global rate limiting on `/api/*` endpoints (100 requests per 15 minutes per IP).
42. **HTTP Header Hardening (`helmet`)**: Sets X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, and X-XSS-Protection.
43. **Password Security**: Passwords hashed with bcrypt using 12 salt rounds. Public registration excludes the `ADMIN` role.
44. **Dual-JWT Support**: Authentication middleware accepts JWTs issued via bcrypt auth as well as Firebase tokens.

---

### 2.8. Real-Time WebSockets & Push Notifications
45. **Multi-Room Socket Architecture**:
    - Personal user room: `user:${userId}` (for individual alerts and toasts).
    - Hospital room: `hospital:${hospitalId}` (for hospital-wide updates).
    - Emergency room: `emergency-request:${requestId}` (for live GPS radar and donor response events).
46. **Background Web Push Notifications (`firebase-messaging-sw.js`)**:
    - Background Service Worker receives FCM pushes and shows system notifications even when the browser tab is closed.
    - Includes guard preventing crashes if Firebase configuration is incomplete.
47. **Frontend Floating Toast System (`ToastContext.jsx`)**:
    - Real-time animated popups for emergency broadcasts and system events.
    - Features custom durations (15 seconds for emergencies vs 6 seconds for regular notifications) and direct action deep-links.

---

### 2.9. Public Discovery Features
48. **Public Blood Availability Directory (`BloodSearchPage.jsx`)**:
    - Anyone can search for blood stock without logging in.
    - Filters by blood group and city, showing blood bank contact numbers and available units.
49. **Interactive Nearby Directory (`NearbyMapPage.jsx`)**:
    - Shows verified hospitals, 24x7 blood banks, and active donation camps on an interactive Leaflet map.
    - Calculates distance in km from user's current GPS location.

---

## 3. Complete Technology Stack Matrix

| Layer | Technologies Used | Key Purpose |
|---|---|---|
| **Frontend Framework** | **React 18**, **Vite** | Fast component rendering, code-splitting, and HMR. |
| **Styling & Icons** | **Tailwind CSS**, **Lucide React** | Responsive design system, custom blood-red theme tokens, and iconography. |
| **Routing & Auth Guards** | **React Router v6** | Client-side routing with role-based `<ProtectedRoute>` access control. |
| **Geospatial Mapping** | **Leaflet**, **React-Leaflet**, **OpenStreetMap** | Real-time emergency radius visualization and live donor GPS tracking markers. |
| **Client-Side Realtime**| **Socket.IO-Client** | Subscribing to instant room-based emergency alerts and transmitting continuous coordinates. |
| **Push Notifications** | **Firebase Cloud Messaging (FCM)** | Background service worker push alerts directly to desktop/mobile browsers. |
| **HTTP Client** | **Axios** | Centralized API client with automatic JWT bearer token interceptors. |
| **Backend Runtime** | **Node.js (v18+)**, **Express.js** | Scalable REST API with modular routing, middleware, and controllers. |
| **Database & ORM** | **PostgreSQL (Supabase)**, **Prisma ORM** | Relational schema, migrations, connection pooling, and atomic transactions (`$transaction`). |
| **Authentication** | **bcrypt (12 rounds)**, **JSON Web Tokens (JWT)** | Secure hashed credentials and stateless token verification. |
| **Validation** | **Zod** | Runtime schema validation for requests and data coercion. |
| **Security & Logging** | **Helmet**, **express-rate-limit**, **Morgan** | HTTP header hardening, DDoS/brute-force throttling, and request logging. |
| **API Documentation** | **Swagger UI Express**, **swagger-jsdoc** | Interactive OpenAPI documentation available at `/api/docs`. |
| **Background Tasks** | **node-cron** | Periodic expiration of stale emergency requests and shelf-life checks on blood units. |
| **Testing** | **Jest**, **Supertest** | Integration and unit testing for endpoints, auth, and matching services. |
| **Deployment Cloud** | **Render** | Static Site hosting for Frontend and Web Service hosting for Backend. |

---

## 4. Complete Database Domain Models (`schema.prisma`)

The database consists of **18 relational models** and **15 custom enums**:

### Custom Enums
1. `UserRole`: `DONOR`, `HOSPITAL`, `BLOOD_BANK`, `CAMP_ORGANIZER`, `ADMIN`
2. `AccountStatus`: `ACTIVE`, `INACTIVE`, `SUSPENDED`
3. `VerificationStatus`: `PENDING`, `VERIFIED`, `REJECTED`
4. `BloodGroup`: `A_POS`, `A_NEG`, `B_POS`, `B_NEG`, `AB_POS`, `AB_NEG`, `O_POS`, `O_NEG`
5. `Gender`: `MALE`, `FEMALE`, `OTHER`, `PREFER_NOT_TO_SAY`
6. `AvailabilityStatus`: `AVAILABLE`, `NOT_AVAILABLE`
7. `EligibilityStatus`: `ELIGIBLE`, `TEMPORARILY_UNAVAILABLE`, `NEEDS_MEDICAL_REVIEW`
8. `Urgency`: `NORMAL`, `URGENT`, `EMERGENCY`
9. `BloodRequestStatus`: `CREATED`, `SEARCHING`, `PARTIALLY_FULFILLED`, `FULFILLED`, `CANCELLED`, `EXPIRED`
10. `DonorResponseStatus`: `NOTIFIED`, `VIEWED`, `ACCEPTED`, `REJECTED`, `NO_SHOW`, `ARRIVED`, `DONATION_COMPLETED`, `EXPIRED`
11. `DonationType`: `WHOLE_BLOOD`, `PLATELETS`, `PLASMA`
12. `DonationStatus`: `SCHEDULED`, `COMPLETED`, `CANCELLED`, `DEFERRED`
13. `InventoryStatus`: `AVAILABLE`, `RESERVED`, `EXPIRED`, `USED`
14. `AppointmentStatus`: `PENDING`, `CONFIRMED`, `REJECTED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`
15. `CampStatus`: `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `ACTIVE`, `COMPLETED`, `CANCELLED`
16. `CampRegistrationStatus`: `REGISTERED`, `CHECKED_IN`, `DONATION_COMPLETED`, `CANCELLED`
17. `NotificationType`: `EMERGENCY_REQUEST`, `APPOINTMENT_CONFIRMATION`, `APPOINTMENT_REMINDER`, `CAMP_REMINDER`, `REQUEST_CANCELLED`, `REQUEST_FULFILLED`, `ACCOUNT_UPDATE`, `VERIFICATION_UPDATE`, `GENERAL`
18. `AuditAction`: `USER_CREATED`, `USER_UPDATED`, `USER_DEACTIVATED`, `HOSPITAL_VERIFIED`, `BLOOD_BANK_VERIFIED`, `NGO_VERIFIED`, `EMERGENCY_CREATED`, `EMERGENCY_CANCELLED`, `EMERGENCY_FULFILLED`, `DONOR_RESPONSE`, `INVENTORY_UPDATED`, `APPOINTMENT_CREATED`, `CAMP_CREATED`, `LOGIN`, `LOGOUT`

### Relational Models
1. **`User`**: Core user credentials, role, status, and 1-to-1 profile links.
2. **`DonorProfile`**: Blood group, DOB, gender, weight, last donation date, availability, eligibility status, stats, and GPS coordinates.
3. **`Hospital`**: Facility name, license, address, coordinates, representative, phone, email, verification status.
4. **`BloodBank`**: Facility name, license, address, coordinates, phone, verification status, inventory update timestamp.
5. **`NGO`**: Organization name, registration number, address, phone, verification status.
6. **`BloodRequest`**: Routine hospital blood request.
7. **`EmergencyRequest`**: Urgent hospital request with radius tracking, units needed, fulfilled count, status, and duplicate flag.
8. **`EmergencyDonorResponse`**: Per-donor dispatch response record (priority score, distance, status, response time ms).
9. **`EmergencyRadiusLog`**: Audit trail of radius stage jumps (5km $\to$ 10km $\to$ 20km $\to$ 50km).
10. **`DonorLiveLocation`**: High-frequency live GPS telemetry (lat, lng, accuracy, timestamp).
11. **`Donation`**: Historical record of completed donations with certificate reference numbers.
12. **`BloodInventory`**: Stock records per blood bank, tracking blood group, component type, available/reserved units, collection and expiry dates.
13. **`AppointmentSlot`**: Date-specific time slots with capacity counters.
14. **`Appointment`**: Donor booking linked to slot and blood bank.
15. **`DonationCamp`**: Blood donation drives with capacity, venue, dates, and unique QR code.
16. **`CampRegistration`**: Donor registration for a camp with check-in status.
17. **`Notification`**: In-app inbox alerts.
18. **`DeviceToken`**: FCM push notification device registry.
19. **`NotificationPreference`**: User alert toggle matrix.
20. **`EligibilityRule`, `DonorScoringConfig`, `EmergencyRadiusConfig`**: Dynamic system configuration tables.
21. **`AuditLog`**: Compliance audit trail.

---

## 5. File-by-File Breakdown

### Backend Files (`backend/`)
- `prisma/schema.prisma`: The database schema definition with all 18 models and 15 enums.
- `prisma/seed.js`: Database seeder with realistic test data (donors, hospitals, blood banks, camps, inventory, configs).
- `src/server.js`: HTTP server entry point initializing Socket.IO and cron jobs.
- `src/app.js`: Express app setup, helmet, CORS, rate limiting, and route mounts.
- `src/config/database.js`: Prisma client singleton.
- `src/config/firebase.js`: Firebase Admin SDK setup for push notifications.
- `src/config/swagger.js`: OpenAPI 3.0 documentation configuration.
- `src/config/index.js`: Environment variables loader and default configurations.
- `src/middleware/auth.js`: JWT token verification and role-based route authorizer (`authorize('DONOR', 'HOSPITAL')`).
- `src/middleware/errorHandler.js`: Centralized error handler converting AppError and Zod errors to consistent JSON responses.
- `src/middleware/validate.js`: Generic Zod schema validation middleware.
- `src/routes/authRoutes.js`: Auth endpoints (`/register`, `/login`, `/me`).
- `src/routes/donorRoutes.js`: Donor profile, dashboard, availability, and history routes.
- `src/routes/hospitalRoutes.js`: Hospital registration, profile, and dashboard routes.
- `src/routes/emergencyRoutes.js`: Emergency request dispatch, response, and cancellation routes.
- `src/routes/bloodBankRoutes.js`: Inventory management, appointment slots, and walk-in donation routes.
- `src/routes/campRoutes.js`: Camp creation, attendee registration, and QR check-in routes.
- `src/routes/bloodRequestRoutes.js`: Routine hospital blood requisition routes.
- `src/routes/locationRoutes.js`: Proximity search routes (`/locations/nearby`).
- `src/routes/adminRoutes.js`: Admin verification, dashboard stats, and user management routes.
- `src/routes/notificationRoutes.js`: Notification inbox routes.
- `src/services/emergencyService.js`: Expanding radius dispatch engine, FCM push, socket multicasting.
- `src/services/scoringService.js`: 4-factor donor prioritization algorithm.
- `src/services/eligibilityService.js`: Clinical criteria (age, weight, 90-day cooldown).
- `src/services/donorFilterService.js`: Haversine distance filtering and compatibility check.
- `src/services/inventoryService.js`: ACID transaction reservations and stock adjustments.
- `src/services/appointmentService.js`: Slot capacity check and booking management.
- `src/services/notificationService.js`: Push notification dispatch.
- `src/sockets/index.js`: Authenticated Socket.IO engine, rooms, and throttled live GPS streaming.
- `src/utils/bloodCompatibility.js`: Universal red blood cell compatibility matrix.
- `src/utils/distance.js`: Haversine formula distance calculation.
- `src/utils/scheduler.js`: The 4 automated background cron jobs.
- `src/utils/constants.js`: System constants, blood group labels, and status badges.
- `src/utils/helpers.js`: `AppError`, `asyncHandler`, `sendSuccess` utilities.
- `src/validators/schemas.js`: Zod schemas for all request validations.

### Frontend Files (`frontend/`)
- `public/firebase-messaging-sw.js`: Background Web Worker for FCM push notifications.
- `src/context/AuthContext.jsx`: Auth state management (user, token, login, logout, refresh).
- `src/context/SocketContext.jsx`: Global Socket.IO client instance.
- `src/context/ToastContext.jsx`: Floating toast alert system with deep linking.
- `src/hooks/useFCM.js`: Browser push notification permission and token registration hook.
- `src/components/MapView.jsx`: Reusable Leaflet map wrapper with pins and radius rings.
- `src/components/ProtectedRoute.jsx`: Client-side RBAC guard.
- `src/components/StatusBadge.jsx`: Color-coded status badge pills.
- `src/components/LoadingSpinner.jsx`: Consistent animated state loader.
- `src/layouts/DashboardLayout.jsx`: Responsive shell with role navigation and notification bell.
- `src/pages/LandingPage.jsx`: Public landing page with stats and role portals.
- `src/pages/LoginPage.jsx`: Email & password login.
- `src/pages/RegisterPage.jsx`: Multi-role registration with auto-login.
- `src/pages/BloodSearchPage.jsx`: Public blood stock directory.
- `src/pages/NearbyMapPage.jsx`: Proximity map of verified blood facilities.
- `src/pages/donor/DonorDashboard.jsx`: Donor hub with eligibility cooldown countdown.
- `src/pages/donor/DonorProfile.jsx`: Profile form with auto-captured GPS coordinates.
- `src/pages/donor/EmergencyResponsePage.jsx`: Urgent emergency alert response and live GPS sharing toggle.
- `src/pages/donor/DonorAppointments.jsx`: Slot picker and appointment management.
- `src/pages/donor/DonorHistory.jsx`: Complete past donation timeline.
- `src/pages/donor/CampCheckIn.jsx`: Digital QR pass for camp entry.
- `src/pages/hospital/HospitalDashboard.jsx`: Emergency overview and stats.
- `src/pages/hospital/HospitalRegister.jsx`: Facility registration with auto-geolocation.
- `src/pages/hospital/CreateEmergencyRequest.jsx`: 30-second emergency dispatch form.
- `src/pages/hospital/EmergencyRequestDetail.jsx`: The Command Center Radar map and live donor GPS tracking.
- `src/pages/blood-bank/BloodBankDashboard.jsx`: Stock overview and appointment counters.
- `src/pages/blood-bank/BloodBankRegister.jsx`: Facility setup with 24x7 toggle.
- `src/pages/blood-bank/BloodBankInventory.jsx`: Stock grid with ACID unit reservations.
- `src/pages/blood-bank/BloodBankAppointments.jsx`: Daily slot capacity scheduling.
- `src/pages/blood-bank/BloodBankDonations.jsx`: Walk-in donation recording.
- `src/pages/camps/CampsList.jsx`: Public blood drive catalog.
- `src/pages/camps/CampDetail.jsx`: Camp venue, timings, and donor registration.
- `src/pages/camps/CampManage.jsx`: Organizer attendee manager and check-in scanner.
- `src/pages/admin/AdminDashboard.jsx`: System-wide telemetry and KPI cards.
- `src/pages/admin/AdminUsers.jsx`: User management and role status controls.
- `src/pages/admin/AdminVerification.jsx`: Medical credential audit queue.
- `src/pages/admin/AdminFlaggedEmergencies.jsx`: Review and resolution of flagged emergency requests.
- `src/services/api.js`: Axios client with JWT interceptors.
- `src/services/endpoints.js`: Complete API method catalog.
