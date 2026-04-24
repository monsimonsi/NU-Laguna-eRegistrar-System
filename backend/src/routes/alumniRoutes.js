const express = require("express");
const { registerAlumni, reapplyAlumni } = require("../controllers/alumniController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/register", registerAlumni);
router.post("/reapply", protect, reapplyAlumni);

module.exports = router;
