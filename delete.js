const express = require("express");
const router = express.Router();
const Student = require("../models/student");
const Certificate = require("../models/Certificate");
const Payment = require("../models/paymentDB");
const Scholarship = require("../models/scholarDB");
const Placement = require("../models/placementDB");
const Result = require("../models/resultDB");
const Internship = require("../models/internshipDB");
const Document = require("../models/File");

router.delete("/student/:email", async (req, res) => {
    const email = req.params.email;

    try {
        // Delete student
        const deletedStudent = await Student.findOneAndDelete({
            email: { $regex: new RegExp(`^${email}$`, 'i') }
        });

        if (!deletedStudent) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Delete related records
        await Promise.all([
            Certificate.deleteMany({ studentEmail: email }),
            Payment.deleteMany({ studentEmail: email }),
            Scholarship.deleteMany({ studentEmail: email }),
            Placement.deleteMany({ studentEmail: email }),
            Result.deleteMany({ studentEmail: email }),
            Internship.deleteMany({ studentEmail: email }),
            Document.deleteMany({ studentEmail: email }),
        ]);

        res.json({ message: "Student and all related data deleted." });
    } catch (err) {
  console.error("❌ Delete error:", err.stack || err.message);
  res.status(500).json({ message: "Error deleting student.", error: err.message });
}
});

module.exports = router;
