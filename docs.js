

const express = require("express");
const router = express.Router();
const multer = require("multer");
const File = require("../models/File");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Cloudinary config (your existing config)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "uploaded_documents",
    allowed_formats: ["pdf"],
    resource_type: "raw",         // ✅ best for PDFs (or use "auto")
    access_mode: "public",        // ✅ makes file viewable publicly
    
  },
});
const upload = multer({ storage });

// POST upload multiple documents (your original route)
router.post('/upload', upload.array('documents', 20), async (req, res) => {
  try {
    const files = req.files;
    const studentEmail = req.body.studentEmail;

    if (!studentEmail) {
      return res.status(400).json({ message: 'Student email is required' });
    }
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    
    
    const documents = files.map(file => {
  const cleanDocName = file.originalname
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');

  return {
    docName: cleanDocName,
    originalName: file.originalname,
    cloudinaryUrl: file.path,
    cloudinaryId: file.filename,
    mimetype: file.mimetype,
    uploadDate: new Date()
  };
});


    let existingFile = await File.findOne({ studentEmail });

    if (existingFile) {
      existingFile.documents.push(...documents);
      await existingFile.save();
      res.json({ message: 'Files appended and saved', data: existingFile });
    } else {
      const newFile = new File({ studentEmail, documents });
      await newFile.save();
      res.json({ message: 'Files uploaded and saved', data: newFile });
    }
  } catch (error) {
    console.error('Upload error:', JSON.stringify(error, null, 2));
    res.status(500).json({ message: 'Error uploading files', error: error.message || error });
  }
});

// GET documents by email (your original route)
router.get('/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const files = await File.find({ studentEmail: email });
    res.json(files);
  } catch (error) {
    res.status(500).json({ message: "Error fetching documents", error });
  }
});

// PUT edit a single document (new route you want to add)
router.put("/edit", upload.single("document"), async (req, res) => {
  try {
    const { studentEmail, docId } = req.body;
    if (!studentEmail || !docId || !req.file || !req.file.path) {
      return res.status(400).json({ message: "Missing required fields or file" });
    }

    const fileDoc = await File.findOne({ studentEmail });
    if (!fileDoc) {
      return res.status(404).json({ message: "Documents not found for student" });
    }

    const docIndex = fileDoc.documents.findIndex((d) => d._id.toString() === docId);
    if (docIndex === -1) {
      return res.status(404).json({ message: "Document to update not found" });
    }

    // Optionally delete old file from Cloudinary here

    fileDoc.documents[docIndex].docName = req.file.originalname;
    fileDoc.documents[docIndex].originalName = req.file.originalname;
    fileDoc.documents[docIndex].cloudinaryUrl = req.file.path;
    fileDoc.documents[docIndex].cloudinaryId = req.file.filename;
    fileDoc.documents[docIndex].mimetype = req.file.mimetype;
    fileDoc.documents[docIndex].uploadDate = new Date();

    await fileDoc.save();

    res.json({ message: "Document updated successfully", data: fileDoc.documents[docIndex] });
  } catch (error) {
    console.error("Edit error:", error);
    res.status(500).json({ message: "Error updating document", error: error.message || error });
  }
});

// DELETE route to delete a specific document
router.delete("/delete", async (req, res) => {
  try {
    const { studentEmail, docId } = req.body;
    if (!studentEmail || !docId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const fileDoc = await File.findOne({ studentEmail });
    if (!fileDoc) {
      return res.status(404).json({ message: "Documents not found for student" });
    }

    const docIndex = fileDoc.documents.findIndex((d) => d._id.toString() === docId);
    if (docIndex === -1) {
      return res.status(404).json({ message: "Document to delete not found" });
    }

    const cloudinaryId = fileDoc.documents[docIndex].cloudinaryId;

    // Delete from Cloudinary
   // await cloudinary.uploader.destroy(`uploaded_documents/${cloudinaryId}`);
   await cloudinary.uploader.destroy(cloudinaryId);


    // Remove document from MongoDB
    fileDoc.documents.splice(docIndex, 1);
    await fileDoc.save();

    res.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: "Error deleting document", error: error.message || error });
  }
});


module.exports = router;
