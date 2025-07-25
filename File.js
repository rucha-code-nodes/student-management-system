

const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  docName: String,
  cloudinaryUrl: String,
  cloudinaryId: String,
  mimetype: String,
  uploadDate: { type: Date, default: Date.now }
});

const fileSchema = new mongoose.Schema({
  studentEmail: { type: String, required: true },
  documents: [documentSchema],
  uploadDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('File', fileSchema);
