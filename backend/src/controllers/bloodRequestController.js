const prisma = require('../config/database');
const { sendSuccess } = require('../utils/helpers');
const { AppError } = require('../utils/helpers');
const config = require('../config');

async function createBloodRequest(req, res) {
  const hospital = req.user.hospital;
  if (!hospital) throw new AppError('Hospital profile not found', 404, 'NOT_FOUND');
  if (hospital.verificationStatus !== 'VERIFIED') {
    throw new AppError('Only verified hospitals can create blood requests', 403, 'NOT_VERIFIED');
  }

  const expiresAt = new Date(Date.now() + config.emergency.requestExpiryHours * 60 * 60 * 1000);

  const request = await prisma.bloodRequest.create({
    data: {
      hospitalId: hospital.id,
      ...req.body,
      requiredBy: new Date(req.body.requiredBy),
      expiresAt,
    },
  });

  sendSuccess(res, request, 'Blood request created', 201);
}

async function getBloodRequests(req, res) {
  const hospital = req.user.hospital;
  if (!hospital) throw new AppError('Hospital profile not found', 404, 'NOT_FOUND');

  const requests = await prisma.bloodRequest.findMany({
    where: { hospitalId: hospital.id },
    orderBy: { createdAt: 'desc' },
  });

  sendSuccess(res, requests);
}

async function getBloodRequest(req, res) {
  const hospital = req.user.hospital;
  const request = await prisma.bloodRequest.findFirst({
    where: { id: req.params.id, hospitalId: hospital?.id },
  });

  if (!request) throw new AppError('Blood request not found', 404, 'NOT_FOUND');
  sendSuccess(res, request);
}

async function updateBloodRequest(req, res) {
  const hospital = req.user.hospital;
  const request = await prisma.bloodRequest.findFirst({
    where: { id: req.params.id, hospitalId: hospital.id },
  });

  if (!request) throw new AppError('Blood request not found', 404, 'NOT_FOUND');

  const updated = await prisma.bloodRequest.update({
    where: { id: request.id },
    data: req.body,
  });

  sendSuccess(res, updated, 'Blood request updated');
}

async function cancelBloodRequest(req, res) {
  const hospital = req.user.hospital;
  const request = await prisma.bloodRequest.findFirst({
    where: { id: req.params.id, hospitalId: hospital.id },
  });

  if (!request) throw new AppError('Blood request not found', 404, 'NOT_FOUND');

  const updated = await prisma.bloodRequest.update({
    where: { id: request.id },
    data: { status: 'CANCELLED' },
  });

  sendSuccess(res, updated, 'Blood request cancelled');
}

module.exports = {
  createBloodRequest,
  getBloodRequests,
  getBloodRequest,
  updateBloodRequest,
  cancelBloodRequest,
};
