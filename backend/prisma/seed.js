require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
const bcrypt = require('bcryptjs');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Locations around IIIT Naya Raipur ──────────────────────────────────────────
const PLACES = {
  IIIT_NR:       { city: 'Naya Raipur',  state: 'Chhattisgarh', lat: 21.1291, lng: 81.7656 },
  ATAL_NAGAR:    { city: 'Naya Raipur',  state: 'Chhattisgarh', lat: 21.1350, lng: 81.7700 },
  RAIPUR_CITY:   { city: 'Raipur',       state: 'Chhattisgarh', lat: 21.2514, lng: 81.6296 },
  RAIPUR_SOUTH:  { city: 'Raipur',       state: 'Chhattisgarh', lat: 21.2200, lng: 81.6400 },
  BHILAI:        { city: 'Bhilai',       state: 'Chhattisgarh', lat: 21.2167, lng: 81.4333 },
  DURG:          { city: 'Durg',         state: 'Chhattisgarh', lat: 21.1900, lng: 81.2800 },
  BILASPUR:      { city: 'Bilaspur',     state: 'Chhattisgarh', lat: 22.0796, lng: 82.1391 },
};

const ALL_BG = ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'];

function jitter(v, r = 0.015) { return v + (Math.random() - 0.5) * 2 * r; }
function daysAgo(d)     { return new Date(Date.now() - d * 864e5); }
function daysFromNow(d) { return new Date(Date.now() + d * 864e5); }

async function cleanup() {
  console.log('🧹 Cleaning existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.donorLiveLocation.deleteMany();
  await prisma.emergencyRadiusLog.deleteMany();
  await prisma.emergencyDonorResponse.deleteMany();
  await prisma.emergencyRequest.deleteMany();
  await prisma.bloodRequest.deleteMany();
  await prisma.campRegistration.deleteMany();
  await prisma.donationCamp.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.appointmentSlot.deleteMany();
  await prisma.donation.deleteMany();
  await prisma.bloodInventory.deleteMany();
  await prisma.deviceToken.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.donorProfile.deleteMany();
  await prisma.hospital.deleteMany();
  await prisma.bloodBank.deleteMany();
  await prisma.nGO.deleteMany();
  await prisma.user.deleteMany();
  await prisma.eligibilityRule.deleteMany();
  await prisma.donorScoringConfig.deleteMany();
  await prisma.emergencyRadiusConfig.deleteMany();
  console.log('  ✓ Database cleared.\n');
}

async function main() {
  await cleanup();
  console.log('🌱 Seeding LifeLink — Chhattisgarh region...\n');

  const pw = (p) => bcrypt.hash(p, 12);

  // ─── System Config ───────────────────────────────────────────────────────────
  console.log('  ✦ System config...');
  await prisma.eligibilityRule.createMany({
    data: [
      { key: 'minAge', value: 18, description: 'Minimum donor age' },
      { key: 'maxAge', value: 65, description: 'Maximum donor age' },
      { key: 'minWeight', value: 45, description: 'Min weight (kg)' },
      { key: 'minDonationIntervalDays', value: 90, description: 'Days between donations' },
    ],
  });

  await prisma.donorScoringConfig.createMany({
    data: [
      { key: 'distance', weight: 0.4, description: 'Proximity' },
      { key: 'eligibility', weight: 0.25, description: 'Eligibility status' },
      { key: 'availability', weight: 0.2, description: 'Availability' },
      { key: 'responseHistory', weight: 0.15, description: 'Past responses' },
    ],
  });

  await prisma.emergencyRadiusConfig.createMany({
    data: [
      { stage: 0, radiusKm: 5,  responseWaitMs: 300000 },
      { stage: 1, radiusKm: 10, responseWaitMs: 300000 },
      { stage: 2, radiusKm: 20, responseWaitMs: 300000 },
      { stage: 3, radiusKm: 50, responseWaitMs: 300000 },
    ],
  });

  // ─── Admin ───────────────────────────────────────────────────────────────────
  console.log('  ✦ Admin...');
  const admin = await prisma.user.create({
    data: {
      firebaseUid: 'demo-admin-uid',
      phone: '+919000000001',
      email: 'admin@lifelink.in',
      passwordHash: await pw('admin123'),
      fullName: 'LifeLink Admin',
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      profileComplete: true,
      notificationPrefs: { create: {} },
    },
  });

  console.log('  ✦ 20 donors...');
  const DONOR_LIST = [
    // --- Naya Raipur / IIIT campus area ---
    { name: 'Aarav Sahu',       gender: 'MALE',   bg: 'O_POS',  place: 'IIIT_NR',      age: 21, avail: true,  elig: 'ELIGIBLE',                 donations: 2,  weight: 62, lastDon: 120, note: 'Eligible — last donated 120 days ago (past cooldown)' },
    { name: 'Priya Verma',      gender: 'FEMALE', bg: 'A_POS',  place: 'IIIT_NR',      age: 22, avail: true,  elig: 'TEMPORARILY_UNAVAILABLE',  donations: 1,  weight: 55, lastDon: 30,  note: 'COOLDOWN — donated 30 days ago (needs 60 more days)' },
    { name: 'Kunal Soni',       gender: 'MALE',   bg: 'B_POS',  place: 'IIIT_NR',      age: 20, avail: true,  elig: 'TEMPORARILY_UNAVAILABLE',  donations: 0,  weight: 42, lastDon: null, note: 'UNDERWEIGHT — 42 kg (min 45 kg)' },
    { name: 'Shruti Dubey',     gender: 'FEMALE', bg: 'O_NEG',  place: 'IIIT_NR',      age: 21, avail: true,  elig: 'ELIGIBLE',                 donations: 1,  weight: 52, lastDon: 100, note: 'Eligible — rare O- donor' },
    { name: 'Harsh Prajapati',  gender: 'MALE',   bg: 'A_NEG',  place: 'IIIT_NR',      age: 23, avail: true,  elig: 'ELIGIBLE',                 donations: 3,  weight: 70, lastDon: 95,  note: 'Eligible — past cooldown' },
    // --- Atal Nagar / near Sadbhavna & BALCO ---
    { name: 'Rohit Tiwari',     gender: 'MALE',   bg: 'B_POS',  place: 'ATAL_NAGAR',   age: 24, avail: true,  elig: 'ELIGIBLE',                 donations: 4,  weight: 68, lastDon: 150, note: 'Eligible' },
    { name: 'Sneha Rajput',     gender: 'FEMALE', bg: 'AB_POS', place: 'ATAL_NAGAR',   age: 20, avail: true,  elig: 'ELIGIBLE',                 donations: 0,  weight: 50, lastDon: null, note: 'Eligible — first-time donor' },
    { name: 'Manish Chandel',   gender: 'MALE',   bg: 'O_POS',  place: 'ATAL_NAGAR',   age: 28, avail: true,  elig: 'ELIGIBLE',                 donations: 5,  weight: 75, lastDon: 200, note: 'ACTIVE EMERGENCY — already responding to another request', activeEmg: true },
    { name: 'Pooja Sahu',       gender: 'FEMALE', bg: 'B_NEG',  place: 'ATAL_NAGAR',   age: 25, avail: false, elig: 'ELIGIBLE',                 donations: 2,  weight: 53, lastDon: 180, note: 'NOT AVAILABLE — toggled off by donor' },
    // --- Raipur city ---
    { name: 'Amit Sharma',      gender: 'MALE',   bg: 'O_NEG',  place: 'RAIPUR_CITY',  age: 32, avail: true,  elig: 'ELIGIBLE',                 donations: 8,  weight: 78, lastDon: 100, note: 'Eligible — veteran donor, rare O-' },
    { name: 'Kavya Patel',      gender: 'FEMALE', bg: 'A_NEG',  place: 'RAIPUR_CITY',  age: 28, avail: false, elig: 'ELIGIBLE',                 donations: 3,  weight: 56, lastDon: 200, note: 'NOT AVAILABLE' },
    { name: 'Deepak Yadav',     gender: 'MALE',   bg: 'B_NEG',  place: 'RAIPUR_SOUTH', age: 35, avail: true,  elig: 'TEMPORARILY_UNAVAILABLE',  donations: 6,  weight: 72, lastDon: 60,  note: 'COOLDOWN — donated 60 days ago' },
    { name: 'Neha Agrawal',     gender: 'FEMALE', bg: 'AB_NEG', place: 'RAIPUR_SOUTH', age: 29, avail: true,  elig: 'NEEDS_MEDICAL_REVIEW',     donations: 2,  weight: 58, lastDon: 300, note: 'NEEDS REVIEW — flagged by medical staff' },
    // --- Bhilai / Durg ---
    { name: 'Vikram Singh',     gender: 'MALE',   bg: 'O_POS',  place: 'BHILAI',       age: 40, avail: true,  elig: 'ELIGIBLE',                 donations: 10, weight: 80, lastDon: 110, note: 'Eligible — experienced donor' },
    { name: 'Anita Dewangan',   gender: 'FEMALE', bg: 'B_POS',  place: 'BHILAI',       age: 26, avail: true,  elig: 'ELIGIBLE',                 donations: 1,  weight: 51, lastDon: 200, note: 'Eligible' },
    { name: 'Rahul Thakur',     gender: 'MALE',   bg: 'A_POS',  place: 'DURG',         age: 30, avail: false, elig: 'ELIGIBLE',                 donations: 5,  weight: 65, lastDon: 150, note: 'NOT AVAILABLE' },
    // --- Bilaspur ---
    { name: 'Meera Jaiswal',    gender: 'FEMALE', bg: 'O_POS',  place: 'BILASPUR',     age: 27, avail: true,  elig: 'ELIGIBLE',                 donations: 3,  weight: 54, lastDon: 95,  note: 'Eligible — far from Raipur (tests radius)' },
    { name: 'Suresh Markam',    gender: 'MALE',   bg: 'B_POS',  place: 'BILASPUR',     age: 45, avail: true,  elig: 'ELIGIBLE',                 donations: 12, weight: 82, lastDon: 100, note: 'Eligible — veteran donor, far' },
    // --- Edge cases ---
    { name: 'Riya Deshmukh',    gender: 'FEMALE', bg: 'AB_POS', place: 'RAIPUR_CITY',  age: 19, avail: true,  elig: 'ELIGIBLE',                 donations: 0,  weight: 48, lastDon: null, note: 'Eligible — brand new donor, borderline weight' },
    { name: 'Prakash Soni',     gender: 'MALE',   bg: 'O_NEG',  place: 'RAIPUR_CITY',  age: 67, avail: false, elig: 'TEMPORARILY_UNAVAILABLE',  donations: 15, weight: 70, lastDon: 365, note: 'OVERAGE — 67 years old (max 65), also SUSPENDED account' },
  ];

  const donors = [];
  for (let i = 0; i < DONOR_LIST.length; i++) {
    const d = DONOR_LIST[i];
    const loc = PLACES[d.place];
    const phoneNum = `+91900000010${String(i + 1).padStart(2, '0')}`;
    const firstName = d.name.split(' ')[0].toLowerCase();
    const emailAddr = `${firstName}${i}@lifelink.in`;

    const donor = await prisma.user.create({
      data: {
        firebaseUid: `demo-donor-uid-${i}`,
        phone: phoneNum,
        email: emailAddr,
        passwordHash: await pw('donor123'),
        fullName: d.name,
        role: 'DONOR',
        accountStatus: i === 19 ? 'SUSPENDED' : 'ACTIVE', // Prakash is suspended
        verificationStatus: 'VERIFIED',
        profileComplete: true,
        notificationPrefs: { create: {} },
        donorProfile: {
          create: {
            dateOfBirth: new Date(2026 - d.age, (i * 3) % 12, (i % 28) + 1),
            gender: d.gender,
            bloodGroup: d.bg,
            address: `${10 + i * 5}, Sector ${(i % 10) + 20}, ${loc.city}`,
            city: loc.city,
            state: loc.state,
            latitude: jitter(loc.lat),
            longitude: jitter(loc.lng),
            weight: d.weight,
            lastDonationDate: d.lastDon ? daysAgo(d.lastDon) : null,
            availability: d.avail ? 'AVAILABLE' : 'NOT_AVAILABLE',
            eligibilityStatus: d.elig,
            eligibilityReason: d.elig !== 'ELIGIBLE' ? d.note : null,
            eligibilityCheckedAt: new Date(),
            activeEmergencyId: d.activeEmg ? 'placeholder-will-update' : null,
            totalDonations: d.donations,
            responseCount: Math.min(d.donations + 2, 12),
            acceptCount: d.donations,
          },
        },
      },
      include: { donorProfile: true },
    });
    donors.push(donor);
  }

  // ─── 4 Hospitals ─────────────────────────────────────────────────────────────
  console.log('  ✦ 6 hospitals...');
  const HOSP_LIST = [
    // Nearest to IIIT-NR
    { name: 'Sadbhavna Hospital',                  lat: 21.1310, lng: 81.7916, place: 'ATAL_NAGAR',   reg: 'HOSP-CG-001', lic: 'LIC-CG-001', rep: 'Dr. Rajeev Gupta',   addr: 'Sector 30, Atal Nagar' },
    { name: 'BALCO Medical Centre',                lat: 21.1380, lng: 81.7800, place: 'ATAL_NAGAR',   reg: 'HOSP-CG-002', lic: 'LIC-CG-002', rep: 'Dr. Vivek Tandon',   addr: 'Sector 36, Atal Nagar, Uparwara' },
    { name: 'Shri Sathya Sai Sanjeevani Hospital', lat: 21.1390, lng: 81.7520, place: 'ATAL_NAGAR',   reg: 'HOSP-CG-003', lic: 'LIC-CG-003', rep: 'Dr. Ashish Jain',    addr: 'Sector 3, Nava Raipur' },
    // Raipur city
    { name: 'AIIMS Raipur',                        lat: 21.1800, lng: 81.7380, place: 'ATAL_NAGAR',   reg: 'HOSP-CG-004', lic: 'LIC-CG-004', rep: 'Dr. Nitin Nagarkar', addr: 'GE Road, Tatibandh' },
    { name: 'Ramkrishna CARE Hospital',             lat: 21.2230, lng: 81.6375, place: 'RAIPUR_SOUTH', reg: 'HOSP-CG-005', lic: 'LIC-CG-005', rep: 'Dr. Ajay Tiwari',    addr: 'Pachpedhi Naka, Dhamtari Road' },
    { name: 'MMI Narayana Hospital',                lat: 21.2550, lng: 81.6060, place: 'RAIPUR_CITY',  reg: 'HOSP-CG-006', lic: 'LIC-CG-006', rep: 'Dr. Sunil Agrawal',  addr: 'Lalpur, Raipur' },
  ];

  const hospitals = [];
  for (let i = 0; i < HOSP_LIST.length; i++) {
    const h = HOSP_LIST[i];
    const phoneNum = `+91900000050${i}`;
    const slug = h.name.toLowerCase().replace(/[\s.]+/g, '');

    const user = await prisma.user.create({
      data: {
        firebaseUid: `demo-hospital-uid-${i}`,
        phone: phoneNum,
        email: `admin@${slug}.in`,
        passwordHash: await pw('hospital123'),
        fullName: h.name,
        role: 'HOSPITAL',
        accountStatus: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        profileComplete: true,
        notificationPrefs: { create: {} },
        hospital: {
          create: {
            name: h.name,
            registrationNumber: h.reg,
            licenseNumber: h.lic,
            address: h.addr,
            city: PLACES[h.place].city,
            state: PLACES[h.place].state,
            latitude: h.lat,
            longitude: h.lng,
            contactPhone: phoneNum,
            contactEmail: `contact@${slug}.in`,
            representativeName: h.rep,
            verificationStatus: i < 5 ? 'VERIFIED' : 'PENDING', // last one pending for demo
            verifiedAt: i < 5 ? new Date() : null,
          },
        },
      },
      include: { hospital: true },
    });
    hospitals.push(user);
  }

  // ─── 2 Blood Banks ──────────────────────────────────────────────────────────
  console.log('  ✦ 2 blood banks...');
  const BB_LIST = [
    { name: 'State Blood Bank Raipur',  lat: 21.2490, lng: 81.6310, addr: 'Jail Road, Raipur' },
    { name: 'Rotary Blood Bank Raipur', lat: 21.2350, lng: 81.6250, addr: 'Pandri, Raipur' },
  ];

  const bloodBanks = [];
  for (let i = 0; i < BB_LIST.length; i++) {
    const b = BB_LIST[i];
    const phoneNum = `+9190000020${i}`;
    const slug = b.name.toLowerCase().replace(/[\s.]+/g, '');

    const user = await prisma.user.create({
      data: {
        firebaseUid: `demo-bb-uid-${i}`,
        phone: phoneNum,
        email: `admin@${slug}.in`,
        passwordHash: await pw('bloodbank123'),
        fullName: b.name,
        role: 'BLOOD_BANK',
        accountStatus: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        profileComplete: true,
        notificationPrefs: { create: {} },
        bloodBank: {
          create: {
            name: b.name,
            registrationNumber: `BB-CG-${String(i + 1).padStart(3, '0')}`,
            address: b.addr,
            city: 'Raipur',
            state: 'Chhattisgarh',
            latitude: b.lat,
            longitude: b.lng,
            contactPhone: phoneNum,
            contactEmail: `info@${slug}.in`,
            verificationStatus: 'VERIFIED',
            verifiedAt: new Date(),
            inventoryUpdatedAt: new Date(),
          },
        },
      },
      include: { bloodBank: true },
    });
    bloodBanks.push(user);

    // Full inventory — all 8 blood groups
    for (const bg of ALL_BG) {
      const isRare = bg.includes('NEG');
      await prisma.bloodInventory.create({
        data: {
          bloodBankId: user.bloodBank.id,
          bloodGroup: bg,
          availableUnits: isRare ? 2 + Math.floor(Math.random() * 5) : 8 + Math.floor(Math.random() * 15),
          collectionDate: daysAgo(3 + Math.floor(Math.random() * 7)),
          expiryDate: daysFromNow(25 + Math.floor(Math.random() * 15)),
          status: 'AVAILABLE',
        },
      });
    }
  }

  // ─── 2 NGOs + 2 Camps ───────────────────────────────────────────────────────
  console.log('  ✦ 2 NGOs with 2 camps...');
  const NGO_LIST = [
    { name: 'CG Blood Seva',            reg: 'NGO-CG-001', rep: 'Rakesh Sahu',    place: 'RAIPUR_CITY' },
    { name: 'Jeevan Dhara Foundation',   reg: 'NGO-CG-002', rep: 'Sunita Pandey',  place: 'BHILAI' },
  ];

  const ngos = [];
  for (let i = 0; i < NGO_LIST.length; i++) {
    const n = NGO_LIST[i];
    const loc = PLACES[n.place];
    const phoneNum = `+9190000030${i}`;

    const user = await prisma.user.create({
      data: {
        firebaseUid: `demo-ngo-uid-${i}`,
        phone: phoneNum,
        email: `admin@${n.name.toLowerCase().replace(/\s+/g, '')}.org`,
        passwordHash: await pw('ngo123'),
        fullName: n.name,
        role: 'CAMP_ORGANIZER',
        accountStatus: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        profileComplete: true,
        notificationPrefs: { create: {} },
        ngo: {
          create: {
            name: n.name,
            registrationNumber: n.reg,
            address: `${10 + i * 20} Main Road, ${loc.city}`,
            city: loc.city,
            state: loc.state,
            contactPhone: phoneNum,
            representativeName: n.rep,
            verificationStatus: 'VERIFIED',
            verifiedAt: new Date(),
          },
        },
      },
      include: { ngo: true },
    });
    ngos.push(user);
  }

  const camp1 = await prisma.donationCamp.create({
    data: {
      name: 'IIIT-NR Blood Donation Drive',
      organizerType: 'NGO',
      ngoId: ngos[0].ngo.id,
      date: daysFromNow(7),
      startTime: '09:00',
      endTime: '16:00',
      address: 'IIIT Naya Raipur, Sector 24, Atal Nagar',
      city: 'Naya Raipur',
      state: 'Chhattisgarh',
      latitude: 21.1291,
      longitude: 81.7656,
      capacity: 60,
      registeredCount: 12,
      description: 'Annual blood donation drive at IIIT Naya Raipur campus. Open to students, faculty, and nearby residents.',
      status: 'APPROVED',
    },
  });

  await prisma.donationCamp.create({
    data: {
      name: 'Bhilai Civic Center Camp',
      organizerType: 'NGO',
      ngoId: ngos[1].ngo.id,
      date: daysAgo(10),
      startTime: '08:00',
      endTime: '15:00',
      address: 'Civic Center, Bhilai',
      city: 'Bhilai',
      state: 'Chhattisgarh',
      latitude: 21.2167,
      longitude: 81.4333,
      capacity: 80,
      registeredCount: 45,
      description: 'Completed blood donation camp organized by Jeevan Dhara Foundation.',
      status: 'COMPLETED',
    },
  });

  // Register first 3 donors for the upcoming IIIT camp
  for (let i = 0; i < 3; i++) {
    await prisma.campRegistration.create({
      data: {
        campId: camp1.id,
        donorProfileId: donors[i].donorProfile.id,
        status: 'REGISTERED',
      },
    });
  }

  // ─── Appointment Slots + Bookings ────────────────────────────────────────────
  console.log('  ✦ Appointment slots & bookings...');
  const slots = [];
  for (const bbUser of bloodBanks) {
    for (let d = 1; d <= 3; d++) {
      const slot = await prisma.appointmentSlot.create({
        data: {
          bloodBankId: bbUser.bloodBank.id,
          date: daysFromNow(d),
          startTime: `${9 + d}:00`,
          endTime: `${10 + d}:00`,
          capacity: 5,
        },
      });
      slots.push(slot);
    }
  }

  await prisma.appointment.create({
    data: {
      donorProfileId: donors[0].donorProfile.id,
      bloodBankId: bloodBanks[0].bloodBank.id,
      slotId: slots[0].id,
      status: 'CONFIRMED',
    },
  });
  await prisma.appointment.create({
    data: {
      donorProfileId: donors[1].donorProfile.id,
      bloodBankId: bloodBanks[0].bloodBank.id,
      slotId: slots[1].id,
      status: 'PENDING',
    },
  });

  // ─── Blood Requests ─────────────────────────────────────────────────────────
  console.log('  ✦ Blood requests...');
  await prisma.bloodRequest.create({
    data: {
      hospitalId: hospitals[0].hospital.id,
      bloodGroup: 'B_POS',
      requiredUnits: 3,
      urgency: 'URGENT',
      requiredBy: daysFromNow(2),
      patientRef: 'PAT-101',
      instructions: 'Required for scheduled surgery',
      status: 'CREATED',
    },
  });
  await prisma.bloodRequest.create({
    data: {
      hospitalId: hospitals[1].hospital.id,
      bloodGroup: 'O_NEG',
      requiredUnits: 2,
      urgency: 'NORMAL',
      requiredBy: daysFromNow(5),
      patientRef: 'PAT-102',
      instructions: 'Thalassemia patient — regular transfusion',
      status: 'FULFILLED',
      fulfilledUnits: 2,
    },
  });

  // ─── Emergency Requests ──────────────────────────────────────────────────────
  console.log('  ✦ Emergency requests...');

  // Active emergency: SEARCHING at AIIMS
  const emg1 = await prisma.emergencyRequest.create({
    data: {
      hospitalId: hospitals[0].hospital.id,
      bloodGroup: 'O_POS',
      requiredUnits: 2,
      urgency: 'EMERGENCY',
      requiredBy: daysFromNow(1),
      patientRef: 'EMR-001',
      currentRadiusKm: 10,
      status: 'SEARCHING',
      searchStartedAt: new Date(),
      expiresAt: daysFromNow(1),
    },
  });

  // Update Manish's activeEmergencyId now that we have a real emergency ID
  // This demonstrates the "active emergency lock" rule — Manish won't be notified for new emergencies
  await prisma.donorProfile.update({
    where: { id: donors[7].donorProfile.id },
    data: { activeEmergencyId: emg1.id },
  });

  await prisma.emergencyDonorResponse.create({
    data: {
      emergencyRequestId: emg1.id,
      donorProfileId: donors[0].donorProfile.id,
      status: 'ACCEPTED',
      responseTimeMs: 42000,
      notifiedAt: new Date(),
      respondedAt: new Date(),
    },
  });
  await prisma.emergencyDonorResponse.create({
    data: {
      emergencyRequestId: emg1.id,
      donorProfileId: donors[2].donorProfile.id,
      status: 'NOTIFIED',
      notifiedAt: new Date(),
    },
  });
  await prisma.emergencyDonorResponse.create({
    data: {
      emergencyRequestId: emg1.id,
      donorProfileId: donors[4].donorProfile.id,
      status: 'REJECTED',
      responseTimeMs: 85000,
      notifiedAt: new Date(),
      respondedAt: new Date(),
    },
  });

  // Fulfilled emergency at Ramkrishna CARE (history)
  const emg2 = await prisma.emergencyRequest.create({
    data: {
      hospitalId: hospitals[1].hospital.id,
      bloodGroup: 'A_POS',
      requiredUnits: 2,
      acceptedUnits: 2,
      urgency: 'URGENT',
      requiredBy: daysAgo(4),
      patientRef: 'EMR-002',
      currentRadiusKm: 15,
      status: 'FULFILLED',
      searchStartedAt: daysAgo(5),
      fulfilledAt: daysAgo(5),
      expiresAt: daysAgo(4),
    },
  });
  await prisma.emergencyDonorResponse.create({
    data: {
      emergencyRequestId: emg2.id,
      donorProfileId: donors[1].donorProfile.id,
      status: 'DONATION_COMPLETED',
      responseTimeMs: 35000,
      notifiedAt: daysAgo(5),
      respondedAt: daysAgo(5),
      completedAt: daysAgo(5),
    },
  });
  await prisma.emergencyDonorResponse.create({
    data: {
      emergencyRequestId: emg2.id,
      donorProfileId: donors[10].donorProfile.id,
      status: 'DONATION_COMPLETED',
      responseTimeMs: 60000,
      notifiedAt: daysAgo(5),
      respondedAt: daysAgo(5),
      completedAt: daysAgo(5),
    },
  });

  // ─── Donation Records ────────────────────────────────────────────────────────
  console.log('  ✦ Donations...');
  const donationPairs = [
    { donorIdx: 0, bbIdx: 0, daysBack: 95 },
    { donorIdx: 4, bbIdx: 0, daysBack: 120 },
    { donorIdx: 8, bbIdx: 1, daysBack: 60 },
    { donorIdx: 12, bbIdx: 1, daysBack: 200 },
  ];
  for (const dp of donationPairs) {
    await prisma.donation.create({
      data: {
        donorProfileId: donors[dp.donorIdx].donorProfile.id,
        bloodBankId: bloodBanks[dp.bbIdx].bloodBank.id,
        bloodGroup: donors[dp.donorIdx].donorProfile.bloodGroup,
        donationType: 'WHOLE_BLOOD',
        donationDate: daysAgo(dp.daysBack),
        status: 'COMPLETED',
      },
    });
  }

  // ─── Notifications ───────────────────────────────────────────────────────────
  console.log('  ✦ Notifications...');
  await prisma.notification.create({
    data: {
      userId: donors[0].id,
      type: 'EMERGENCY_REQUEST',
      title: 'Emergency: O+ Blood Needed at AIIMS Raipur',
      body: 'AIIMS Raipur urgently needs 2 units of O+ blood. You are 3.2 km away.',
      data: { emergencyRequestId: emg1.id },
      isRead: false,
    },
  });
  await prisma.notification.create({
    data: {
      userId: donors[1].id,
      type: 'APPOINTMENT_CONFIRMATION',
      title: 'Appointment Confirmed',
      body: 'Your blood donation appointment at State Blood Bank Raipur has been confirmed.',
      isRead: false,
    },
  });
  await prisma.notification.create({
    data: {
      userId: donors[2].id,
      type: 'CAMP_REMINDER',
      title: 'IIIT-NR Blood Drive in 7 Days',
      body: 'The blood donation drive at IIIT Naya Raipur campus is coming up. You are registered!',
      isRead: true,
      readAt: new Date(),
    },
  });

  // ─── Audit Logs ──────────────────────────────────────────────────────────────
  console.log('  ✦ Audit logs...');
  await prisma.auditLog.createMany({
    data: [
      { actorId: admin.id, action: 'HOSPITAL_VERIFIED', entityType: 'Hospital', entityId: hospitals[0].hospital.id, details: { name: 'AIIMS Raipur' } },
      { actorId: admin.id, action: 'BLOOD_BANK_VERIFIED', entityType: 'BloodBank', entityId: bloodBanks[0].bloodBank.id, details: { name: 'State Blood Bank' } },
      { actorId: hospitals[0].id, action: 'EMERGENCY_CREATED', entityType: 'EmergencyRequest', entityId: emg1.id, details: { bloodGroup: 'O_POS' } },
    ],
  });

  // ─── Done ────────────────────────────────────────────────────────────────────
  console.log('\n✅ Seed completed!\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  DEMO ACCOUNTS (email / password)                            ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log('║  Admin        admin@lifelink.in                  / admin123    ║');
  console.log('║  Hospital     admin@sadbhavnahospital.in         / hospital123 ║');
  console.log('║  Hospital     admin@balcomedicalcentre.in        / hospital123 ║');
  console.log('║  Hospital     admin@aiimsraipur.in               / hospital123 ║');
  console.log('║  Blood Bank   admin@statebloodbankriapur.in      / bloodbank123║');
  console.log('║  NGO          admin@cgbloodseva.org              / ngo123      ║');
  console.log('║  Donor        aarav0@lifelink.in                 / donor123    ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log('║  20 donors · 6 hospitals · 2 blood banks · 2 NGOs · 2 camps ║');
  console.log('║  2 emergencies · 16 inventory items · 6 slots · 4 donations ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
