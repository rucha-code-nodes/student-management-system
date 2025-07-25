
const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Scholarship = require('../models/scholarDB');

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});



const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'scholarship_forms',
    resource_type: 'raw',         // 🔁 change to 'raw' for PDFs
    allowed_formats: ['pdf'],
    access_mode: 'public'         // ✅ add this line
  }
});


const upload = multer({ storage });

// Route: POST /api/scholarship/upload
router.post('/upload', upload.single('scholarshipUpload'), async (req, res) => {
  try {

    const studentEmail = req.body.studentEmail;
//     if (!studentEmail) return res.status(400).json({ error: "Student email is required" });
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const newScholarship = new Scholarship({
      studentEmail: studentEmail,
      originalName: req.file.originalname,
      cloudinaryUrl: req.file.path,
      cloudinaryId: req.file.filename,
    });

    const saved = await newScholarship.save();
    console.log("✅ Scholarship form uploaded and saved:", saved);
    res.json({ message: 'Scholarship form uploaded successfully', data: saved });
  } catch (error) {
    console.error("❌ Error saving scholarship form:", error);
    res.status(500).json({ error: 'Failed to upload scholarship form' });
  }
});



// // GET /api/scholarship/:email
router.get('/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const data = await Scholarship.find({ studentEmail: email });
    console.log("📥 Scholarship forms found for", email, data);
    res.json(data);
  } catch (err) {
    console.error("❌ Error fetching scholarship data:", err);
    res.status(500).json({ error: 'Failed to fetch scholarship data' });
  }
});

// Route: PUT /api/scholarship/edit
router.put('/edit', upload.single('scholarshipUpload'), async (req, res) => {
  try {
    const formId = req.body.formId;

    if (!req.file || !formId) {
      return res.status(400).json({ error: 'File and Form ID are required' });
    }

    // Find the existing form entry
    const existingForm = await Scholarship.findById(formId);
    if (!existingForm) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Delete the old file from Cloudinary
    await cloudinary.uploader.destroy(existingForm.cloudinaryId);

    // Update fields with new file data
    existingForm.originalName = req.file.originalname;
    existingForm.cloudinaryUrl = req.file.path;
    existingForm.cloudinaryId = req.file.filename;
    existingForm.uploadedAt = new Date(); // optional, update timestamp

    // Save updated document
    const updated = await existingForm.save();
    console.log("✅ Scholarship form updated:", updated);
    res.json({ message: 'Scholarship form updated successfully', data: updated });

  } catch (error) {
    console.error("❌ Error updating scholarship form:", error);
    res.status(500).json({ error: 'Failed to update scholarship form' });
  }
});



// Route: DELETE /api/scholarship/delete/:id
router.delete('/delete/:id', async (req, res) => {
  try {
    const formId = req.params.id;

    const form = await Scholarship.findById(formId);
    if (!form) return res.status(404).json({ error: 'Form not found' });

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(form.cloudinaryId);

    // Delete from MongoDB
    await form.deleteOne();

    console.log("🗑️ Form deleted successfully:", formId);
    res.json({ message: 'Form deleted successfully' });
  } catch (err) {
    console.error("❌ Error deleting form:", err);
    res.status(500).json({ error: 'Failed to delete scholarship form' });
  }
});


module.exports = router;












