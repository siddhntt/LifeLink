const prisma = require('../config/database');
const { sendSuccess } = require('../utils/helpers');
const { AppError } = require('../utils/helpers');
const inventoryService = require('../services/inventoryService');
const { createSlot } = require('../services/appointmentService');

async function registerBloodBank(req, res) {
  const userId = req.user.id;
  const existing = await prisma.bloodBank.findUnique({ where: { userId } });
  if (existing) throw new AppError('Blood bank profile already exists', 409, 'DUPLICATE');

  const bloodBank = await prisma.bloodBank.create({
    data: { userId, ...req.body },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { profileComplete: true, fullName: req.body.name },
  });

  sendSuccess(res, bloodBank, 'Blood bank registered', 201);
}

async function getProfile(req, res) {
  const bloodBank = req.user.bloodBank;
  if (!bloodBank) throw new AppError('Blood bank profile not found', 404, 'NOT_FOUND');
  sendSuccess(res, bloodBank);
}

async function updateProfile(req, res) {
  const bloodBank = req.user.bloodBank;
  if (!bloodBank) throw new AppError('Blood bank profile not found', 404, 'NOT_FOUND');

  const updated = await prisma.bloodBank.update({
    where: { id: bloodBank.id },
    data: req.body,
  });
  sendSuccess(res, updated, 'Profile updated');
}

async function getDashboard(req, res) {
  const bloodBank = req.user.bloodBank;
  if (!bloodBank) throw new AppError('Blood bank profile not found', 404, 'NOT_FOUND');

  const [inventory, expiringUnits, appointments, camps, donations] = await Promise.all([
    prisma.bloodInventory.findMany({
      where: { bloodBankId: bloodBank.id, status: 'AVAILABLE' },
      orderBy: { bloodGroup: 'asc' },
    }),
    prisma.bloodInventory.findMany({
      where: {
        bloodBankId: bloodBank.id,
        status: 'AVAILABLE',
        expiryDate: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.appointment.findMany({
      where: { bloodBankId: bloodBank.id, status: { in: ['PENDING', 'CONFIRMED'] } },
      include: {
        donorProfile: { include: { user: { select: { fullName: true, phone: true } } } },
        slot: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
    }),
    prisma.donationCamp.findMany({
      where: { bloodBankId: bloodBank.id },
      orderBy: { date: 'desc' },
      take: 5,
    }),
    prisma.donation.findMany({
      where: { bloodBankId: bloodBank.id },
      orderBy: { donationDate: 'desc' },
      take: 10,
      include: { donorProfile: { include: { user: { select: { fullName: true } } } } },
    }),
  ]);

  sendSuccess(res, {
    bloodBank,
    inventory,
    expiringUnits,
    appointments,
    camps,
    recentDonations: donations,
  });
}

async function listBloodBanks(req, res) {
  const banks = await prisma.bloodBank.findMany({
    where: { verificationStatus: 'VERIFIED' },
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      latitude: true,
      longitude: true,
      contactPhone: true,
      inventoryUpdatedAt: true,
    },
  });
  sendSuccess(res, banks);
}

async function getBloodBank(req, res) {
  const bank = await prisma.bloodBank.findFirst({
    where: { id: req.params.id, verificationStatus: 'VERIFIED' },
    include: {
      inventory: { where: { status: 'AVAILABLE', availableUnits: { gt: 0 } } },
    },
  });
  if (!bank) throw new AppError('Blood bank not found', 404, 'NOT_FOUND');
  sendSuccess(res, bank);
}

async function getInventory(req, res) {
  const bloodBank = req.user.bloodBank;
  const bankId = bloodBank?.id || req.params.id;

  const inventory = await prisma.bloodInventory.findMany({
    where: { bloodBankId: bankId },
    orderBy: [{ bloodGroup: 'asc' }, { expiryDate: 'asc' }],
  });
  sendSuccess(res, inventory);
}

async function addInventory(req, res) {
  const bloodBank = req.user.bloodBank;
  if (!bloodBank) throw new AppError('Blood bank profile not found', 404, 'NOT_FOUND');

  const data = { ...req.body };
  if (data.collectionDate) data.collectionDate = new Date(data.collectionDate);
  if (data.expiryDate) data.expiryDate = new Date(data.expiryDate);

  const item = await inventoryService.addInventory(bloodBank.id, data);
  sendSuccess(res, item, 'Inventory added', 201);
}

async function updateInventoryItem(req, res) {
  const bloodBank = req.user.bloodBank;
  if (!bloodBank) throw new AppError('Blood bank profile not found', 404, 'NOT_FOUND');

  const { action, units = 1, ...data } = req.body;
  let item;

  if (action === 'reserve') {
    item = await inventoryService.reserveUnits(req.params.id, bloodBank.id, units);
  } else if (action === 'release') {
    item = await inventoryService.releaseUnits(req.params.id, bloodBank.id, units);
  } else if (action === 'mark_expired') {
    item = await inventoryService.markExpired(req.params.id, bloodBank.id);
  } else {
    if (data.collectionDate) data.collectionDate = new Date(data.collectionDate);
    if (data.expiryDate) data.expiryDate = new Date(data.expiryDate);
    item = await inventoryService.updateInventory(req.params.id, bloodBank.id, data);
  }

  sendSuccess(res, item, 'Inventory updated');
}

async function recordDonation(req, res) {
  const bloodBank = req.user.bloodBank;
  if (!bloodBank) throw new AppError('Blood bank profile not found', 404, 'NOT_FOUND');

  const { donorProfileId, bloodGroup, donationType, donationDate, certificateRef, notes } = req.body;

  const donor = await prisma.donorProfile.findUnique({ where: { id: donorProfileId } });
  if (!donor) throw new AppError('Donor not found', 404, 'NOT_FOUND');

  const donation = await prisma.$transaction(async (tx) => {
    const record = await tx.donation.create({
      data: {
        donorProfileId,
        bloodBankId: bloodBank.id,
        bloodGroup,
        donationType: donationType || 'WHOLE_BLOOD',
        donationDate: new Date(donationDate || Date.now()),
        status: 'COMPLETED',
        certificateRef,
        notes,
      },
    });

    await tx.donorProfile.update({
      where: { id: donorProfileId },
      data: {
        lastDonationDate: new Date(donationDate || Date.now()),
        totalDonations: { increment: 1 },
        activeEmergencyId: null,
      },
    });

    return record;
  });

  const { updateDonorEligibility } = require('../services/eligibilityService');
  await updateDonorEligibility(donorProfileId);

  sendSuccess(res, donation, 'Donation recorded', 201);
}

async function searchBlood(req, res) {
  const { bloodGroup, latitude, longitude, radiusKm } = req.query;
  const results = await inventoryService.searchAvailability(
    bloodGroup,
    parseFloat(latitude),
    parseFloat(longitude),
    parseFloat(radiusKm)
  );
  sendSuccess(res, results);
}

async function createAppointmentSlot(req, res) {
  const bloodBank = req.user.bloodBank;
  if (!bloodBank) throw new AppError('Blood bank profile not found', 404, 'NOT_FOUND');

  const slot = await createSlot(bloodBank.id, req.body);
  sendSuccess(res, slot, 'Slot created', 201);
}

async function getSlots(req, res) {
  const bloodBankId = req.user.bloodBank?.id || req.params.id;
  const slots = await prisma.appointmentSlot.findMany({
    where: { bloodBankId, isActive: true, date: { gte: new Date() } },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });
  sendSuccess(res, slots);
}

module.exports = {
  registerBloodBank,
  getProfile,
  updateProfile,
  getDashboard,
  listBloodBanks,
  getBloodBank,
  getInventory,
  addInventory,
  updateInventoryItem,
  recordDonation,
  searchBlood,
  createAppointmentSlot,
  getSlots,
};
