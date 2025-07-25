const mongoose = require("mongoose");

const receiptSchema = new mongoose.Schema({
  url: String,
  originalname: String,
  public_id: String,
  format: String,
  paid: Number,
  waived: Number,
  penalty: Number,
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

const paymentSchema = new mongoose.Schema({
  studentEmail: { type: String, required: true }, // ✅ ADDED      
  year1: [receiptSchema],
  year2: [receiptSchema],
  year3: [receiptSchema],
  year4: [receiptSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Payment", paymentSchema);


