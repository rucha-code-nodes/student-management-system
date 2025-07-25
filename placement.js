const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const Placement = require('../models/placementDB');
const path = require('path');
const streamifier = require('streamifier');


// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});


async function uploadFromBuffer(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (result) resolve(result);
      else reject(error);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });
}



// Multer setup (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload placement details
router.post('/upload', upload.any(), async (req, res) => {
  try {
    const body = req.body;
    const files = req.files;

    console.log("📥 Incoming placement upload request...");
    console.log("Body:", body);
    console.log("Files received:", files.map(f => ({ fieldname: f.fieldname, originalname: f.originalname })));

    const getArray = (field) => {
      const val = body[field];
      return val !== undefined ? (Array.isArray(val) ? val : [val]) : [];
    };

    const studentEmail = body.studentEmail;
    const companyNames = getArray('companyName');
    const jobRoles = getArray('jobRole');
    const placementDates = getArray('placementDate');
    const statuses = getArray('status');
    const packages = getArray('package');

    const count = companyNames.length;
    console.log(`🧾 Total placement entries: ${count}`);

    const offerFiles = files.filter(f => f.fieldname === 'offerLetter');
    const joinFiles = files.filter(f => f.fieldname === 'joiningLetter');

    const uploadToCloudinary = (file, label) => {
      return new Promise((resolve, reject) => {
        if (!file) {
          console.log(`⚠️ No ${label} file provided.`);
          return resolve(null);
        }

        const ext = path.extname(file.originalname).toLowerCase();
        const resourceType = ['.pdf', '.docx', '.xlsx'].includes(ext) ? 'raw' : 'auto';

        cloudinary.uploader.upload_stream(
          //{ resource_type: resourceType, folder: 'placements' },  // ✅ FIXED LINE

          {
    resource_type: resourceType,
    folder: 'placements',
    access_mode: "public",  // ✅ Add this line
     allowed_formats: ['pdf'],
  },

          (err, result) => {
            if (err) {
              console.error(`❌ Cloudinary ${label} upload error:`, err);
              return reject(err);
            }

            console.log(`✅ ${label} uploaded:`, result.secure_url);
            resolve({
              public_id: result.public_id,
              url: result.secure_url,
              originalname: file.originalname
            });
          }
        ).end(file.buffer);
      });
    };

    const placements = [];

    for (let i = 0; i < count; i++) {
      console.log(`📦 Processing entry ${i + 1}...`);

      const offer = await uploadToCloudinary(offerFiles[i], `offerLetter[${i}]`);
      const join = await uploadToCloudinary(joinFiles[i], `joiningLetter[${i}]`);

      const entry = {
        studentEmail,
        companyName: companyNames[i],
        jobRole: jobRoles[i],
        placementDate: placementDates[i] || null,
        status: statuses[i],
        package: packages[i],
        offerLetter: offer,
        joiningLetter: join
      };

      console.log(`✅ Prepared placement entry ${i + 1}:`, entry);
      placements.push(entry);
    }

    if (placements.length === 0) {
      console.log("🚫 No placement data to save.");
      return res.status(400).json({ message: 'No placement data to save.' });
    }

    const result = await Placement.insertMany(placements);
    console.log("📁 Successfully saved to MongoDB:", result);
    res.status(200).json({ message: 'Placement data saved successfully!', data: result });

  } catch (error) {
    console.error('❌ Placement saving error:', error);
    res.status(500).json({
      message: 'Error saving placement data.',
      error: error.message,
      fullError: error.stack
    });
  }
});





router.post('/update', upload.fields([
  { name: 'offerLetter', maxCount: 1 },
  { name: 'joiningLetter', maxCount: 1 }
]), async (req, res) => {
  try {
    const { placementId, companyName, jobRole, placementDate, status, package } = req.body;

    if (!placementId) {
      console.warn("❌ placementId missing in update request!");
      return res.status(400).json({ error: "Missing placementId in request." });
    }

    const update = {
      companyName,
      jobRole,
      placementDate,
      status,
      package
    };

    console.log("🧾 Received files:", req.files);

  
    if (req.files['offerLetter']) {
  const offerUpload = await uploadFromBuffer(req.files['offerLetter'][0].buffer, 'placement_docs');
 
  update.offerLetter = {
  url: offerUpload.secure_url,
  originalname: req.files['offerLetter'][0].originalname  // lowercase 'n'
};

}

if (req.files['joiningLetter']) {
  const joiningUpload = await uploadFromBuffer(req.files['joiningLetter'][0].buffer, 'placement_docs');
  
  
  update.joiningLetter = {
  url: joiningUpload.secure_url,
  originalname: req.files['joiningLetter'][0].originalname  // lowercase 'n'
};


}


    // ✅ Save and return updated doc
    const updatedPlacement = await Placement.findByIdAndUpdate(placementId, update, { new: true });
    res.json(updatedPlacement);

  } catch (err) {
    console.error("Error updating placement:", err);
    res.status(500).json({ error: "Failed to update placement" });
  }
});

// Fetch placement data by student email
router.get('/:email', async (req, res) => {
  try {
    const placements = await Placement.find({ studentEmail: req.params.email });
    res.json(placements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



router.delete('/delete', async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ message: 'Missing ID' });

    const placement = await Placement.findById(id);
    if (!placement) return res.status(404).json({ message: 'Placement not found' });

    const deleteCloudinaryFile = async (file) => {
      if (file?.public_id) {
        try {
          await cloudinary.uploader.destroy(file.public_id, { resource_type: 'raw' });
        } catch (err) {
          console.error("⚠️ Cloudinary delete error:", err.message);
        }
      }
    };

    await deleteCloudinaryFile(placement.offerLetter);
    await deleteCloudinaryFile(placement.joiningLetter);

    await Placement.findByIdAndDelete(id);

    res.status(200).json({ message: "Placement deleted successfully" });
  } catch (err) {
    console.error("❌ Delete API error:", err);
    res.status(500).json({ message: "Error deleting placement", error: err.message });
  }
});


module.exports = router;
