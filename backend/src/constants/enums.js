const ROLES = Object.freeze({
  STUDENT: "student",
  ALUMNI: "alumni",
  ADMIN: "admin"
});

const USER_STATUS = Object.freeze({
  ACTIVE: "active",
  PENDING: "pending",
  REJECTED: "rejected"
});

const VERIFICATION_STATUS = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected"
});

module.exports = {
  ROLES,
  USER_STATUS,
  VERIFICATION_STATUS
};
