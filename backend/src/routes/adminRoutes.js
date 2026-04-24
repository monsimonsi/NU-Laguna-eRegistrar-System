const express = require("express");

const {
  listPendingAlumni,
  approveAlumni,
  rejectAlumni
} = require("../controllers/adminController");

const { protect, authorize } = require("../middlewares/authMiddleware");
const { ROLES } = require("../constants/enums");

const router = express.Router();

router.use(protect, authorize(ROLES.ADMIN));

router.get("/alumni-verifications", listPendingAlumni);
router.patch("/alumni-verifications/:id/approve", approveAlumni);
router.patch("/alumni-verifications/:id/reject", rejectAlumni);

module.exports = router;
