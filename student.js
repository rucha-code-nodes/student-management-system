

const express = require('express');
const router = express.Router();
const Student = require('../models/student');
const cloudinary = require("cloudinary").v2; // ✅ Ensure this is at the top
const streamifier = require("streamifier");
const multer = require('multer');


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
      { folder: "results", public_id: filename, resource_type: "auto" },
      (error, result) => {
        if (result) resolve(result); // return full result object
        else reject(error);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}



router.post('/save', upload.single("profileImage"), async (req, res) => {
  try {
    let cloudinaryResult = {};
    if (req.file) {
      // Upload the image to Cloudinary
      const filename = req.body.email.split("@")[0] + "_profile";
      cloudinaryResult = await uploadToCloudinary(req.file.buffer, filename);
    }

    const updateData = {
      ...req.body,
      profileImage: cloudinaryResult.secure_url || req.body.profileImage,
      profileImagePublicId: cloudinaryResult.public_id || req.body.profileImagePublicId,
    };

    const existing = await Student.findOneAndUpdate(
      { email: req.body.email },
      updateData,
      { upsert: true, new: true }
    );

    res.status(201).json({ message: 'Saved successfully', student: existing });

  } catch (err) {
    res.status(500).json({ message: 'Error saving student', error: err.message });
  }
});






// Get student info by PRN (or ID)
router.get('/:prn', async (req, res) => {
try {
const student = await Student.findOne({ prn: req.params.prn });
if (!student) return res.status(404).json({ message: 'Not found' });
res.json(student);
} catch (err) {
res.status(500).json({ message: 'Error retrieving student', error: err.message });
}
});

// POST academic info
router.post('/submit-academic-info', async (req, res) => {
  try {
    const student = new Student(req.body);
    await student.save();
    res.status(201).json({ message: 'Academic information saved to database.' });
  } catch (error) {
    res.status(400).json({ error: 'Error saving academic information', details: error.message });
  }
});

// Get student info by email
router.get('/email/:email', async (req, res) => {
  try {
    const student = await Student.findOne({ email: req.params.email });
    if (!student) return res.status(404).json({ message: 'Not found' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving student', error: err.message });
  }
});

//DELETETE ROUET 
router.delete('/delete/:email', async (req, res) => {
  try {
    const student = await Student.findOneAndDelete({ email: req.params.email });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // ✅ Delete image from Cloudinary using stored public_id
    if (student.profileImagePublicId) {
      await cloudinary.uploader.destroy(student.profileImagePublicId);
    }

    res.status(200).json({ message: 'Student deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting student', error: err.message });
  }
});

// ✅ GET students by admission year (e.g., 2022)
router.get('/byYear/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const students = await Student.find({ admissionYear: year });
    res.status(200).json(students);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving students by year', error: err.message });
  }
});

// ✅ GET full student profile by email
router.get('/profile/email/:email', async (req, res) => {
  try {
    const student = await Student.findOne({ email: req.params.email });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.status(200).json(student);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving student profile', error: err.message });
  }
});


module.exports = router;






