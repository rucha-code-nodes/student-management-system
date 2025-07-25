


const mongoose = require('mongoose');

const internshipSchema = new mongoose.Schema({
  studentEmail: {
    type: String,
    required: true
  },
  companyName: String,
  jobRole: String,
  internshipDate: Date,
  status: String,
  duration: String,
  offerLetter: {
    public_id: String,
    url: String,
     original_name: String
  },
  certificate: {
    public_id: String,
    url: String,
     original_name: String
  },
  joiningLetter: {
    public_id: String,
    url: String,
     original_name: String
  }
});

module.exports = mongoose.model('Internship', internshipSchema);
