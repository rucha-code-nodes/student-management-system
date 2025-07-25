   

const mongoose = require('mongoose');

const scholarshipSchema = new mongoose.Schema({
  studentEmail: { type: String, required: true },
  originalName: String,
  cloudinaryUrl: String,
  cloudinaryId: String,
  uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Scholarship', scholarshipSchema);



