const prisma = require('../config/database');
const { sendSuccess } = require('../utils/helpers');
const { AppError } = require('../utils/helpers');
const { evaluateDonor, updateDonorEligibility } = require('../services/eligibilityService');

async function getProfile(req, res) {
  const profile = req.user.donorProfile;
  if (!profile) throw new AppError('Donor profile not found', 404, 'NOT_FOUND');

  const evaluation = await evaluateDonor(profile);

  sendSuccess(res, { ...profile, evaluation });
}

async function updateProfile(req, res) {
  const userId = req.user.id;
  const data = req.body;

  if (data.fullName) {
    await prisma.user.update({ where: { id: userId }, data: { fullName: data.fullName } });
  }

  const profileData = { ...data };
  delete profileData.fullName;

  if (profileData.dateOfBirth) profileData.dateOfBirth = new Date(profileData.dateOfBirth);
  if (profileData.lastDonationDate) profileData.lastDonationDate = new Date(profileData.lastDonationDate);

  const profile = await prisma.donorProfile.upsert({
    where: { userId },
    update: profileData,
    create: { userId, ...profileData },
  });

  await updateDonorEligibility(profile.id);

  await prisma.user.update({
    where: { id: userId },
    data: { profileComplete: true },
  });

  const updated = await prisma.donorProfile.findUnique({ where: { id: profile.id } });
  const evaluation = await evaluateDonor(updated);

  sendSuccess(res, { ...updated, evaluation }, 'Profile updated');
}

async function updateAvailability(req, res) {
  const profile = req.user.donorProfile;
  if (!profile) throw new AppError('Donor profile not found', 404, 'NOT_FOUND');

  const updated = await prisma.donorProfile.update({
    where: { id: profile.id },
    data: { availability: req.body.availability },
  });

  sendSuccess(res, updated, 'Availability updated');
}

async function getHistory(req, res) {
  const profile = req.user.donorProfile;
  if (!profile) throw new AppError('Donor profile not found', 404, 'NOT_FOUND');

  const donations = await prisma.donation.findMany({
    where: { donorProfileId: profile.id },
    include: { bloodBank: { select: { name: true, city: true } } },
    orderBy: { donationDate: 'desc' },
  });

  sendSuccess(res, donations);
}

async function getDashboard(req, res) {
  const profile = req.user.donorProfile;
  if (!profile) throw new AppError('Donor profile not found', 404, 'NOT_FOUND');

  const evaluation = await evaluateDonor(profile);

  const [donations, appointments, emergencyResponses, camps, notifications] = await Promise.all([
    prisma.donation.findMany({
      where: { donorProfileId: profile.id },
      orderBy: { donationDate: 'desc' },
      take: 5,
      include: { bloodBank: { select: { name: true } } },
    }),
    prisma.appointment.findMany({
      where: { donorProfileId: profile.id, status: { in: ['PENDING', 'CONFIRMED'] } },
      include: { slot: true, bloodBank: { select: { name: true, address: true } } },
      orderBy: { createdAt: 'asc' },
      take: 3,
    }),
    prisma.emergencyDonorResponse.findMany({
      where: { donorProfileId: profile.id },
      include: {
        emergencyRequest: {
          include: { hospital: { select: { name: true, city: true } } },
        },
      },
      orderBy: { notifiedAt: 'desc' },
      take: 5,
    }),
    prisma.donationCamp.findMany({
      where: { status: 'APPROVED', date: { gte: new Date() } },
      orderBy: { date: 'asc' },
      take: 5,
    }),
    prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  sendSuccess(res, {
    profile,
    evaluation,
    donations,
    appointments,
    emergencyResponses,
    nearbyCamps: camps,
    notifications,
    stats: {
      totalDonations: profile.totalDonations,
      responseCount: profile.responseCount,
      acceptCount: profile.acceptCount,
    },
  });
}

module.exports = {
  getProfile,
  updateProfile,
  updateAvailability,
  getHistory,
  getDashboard,
};
