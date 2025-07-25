const mongoose = require('mongoose');

const placementSchema = new mongoose.Schema({
   studentEmail: { type: String, required: true },
  companyName: String,
  jobRole: String,
  placementDate: Date,
  status: String,
  package: String,
  offerLetter: {
    public_id: String,
    url: String,
    originalname: String
  },
  joiningLetter: {
    public_id: String,
    url: String,
    originalname: String
  }
});

module.exports = mongoose.model('Placement', placementSchema);


