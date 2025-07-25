







const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const Payment = require("../models/paymentDB");

require("dotenv").config();

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer setup (in-memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Upload helper
function uploadToCloudinary(buffer, public_id) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(

      //{ folder: "receipts", public_id: public_id, resource_type: "auto" },
      {     
        folder: "receipts",
        public_id: public_id,
        resource_type: "raw",       // ✅ best for PDF files
        access_mode: "public",       // ✅ makes file viewable by anyone
         allowed_formats: ['pdf'],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}



// GET /:email
router.post("/upload", upload.any(), async (req, res) => {
  console.log("=== /payment/upload endpoint hit ===");
  console.log("Incoming req.body:", req.body);
  console.log("Incoming req.files:", req.files.map(f => `${f.fieldname} (${f.originalname})`));

  try {
    const files = req.files;
    const body = req.body;
    const studentEmail = body.studentEmail;

    if (!studentEmail) {
      console.warn("❌ Missing studentEmail in request body");
      return res.status(400).json({ error: "studentEmail is required" });
    }

    function normalizeArray(field) {
      if (body[field] === undefined) return [];
      return Array.isArray(body[field]) ? body[field] : [body[field]];
    }

    // Load existing payment or create new structure
    let existingPayment = await Payment.findOne({ studentEmail });
    const paymentData = existingPayment || {
      studentEmail,
      year1: [],
      year2: [],
      year3: [],
      year4: [],
    };

    for (const year of ["year1", "year2", "year3", "year4"]) {
      const receiptFiles = files.filter(f => f.fieldname === `${year}_receipt[]`);
      const paidArray = normalizeArray(`${year}_paid`);
      const waivedArray = normalizeArray(`${year}_waived`);
      const penaltyArray = normalizeArray(`${year}_penalty`);

      console.log(`\n--- Processing ${year.toUpperCase()} ---`);
      console.log(`Receipt files found: ${receiptFiles.length}`);
      console.log("paidArray:", paidArray);
      console.log("waivedArray:", waivedArray);
      console.log("penaltyArray:", penaltyArray);

      for (let i = 0; i < receiptFiles.length; i++) {
        const file = receiptFiles[i];
        const uniquePublicId = `${Date.now()}_${file.originalname.replace(/\.[^/.]+$/, "")}`;
        console.log(`Uploading file #${i + 1}: ${file.originalname} → ${uniquePublicId}`);
        console.log("Buffer exists?", !!file.buffer);

        try {
          const uploaded = await uploadToCloudinary(file.buffer, uniquePublicId);
          console.log("✅ Upload success:", uploaded.secure_url);

          paymentData[year].push({
            url: uploaded.secure_url,
            originalname: file.originalname,
            public_id: uploaded.public_id,
            format: uploaded.format,
            paid: parseFloat(paidArray[i]) || 0,
            waived: parseFloat(waivedArray[i]) || 0,
            penalty: parseFloat(penaltyArray[i]) || 0,
            uploadedAt: new Date(),
          });
        } catch (cloudErr) {
          console.error(`❌ Cloudinary upload failed for ${file.originalname}:`, cloudErr);
          throw cloudErr;
        }
      }
    }

    console.log("\n✅ Final paymentData to save:");
    console.log(JSON.stringify(paymentData, null, 2));

    const savedPayment = await Payment.findOneAndUpdate(
      { studentEmail },
      paymentData,
      { upsert: true, new: true }
    );

    console.log("✅ Payment data saved to MongoDB:", savedPayment._id);
    res.status(201).json({ message: "Payment data saved", data: savedPayment });

  } catch (err) {
    console.error("❌ Payment upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});




router.get('/:email', async (req, res) => {
  const { email } = req.params;
  try {
    const payment = await Payment.findOne({ studentEmail: email });
    if (!payment) return res.status(404).json({ message: "No payment found for this email." });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment data' });
  }
});




router.put("/update-receipt", upload.single("file"), async (req, res) => {
  try {
    const { studentEmail, year, index } = req.body;
    const file = req.file;

    if (!studentEmail || !year || index === undefined || !file) {
      return res.status(400).json({ error: "Missing required data" });
    }

    // Fetch the payment document
    const paymentDoc = await Payment.findOne({ studentEmail });
    if (!paymentDoc || !paymentDoc[year] || !paymentDoc[year][index]) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    const existingReceipt = paymentDoc[year][index];

    // Delete old receipt from Cloudinary (if exists)
    if (existingReceipt.public_id) {
      try {
        await cloudinary.uploader.destroy(existingReceipt.public_id);
      } catch (err) {
        console.warn("Failed to delete old file from Cloudinary:", err.message);
        // Not throwing error here so that update continues
      }
    }

    // Upload new file to Cloudinary
    const uniquePublicId = `${Date.now()}_${file.originalname.replace(/\.[^/.]+$/, "")}`;
    const uploaded = await uploadToCloudinary(file.buffer, uniquePublicId);

    // Update receipt info
    existingReceipt.url = uploaded.secure_url;
    existingReceipt.originalname = file.originalname;
    existingReceipt.public_id = uploaded.public_id;
    existingReceipt.format = uploaded.format;
    existingReceipt.uploadedAt = new Date();

    // Save the updated document
    await paymentDoc.save();

    res.json({
      message: "Receipt updated successfully",
      updatedReceipt: existingReceipt
    });
  } catch (err) {
    console.error("Error updating receipt:", err);
    res.status(500).json({ error: "Failed to update receipt" });
  }
});


router.delete("/delete-receipt", async (req, res) => {
  try {
    const { studentEmail, year, index } = req.body;

    if (!studentEmail || !year || index === undefined) {
      return res.status(400).json({ error: "Missing required data" });
    }

    const paymentDoc = await Payment.findOne({ studentEmail });
    if (!paymentDoc || !paymentDoc[year] || !paymentDoc[year][index]) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    const receiptToDelete = paymentDoc[year][index];

    // Delete from Cloudinary
    if (receiptToDelete.public_id) {
      try {
        await cloudinary.uploader.destroy(receiptToDelete.public_id);
      } catch (err) {
        console.warn("Cloudinary delete failed:", err.message);
      }
    }

    // Remove from array
    paymentDoc[year].splice(index, 1);
    await paymentDoc.save();

    res.json({ message: "Receipt deleted successfully" });
  } catch (err) {
    console.error("Error deleting receipt:", err);
    res.status(500).json({ error: "Server error while deleting" });
  }
});


module.exports = router;







