const { z } = require('zod');

const bloodGroupEnum = z.enum([
  'A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG',
]);

const roleEnum = z.enum(['DONOR', 'HOSPITAL', 'BLOOD_BANK', 'CAMP_ORGANIZER', 'ADMIN']);

const authVerifySchema = z.object({
  idToken: z.string().min(1),
  role: roleEnum.optional(),
  fullName: z.string().min(2).max(100).optional(),
});

const publicRoleEnum = z.enum(['DONOR', 'HOSPITAL', 'BLOOD_BANK', 'CAMP_ORGANIZER']);

const emailRegisterSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  role: publicRoleEnum.default('DONOR'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const emailLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const donorProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  dateOfBirth: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  bloodGroup: bloodGroupEnum.optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  weight: z.number().min(30).max(300).optional(),
  lastDonationDate: z.string().optional(),
});

const availabilitySchema = z.object({
  availability: z.enum(['AVAILABLE', 'NOT_AVAILABLE']),
});

const hospitalSchema = z.object({
  name: z.string().min(2).max(200),
  registrationNumber: z.string().max(100).optional(),
  licenseNumber: z.string().max(100).optional(),
  address: z.string().min(5).max(500),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  contactPhone: z.string().min(10).max(15),
  contactEmail: z.string().email().optional(),
  representativeName: z.string().min(2).max(100),
});

const bloodBankSchema = z.object({
  name: z.string().min(2).max(200),
  registrationNumber: z.string().max(100).optional(),
  address: z.string().min(5).max(500),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  contactPhone: z.string().min(10).max(15),
  contactEmail: z.string().email().optional(),
});

const ngoSchema = z.object({
  name: z.string().min(2).max(200),
  registrationNumber: z.string().max(100).optional(),
  address: z.string().min(5).max(500),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  contactPhone: z.string().min(10).max(15),
  contactEmail: z.string().email().optional(),
  representativeName: z.string().min(2).max(100),
});

const emergencyRequestSchema = z.object({
  bloodGroup: bloodGroupEnum,
  requiredUnits: z.number().int().min(1).max(20),
  urgency: z.enum(['NORMAL', 'URGENT', 'EMERGENCY']).default('EMERGENCY'),
  requiredBy: z.string().datetime(),
  patientRef: z.string().max(100).optional(),
  instructions: z.string().max(1000).optional(),
});

const donorResponseSchema = z.object({
  response: z.enum(['ACCEPTED', 'REJECTED']),
});

const inventorySchema = z.object({
  bloodGroup: bloodGroupEnum,
  componentType: z.enum(['WHOLE_BLOOD', 'PLATELETS', 'PLASMA']).default('WHOLE_BLOOD'),
  availableUnits: z.number().int().min(0),
  collectionDate: z.string().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().max(500).optional(),
});

const appointmentSchema = z.object({
  slotId: z.string().uuid(),
  notes: z.string().max(500).optional(),
});

const slotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  capacity: z.number().int().min(1).max(100).default(5),
});

const campSchema = z.object({
  name: z.string().min(2).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  address: z.string().min(5).max(500),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  capacity: z.number().int().min(1).max(10000).default(100),
  description: z.string().max(2000).optional(),
});

const deviceTokenSchema = z.object({
  token: z.string().min(1),
  deviceInfo: z.string().max(200).optional(),
});

const bloodSearchSchema = z.object({
  bloodGroup: bloodGroupEnum,
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(1).max(200).default(50),
});

const bloodRequestSchema = z.object({
  bloodGroup: bloodGroupEnum,
  requiredUnits: z.number().int().min(1).max(20),
  urgency: z.enum(['NORMAL', 'URGENT', 'EMERGENCY']).default('NORMAL'),
  requiredBy: z.string().datetime(),
  patientRef: z.string().max(100).optional(),
  instructions: z.string().max(1000).optional(),
});

const inventoryUpdateSchema = z.object({
  action: z.enum(['reserve', 'release', 'mark_expired']).optional(),
  units: z.number().int().min(1).max(100).optional(),
  availableUnits: z.number().int().min(0).optional(),
  collectionDate: z.string().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().max(500).optional(),
});

const donationRecordSchema = z.object({
  donorProfileId: z.string().uuid(),
  bloodGroup: bloodGroupEnum,
  donationType: z.enum(['WHOLE_BLOOD', 'PLATELETS', 'PLASMA']).default('WHOLE_BLOOD'),
  donationDate: z.string().optional(),
  certificateRef: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

const donorStatusUpdateSchema = z.object({
  status: z.enum(['ARRIVED', 'DONATION_COMPLETED']),
});

const nearbySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(1).max(200).default(25),
});

const logoutSchema = z.object({
  deviceToken: z.string().optional(),
});

module.exports = {
  authVerifySchema,
  emailRegisterSchema,
  emailLoginSchema,
  donorProfileSchema,
  availabilitySchema,
  hospitalSchema,
  bloodBankSchema,
  ngoSchema,
  emergencyRequestSchema,
  donorResponseSchema,
  inventorySchema,
  appointmentSchema,
  slotSchema,
  campSchema,
  deviceTokenSchema,
  bloodSearchSchema,
  bloodRequestSchema,
  inventoryUpdateSchema,
  donationRecordSchema,
  donorStatusUpdateSchema,
  nearbySchema,
  logoutSchema,
  bloodGroupEnum,
};
