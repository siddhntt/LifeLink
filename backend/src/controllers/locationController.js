const prisma = require('../config/database');
const { sendSuccess } = require('../utils/helpers');
const { haversineDistance } = require('../utils/distance');

async function getNearbyLocations(req, res) {
  const { latitude, longitude, radiusKm = 25 } = req.query;
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const radius = parseFloat(radiusKm);

  const [bloodBanks, hospitals, camps] = await Promise.all([
    prisma.bloodBank.findMany({
      where: { verificationStatus: 'VERIFIED' },
      select: {
        id: true, name: true, city: true, latitude: true, longitude: true, contactPhone: true,
      },
    }),
    prisma.hospital.findMany({
      where: { verificationStatus: 'VERIFIED' },
      select: {
        id: true, name: true, city: true, latitude: true, longitude: true, contactPhone: true,
      },
    }),
    prisma.donationCamp.findMany({
      where: { status: { in: ['APPROVED', 'ACTIVE'] } },
      select: {
        id: true, name: true, city: true, latitude: true, longitude: true, date: true,
      },
    }),
  ]);

  const withDistance = (items, type) =>
    items
      .map((item) => ({
        ...item,
        type,
        distanceKm: haversineDistance(lat, lng, item.latitude, item.longitude),
      }))
      .filter((item) => item.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm);

  sendSuccess(res, {
    bloodBanks: withDistance(bloodBanks, 'blood_bank'),
    hospitals: withDistance(hospitals, 'hospital'),
    camps: withDistance(camps, 'camp'),
    center: { latitude: lat, longitude: lng },
    radiusKm: radius,
  });
}

module.exports = { getNearbyLocations };
