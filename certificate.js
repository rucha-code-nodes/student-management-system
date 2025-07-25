


const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const Certificate = require('../models/Certificate');
const path = require('path');
// ✅ Cloudinary Setup
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});



const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'certificates',
    resource_type: 'raw', // 👈 Important change
    access_mode: 'public', // ✅ make file publicly viewable in browser
     allowed_formats: ['pdf'],
    public_id: (req, file) => {
      const name = req.body.name || 'unknown';
      const safeName = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      return `${Date.now()}_${safeName}`;
    }
  }
});


const upload = multer({ storage });

// ✅ Upload Route
router.post('/upload', upload.single('certificate'), async (req, res) => {
  try {
      const { studentEmail, name } = req.body;
   if (!studentEmail || !req.file || !req.file.path) {
      return res.status(400).json({ message: 'Missing required fields or file' });
    }

    const certificate = new Certificate({
      studentEmail,
      name,
      fileName: req.file.originalname,
      filePath: req.file.path ,// Cloudinary URL
       name: name
    });

    await certificate.save();

    res.status(200).json({
      message: 'Certificate uploaded to Cloudinary successfully!',
      certificate
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed due to server error', error });
  }
});



// ADD 
// Edit Certificate Route
router.put('/edit', upload.single('certificate'), async (req, res) => {
  try {
  const { certificateId, newName } = req.body;

    if (!certificateId || !req.file || !req.file.path) {
      return res.status(400).json({ message: 'Missing required fields or file' });
    }

    const certificate = await Certificate.findById(certificateId);
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

     // ✅ Update name if provided
    if (newName) {
      certificate.name = newName;
    }
    // Update certificate details
    // certificate.fileName = req.file.originalname;
    // certificate.filePath = req.file.path;
    // certificate.uploadedAt = new Date();
    if (req.file && req.file.path) {
      certificate.fileName = req.file.originalname;
      certificate.filePath = req.file.path;
      certificate.uploadedAt = new Date();
    }

    await certificate.save();

    res.status(200).json({
      message: 'Certificate updated successfully!',
      certificate
    });
  } catch (error) {
    console.error('Edit error:', error);
    res.status(500).json({ message: 'Edit failed due to server error', error });
  }
});




// GET route to fetch certificates by studentId
router.get('/student/:studentEmail', async (req, res) => {
  try {
    const { studentEmail } = req.params;

    const certificates = await Certificate.find({ studentEmail });

    res.status(200).json({ certificates });
  } catch (error) {
    console.error('Fetch certificates error:', error);~
    res.status(500).json({ message: 'Failed to fetch certificates', error });
  }
});






router.delete('/:id', async (req, res) => {
  const certId = req.params.id;

  if (!certId || certId === 'null' || !mongoose.Types.ObjectId.isValid(certId)) {
    return res.status(400).json({ message: 'Invalid or missing certificate ID.' });
  }

  try {
    const certificate = await Certificate.findById(certId);
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    const filePath = certificate.filePath;
    const fileNameWithExt = path.basename(filePath);
    const fileName = path.parse(fileNameWithExt).name;
    const publicId = `certificates/${fileName}`;

    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    await Certificate.findByIdAndDelete(certId);

    res.status(200).json({ message: 'Certificate and file deleted successfully' });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Failed to delete certificate', error });
  }
});


module.exports = router;
