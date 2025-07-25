
const express = require('express');
const router = express.Router();
const multer = require('multer');
const Internship = require('../models/internshipDB');
const cloudinary = require('cloudinary').v2;

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});

// Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload', upload.any(), async (req, res) => {
  try {
    const body = req.body;
    const files = req.files;

    console.log("➡️ Received body:", body);
    console.log("➡️ Received files keys:", files.map(f => f.fieldname));

    const getArray = (field) => {
      const val = body[field];
      return val !== undefined ? (Array.isArray(val) ? val : [val]) : [];
    };

    const companyNames = getArray('companyName');
const jobRoles = getArray('jobRole');
const internshipDates = getArray('internshipDate');
const statuses = getArray('status');
const durations = getArray('duration');


    console.log("🔢 Entry count:", companyNames.length);

    const groupFiles = (field) => {
      return files.filter(f => f.fieldname === field);
    };

    const offerFiles = groupFiles('offerLetter[]');
    const certFiles = groupFiles('certificate[]');
    const joinFiles = groupFiles('joiningLetter[]');

    console.log("📁 Offer files count:", offerFiles.length);
    console.log("📁 Cert files count:", certFiles.length);
    console.log("📁 Join files count:", joinFiles.length);

    const uploadToCloudinary = (file) => {
      return new Promise((resolve, reject) => {
        if (!file) return resolve(null);
        cloudinary.uploader.upload_stream(
          // { resource_type: 'auto', folder: 'internships' },
{
    folder: 'internships',
    resource_type: 'raw',       // ✅ ensures proper handling of PDFs
    access_mode: 'public',       // ✅ makes the file viewable publicly
     allowed_formats: ['pdf']
  },
          (err, result) => {
            if (err) {
              console.error('❌ Cloudinary upload failed:', err.message);
              return reject(err);
            }
            resolve({ public_id: result.public_id, url: result.secure_url,  original_name: file.originalname  });
          }
        ).end(file.buffer);
      });
    };

    const internships = [];

    for (let i = 0; i < companyNames.length; i++) {
      const offer = offerFiles[i] ? await uploadToCloudinary(offerFiles[i]) : null;
      const cert = certFiles[i] ? await uploadToCloudinary(certFiles[i]) : null;
      const join = joinFiles[i] ? await uploadToCloudinary(joinFiles[i]) : null;

      const studentEmail = body.studentEmail; // Add this
      const entry = {
  studentEmail,  // NEW FIELD
  companyName: companyNames[i],
  jobRole: jobRoles[i],
  internshipDate: internshipDates[i] || null,
  status: statuses[i],
  duration: durations[i],
  offerLetter: offer,
  certificate: cert,
  joiningLetter: join
};

      console.log(`✅ Entry ${i + 1} built:`, entry);

      internships.push(entry);
    }

    if (internships.length === 0) {
      console.warn("⚠️ No internship data to insert.");
      return res.status(400).json({ message: "No internship data to insert." });
    }

    await Internship.insertMany(internships);
    console.log("✅ Internship data inserted into DB.");
    res.status(200).json({ message: 'Internship data saved successfully!' });

  } catch (error) {
    console.error('❌ Error saving internship data:', error);
    res.status(500).json({ message: 'An error occurred while saving internship data.', error: error.message });
  }
});


router.put('/update', upload.any(), async (req, res) => {
  try {
    const { id, studentEmail } = req.body;
    if (!id) return res.status(400).json({ message: "Missing internship ID" });

    const internship = await Internship.findById(id);
    if (!internship) return res.status(404).json({ message: "Internship entry not found" });

    const files = req.files;

    const uploadToCloudinary = (file) => {
      return new Promise((resolve, reject) => {
        if (!file) return resolve(null);
        cloudinary.uploader.upload_stream(
          //{ resource_type: 'auto', folder: 'internships' },
          {
    folder: 'internships',
    resource_type: 'raw',       // ✅ ensures proper handling of PDFs
    access_mode: 'public',       // ✅ makes the file viewable publicly
     allowed_formats: ['pdf']
  },
          (err, result) => {
            if (err) {
              console.error('❌ Cloudinary upload failed:', err.message);
              return reject(err);
            }
            resolve({
              public_id: result.public_id,
              url: result.secure_url,
              original_name: file.originalname
            });
          }
        ).end(file.buffer);
      });
    };

    // Update text fields
    const fieldsToUpdate = ['companyName', 'jobRole', 'internshipDate', 'status', 'duration'];
    fieldsToUpdate.forEach(field => {
      if (req.body[field]) {
        internship[field] = req.body[field];
      }
    });

    // Optional: re-assign email if provided
    if (studentEmail) internship.studentEmail = studentEmail;

    // Update files if new ones are uploaded
    const fileMap = {
      offerLetter: 'offerLetter',
      certificate: 'certificate',
      joiningLetter: 'joiningLetter'
    };

    for (let f of files) {
      const cloudResult = await uploadToCloudinary(f);
      if (fileMap[f.fieldname]) {
        internship[fileMap[f.fieldname]] = cloudResult;
      }
    }

    await internship.save();
    console.log(`✅ Internship with ID ${id} updated.`);
    res.status(200).json({ message: 'Internship updated successfully.' });

  } catch (error) {
    console.error("❌ Error updating internship:", error);
    res.status(500).json({ message: "An error occurred while updating internship.", error: error.message });
  }
});







router.get('/:email', async (req, res) => {
  try {
    const internships = await Internship.find({ studentEmail: req.params.email });
    res.status(200).json(internships);
  } catch (err) {
    console.error("Error fetching internship data:", err);
    res.status(500).json({ message: 'Failed to fetch internship data' });
  }
});


router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const internship = await Internship.findById(id);

    if (!internship) return res.status(404).json({ message: 'Internship not found' });

    // Delete Cloudinary files if present
    const deleteFromCloudinary = async (file) => {
      if (file?.public_id) {
        try {
          await cloudinary.uploader.destroy(file.public_id);
        } catch (err) {
          console.warn(`⚠️ Could not delete ${file.original_name} from Cloudinary:`, err.message);
        }
      }
    };

    await deleteFromCloudinary(internship.offerLetter);
    await deleteFromCloudinary(internship.certificate);
    await deleteFromCloudinary(internship.joiningLetter);

    await Internship.findByIdAndDelete(id);

    console.log(`🗑️ Internship with ID ${id} deleted.`);
    res.status(200).json({ message: "Internship deleted successfully." });
  } catch (err) {
    console.error("❌ Error deleting internship:", err);
    res.status(500).json({ message: "An error occurred during deletion." });
  }
});




module.exports = router;


