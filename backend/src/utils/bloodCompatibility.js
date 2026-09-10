const { BLOOD_COMPATIBILITY } = require('./constants');

function getCompatibleDonorGroups(requiredGroup) {
  return BLOOD_COMPATIBILITY[requiredGroup] || [];
}

function isBloodCompatible(donorGroup, requiredGroup) {
  const compatible = BLOOD_COMPATIBILITY[requiredGroup];
  return compatible ? compatible.includes(donorGroup) : false;
}

module.exports = { getCompatibleDonorGroups, isBloodCompatible };
