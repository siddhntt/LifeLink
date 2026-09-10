const prisma = require('../config/database');
const { sendSuccess } = require('../utils/helpers');
const { AppError } = require('../utils/helpers');
const { bookAppointment, updateAppointmentStatus } = require('../services/appointmentService');

async function registerNGO(req, res) {
  const userId = req.user.id;
  const existing = await prisma.nGO.findUnique({ where: { userId } });
  if (existing) throw new AppError('NGO profile already exists', 409, 'DUPLICATE');

  const ngo = await prisma.nGO.create({ data: { userId, ...req.body } });

  await prisma.user.update({
    where: { id: userId },
    data: { profileComplete: true, fullName: req.body.name },
  });

  sendSuccess(res, ngo, 'NGO registered', 201);
}

async function createCamp(req, res) {
  const user = req.user;
  let organizerType = 'NGO';
  let bloodBankId = null;
  let ngoId = null;

  if (user.role === 'BLOOD_BANK' && user.bloodBank) {
    organizerType = 'BLOOD_BANK';
    bloodBankId = user.bloodBank.id;
  } else if (user.role === 'CAMP_ORGANIZER' && user.ngo) {
    ngoId = user.ngo.id;
  } else {
    throw new AppError('Not authorized to create camps', 403, 'FORBIDDEN');
  }

  const camp = await prisma.donationCamp.create({
    data: {
      ...req.body,
      date: new Date(req.body.date),
      organizerType,
      bloodBankId,
      ngoId,
      status: 'PENDING_APPROVAL',
    },
  });

  sendSuccess(res, camp, 'Camp created and pending approval', 201);
}

async function listCamps(req, res) {
  const where = { status: { in: ['APPROVED', 'ACTIVE'] } };
  if (req.query.city) where.city = req.query.city;

  const camps = await prisma.donationCamp.findMany({
    where,
    orderBy: { date: 'asc' },
    include: {
      bloodBank: { select: { name: true } },
      ngo: { select: { name: true } },
    },
  });
  sendSuccess(res, camps);
}

async function getCamp(req, res) {
  const camp = await prisma.donationCamp.findUnique({
    where: { id: req.params.id },
    include: {
      bloodBank: { select: { name: true, contactPhone: true } },
      ngo: { select: { name: true, contactPhone: true } },
      _count: { select: { registrations: true } },
    },
  });
  if (!camp) throw new AppError('Camp not found', 404, 'NOT_FOUND');
  sendSuccess(res, camp);
}

async function registerForCamp(req, res) {
  const profile = req.user.donorProfile;
  if (!profile) throw new AppError('Donor profile required', 403, 'FORBIDDEN');

  const camp = await prisma.donationCamp.findUnique({ where: { id: req.params.id } });
  if (!camp || !['APPROVED', 'ACTIVE'].includes(camp.status)) {
    throw new AppError('Camp not available for registration', 400, 'CAMP_UNAVAILABLE');
  }

  if (camp.registeredCount >= camp.capacity) {
    throw new AppError('Camp is full', 400, 'CAMP_FULL');
  }

  const registration = await prisma.$transaction(async (tx) => {
    const reg = await tx.campRegistration.create({
      data: { campId: camp.id, donorProfileId: profile.id },
    });
    await tx.donationCamp.update({
      where: { id: camp.id },
      data: { registeredCount: { increment: 1 } },
    });
    return reg;
  });

  sendSuccess(res, registration, 'Registered for camp', 201);
}

async function checkInCamp(req, res) {
  const { qrCode } = req.body;
  const camp = await prisma.donationCamp.findUnique({ where: { qrCode } });
  if (!camp) throw new AppError('Invalid QR code', 404, 'NOT_FOUND');

  const profile = req.user.donorProfile;
  const registration = await prisma.campRegistration.findUnique({
    where: { campId_donorProfileId: { campId: camp.id, donorProfileId: profile.id } },
  });

  if (!registration) throw new AppError('Not registered for this camp', 404, 'NOT_REGISTERED');

  const updated = await prisma.campRegistration.update({
    where: { id: registration.id },
    data: { status: 'CHECKED_IN', checkedInAt: new Date() },
  });

  sendSuccess(res, updated, 'Checked in successfully');
}

async function bookAppointmentHandler(req, res) {
  const profile = req.user.donorProfile;
  if (!profile) throw new AppError('Donor profile required', 403, 'FORBIDDEN');

  const appointment = await bookAppointment(profile.id, req.body.slotId, req.body.notes);
  sendSuccess(res, appointment, 'Appointment booked', 201);
}

async function getAppointments(req, res) {
  const profile = req.user.donorProfile;
  const bloodBank = req.user.bloodBank;

  let appointments;
  if (profile) {
    appointments = await prisma.appointment.findMany({
      where: { donorProfileId: profile.id },
      include: { slot: true, bloodBank: { select: { name: true, address: true } } },
      orderBy: { createdAt: 'desc' },
    });
  } else if (bloodBank) {
    appointments = await prisma.appointment.findMany({
      where: { bloodBankId: bloodBank.id },
      include: {
        donorProfile: { include: { user: { select: { fullName: true, phone: true } } } },
        slot: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  } else {
    throw new AppError('Not authorized', 403, 'FORBIDDEN');
  }

  sendSuccess(res, appointments);
}

async function updateAppointment(req, res) {
  const bloodBank = req.user.bloodBank;
  if (!bloodBank) throw new AppError('Blood bank profile required', 403, 'FORBIDDEN');

  const appointment = await updateAppointmentStatus(
    req.params.id,
    bloodBank.id,
    req.body.status
  );
  sendSuccess(res, appointment, 'Appointment updated');
}

module.exports = {
  registerNGO,
  createCamp,
  listCamps,
  getCamp,
  registerForCamp,
  checkInCamp,
  bookAppointmentHandler,
  getAppointments,
  updateAppointment,
};
