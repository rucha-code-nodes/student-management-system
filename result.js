


const express = require("express");
const router = express.Router();
const multer = require("multer");
const Result = require("../models/resultDB");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

require("dotenv").config();

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
   timeout: 120000
});

// Multer setup (memory storage for Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });



function uploadToCloudinary(buffer, filename) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "results",
        public_id: filename,
        resource_type: "raw",       // 📝 best for PDFs
        type: "upload",             // 📝 ensure correct upload type
        access_mode: "public",       // ✅ make file publicly accessible
         allowed_formats: ['pdf']
      },
      (error, result) => {
        if (result) {
          // console.log("✅ Uploaded URL:", result.secure_url);
          resolve(result);}
        else reject(error);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}


// Upload route
// ✅ FINAL /upload ROUTE
router.post("/upload", upload.any(), async (req, res) => {
  try {
    const {
      sgpa1, sgpa2, cgpa1,
      sgpa3, sgpa4, cgpa2,
      sgpa5, sgpa6, cgpa3,
      sgpa7, sgpa8, cgpa4,
      studentEmail
    } = req.body;

    console.log("📌 Student Email:", studentEmail);
    if (!studentEmail) {
      return res.status(400).json({ error: "Student email is required" });
    }

    const marksheets = {};
    const files = req.files || [];



for (const file of files) {
  // ✅ Step 1: Sanitize filename with timestamp
  const rawName = file.originalname.replace(/\.[^/.]+$/, ""); // remove extension
  const timestamp = Date.now();
  const safeFilename = `${rawName.replace(/\s+/g, '_').replace(/[()]/g, '')}_${timestamp}`;

  // ✅ Step 2: Debug logs
  console.log("📄 Uploading:", file.originalname, "| Safe name:", safeFilename, "| Size:", file.buffer?.length, "bytes");

  // ✅ Step 3: Upload to Cloudinary with safe name
  const uploadResult = await uploadToCloudinary(file.buffer, safeFilename);

  // ✅ Step 4: Store metadata
  marksheets[file.fieldname] = {
    originalname: file.originalname,
    url: uploadResult.secure_url,
    public_id: uploadResult.public_id,
    format: uploadResult.format,
    uploadDate: new Date()
  };
}


    // Combine all data
    const resultData = {
      studentEmail,
      sgpa1, sgpa2, cgpa1,
      sgpa3, sgpa4, cgpa2,
      sgpa5, sgpa6, cgpa3,
      sgpa7, sgpa8, cgpa4,
      marksheets
    };

    // Save or update in DB
    const savedResult = await Result.findOneAndUpdate(
      { studentEmail },
      resultData,
      { upsert: true, new: true }
    );

    res.status(200).json({ message: "Result uploaded successfully", result: savedResult });

  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Failed to save result data" });
  }
});
``
router.get("/:email", async (req, res) => {
  try {
    const result = await Result.findOne({ studentEmail: req.params.email });
    if (!result) {
      return res.status(404).json({ error: "No result found for this email" });
    }
    res.status(200).json(result);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: "Failed to fetch result data" });
  }
});


router.delete("/clearSection/:email/:year", async (req, res) => {
  const { email, year } = req.params;

  // Mapping year to DB keys
  const fieldMap = {
    "1st Year": { sgpa1: "sgpa1", sgpa2: "sgpa2", cgpa: "cgpa1", m1: "marksheet1", m2: "marksheet2" },
    "2nd Year": { sgpa1: "sgpa3", sgpa2: "sgpa4", cgpa: "cgpa2", m1: "marksheet3", m2: "marksheet4" },
    "3rd Year": { sgpa1: "sgpa5", sgpa2: "sgpa6", cgpa: "cgpa3", m1: "marksheet5", m2: "marksheet6" },
    "4th Year": { sgpa1: "sgpa7", sgpa2: "sgpa8", cgpa: "cgpa4", m1: "marksheet7", m2: "marksheet8" }
  };

  const keys = fieldMap[year];
  if (!keys) return res.status(400).json({ error: "Invalid year" });

  try {
    const result = await Result.findOne({ studentEmail: email });
    if (!result) return res.status(404).json({ error: "Student result not found" });

    // 🧹 Clear SGPA & CGPA fields
    result[keys.sgpa1] = undefined;
    result[keys.sgpa2] = undefined;
    result[keys.cgpa] = undefined;

    // 🧹 Delete marksheet files from Cloudinary
    for (let key of [keys.m1, keys.m2]) {
      const file = result.marksheets?.[key];
      if (file?.public_id) {
        await cloudinary.uploader.destroy(file.public_id);
        result.marksheets[key] = undefined;
      }
    }

    await result.save();
    console.log(`🧹 Cleared full ${year} data for ${email}`);
    res.json({ message: `${year} academic data deleted successfully.` });
  } catch (err) {
    console.error("❌ Error clearing section:", err);
    res.status(500).json({ error: "Failed to clear section" });
  }
});


module.exports = router;
