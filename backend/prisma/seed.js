require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding LifeLink database with demo data...');

  await prisma.eligibilityRule.createMany({
    data: [
      { key: 'minAge', value: 18, description: 'Minimum donor age in years' },
      { key: 'maxAge', value: 65, description: 'Maximum donor age in years' },
      { key: 'minWeight', value: 45, description: 'Minimum weight in kg' },
      { key: 'minDonationIntervalDays', value: 90, description: 'Days between donations' },
    ],
    skipDuplicates: true,
  });

  await prisma.donorScoringConfig.createMany({
    data: [
      { key: 'distance', weight: 0.4, description: 'Proximity to hospital' },
      { key: 'eligibility', weight: 0.25, description: 'Current eligibility status' },
      { key: 'availability', weight: 0.2, description: 'Donor availability' },
      { key: 'responseHistory', weight: 0.15, description: 'Past response behavior' },
    ],
    skipDuplicates: true,
  });

  await prisma.emergencyRadiusConfig.createMany({
    data: [
      { stage: 0, radiusKm: 5, responseWaitMs: 300000 },
      { stage: 1, radiusKm: 10, responseWaitMs: 300000 },
      { stage: 2, radiusKm: 20, responseWaitMs: 300000 },
      { stage: 3, radiusKm: 50, responseWaitMs: 300000 },
    ],
    skipDuplicates: true,
  });

  const admin = await prisma.user.upsert({
    where: { phone: '+919000000001' },
    update: {},
    create: {
      firebaseUid: 'demo-admin-uid',
      phone: '+919000000001',
      fullName: 'Demo Admin',
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      profileComplete: true,
      notificationPrefs: { create: {} },
    },
  });

  const donors = [];
  const bloodGroups = ['A_POS', 'B_POS', 'O_POS', 'AB_POS', 'O_NEG', 'A_NEG'];
  const cities = [
    { city: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.8777 },
    { city: 'Delhi', state: 'Delhi', lat: 28.6139, lng: 77.209 },
    { city: 'Bangalore', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  ];

  for (let i = 0; i < 15; i++) {
    const loc = cities[i % cities.length];
    const phoneNum = `+9190000001${String(i + 1).padStart(2, '0')}`;
    const donor = await prisma.user.upsert({
      where: { phone: phoneNum },
      update: {},
      create: {
        firebaseUid: `demo-donor-uid-${i}`,
        phone: phoneNum,
        fullName: `Demo Donor ${i + 1}`,
        role: 'DONOR',
        accountStatus: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        profileComplete: true,
        notificationPrefs: { create: {} },
        donorProfile: {
          create: {
            dateOfBirth: new Date(1990 + (i % 20), i % 12, (i % 28) + 1),
            gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
            bloodGroup: bloodGroups[i % bloodGroups.length],
            address: `${100 + i} Demo Street`,
            city: loc.city,
            state: loc.state,
            latitude: loc.lat + (Math.random() - 0.5) * 0.1,
            longitude: loc.lng + (Math.random() - 0.5) * 0.1,
            weight: 55 + (i % 20),
            lastDonationDate: i % 3 === 0 ? new Date(Date.now() - 120 * 24 * 60 * 60 * 1000) : null,
            availability: i % 4 !== 0 ? 'AVAILABLE' : 'NOT_AVAILABLE',
            eligibilityStatus: i % 5 === 0 ? 'TEMPORARILY_UNAVAILABLE' : 'ELIGIBLE',
            totalDonations: i % 5,
            responseCount: i % 3,
            acceptCount: i % 4,
          },
        },
      },
      include: { donorProfile: true },
    });
    donors.push(donor);
  }

  const hospitalUser = await prisma.user.upsert({
    where: { phone: '+919000000050' },
    update: {},
    create: {
      firebaseUid: 'demo-hospital-uid',
      phone: '+919000000050',
      fullName: 'City General Hospital',
      role: 'HOSPITAL',
      accountStatus: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      profileComplete: true,
      notificationPrefs: { create: {} },
      hospital: {
        create: {
          name: 'City General Hospital (Demo)',
          registrationNumber: 'HOSP-DEMO-001',
          licenseNumber: 'LIC-DEMO-001',
          address: '123 Healthcare Avenue',
          city: 'Mumbai',
          state: 'Maharashtra',
          latitude: 19.076,
          longitude: 72.8777,
          contactPhone: '+919000000050',
          contactEmail: 'demo@cityhospital.com',
          representativeName: 'Dr. Demo Representative',
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(),
        },
      },
    },
    include: { hospital: true },
  });

  const bloodBankUser = await prisma.user.upsert({
    where: { phone: '+919000000200' },
    update: {},
    create: {
      firebaseUid: 'demo-bloodbank-uid',
      phone: '+919000000200',
      fullName: 'LifeBlood Center',
      role: 'BLOOD_BANK',
      accountStatus: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      profileComplete: true,
      notificationPrefs: { create: {} },
      bloodBank: {
        create: {
          name: 'LifeBlood Center (Demo)',
          registrationNumber: 'BB-DEMO-001',
          address: '456 Blood Bank Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          latitude: 19.08,
          longitude: 72.88,
          contactPhone: '+919000000200',
          contactEmail: 'demo@lifeblood.com',
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(),
          inventoryUpdatedAt: new Date(),
        },
      },
    },
    include: { bloodBank: true },
  });

  for (const bg of bloodGroups) {
    await prisma.bloodInventory.create({
      data: {
        bloodBankId: bloodBankUser.bloodBank.id,
        bloodGroup: bg,
        availableUnits: 5 + Math.floor(Math.random() * 15),
        collectionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'AVAILABLE',
      },
    });
  }

  const ngoUser = await prisma.user.upsert({
    where: { phone: '+919000000300' },
    update: {},
    create: {
      firebaseUid: 'demo-ngo-uid',
      phone: '+919000000300',
      fullName: 'Hope Foundation',
      role: 'CAMP_ORGANIZER',
      accountStatus: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      profileComplete: true,
      notificationPrefs: { create: {} },
      ngo: {
        create: {
          name: 'Hope Foundation (Demo)',
          registrationNumber: 'NGO-DEMO-001',
          address: '789 Charity Lane',
          city: 'Mumbai',
          state: 'Maharashtra',
          contactPhone: '+919000000300',
          representativeName: 'Demo Organizer',
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(),
        },
      },
    },
    include: { ngo: true },
  });

  const camp = await prisma.donationCamp.create({
    data: {
      name: 'Community Blood Drive (Demo)',
      organizerType: 'NGO',
      ngoId: ngoUser.ngo.id,
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      startTime: '09:00',
      endTime: '17:00',
      address: 'Community Center, Andheri',
      city: 'Mumbai',
      state: 'Maharashtra',
      latitude: 19.1136,
      longitude: 72.8697,
      capacity: 100,
      description: 'Demo donation camp — open to all eligible donors.',
      status: 'APPROVED',
    },
  });

  const slotDate = new Date();
  slotDate.setDate(slotDate.getDate() + 3);
  await prisma.appointmentSlot.create({
    data: {
      bloodBankId: bloodBankUser.bloodBank.id,
      date: slotDate,
      startTime: '10:00',
      endTime: '11:00',
      capacity: 5,
    },
  });

  console.log('Seed completed successfully!');
  console.log('\n--- Demo Accounts (Development Only) ---');
  console.log('Admin:      +919000000001');
  console.log('Hospital:   +919000000050 (verified)');
  console.log('Blood Bank: +919000000200 (verified)');
  console.log('NGO:        +919000000300 (verified)');
  console.log(`Donors:     +919000000101 to +919000000115`);
  console.log(`Camp:       ${camp.name} (ID: ${camp.id})`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
