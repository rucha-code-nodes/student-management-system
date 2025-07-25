const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  studentEmail: {
    type: String,
    required: true
  },
   name: String,
  fileName: String,
  filePath: String,
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Certificate', certificateSchema);

