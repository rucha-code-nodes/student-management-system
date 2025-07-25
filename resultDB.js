
// const mongoose = require('mongoose');

// const fileMetadataSchema = new mongoose.Schema({
//   originalname: String,
//   url: String,
//   public_id: String,
//   format: String,
//   uploadDate: {
//     type: Date,
//     default: Date.now
//   }
// }, { _id: false });

// const resultSchema = new mongoose.Schema({
//   sgpa1: String,
//   sgpa2: String,
//   cgpa1: String,
//   sgpa3: String,
//   sgpa4: String,
//   cgpa2: String,
//   sgpa5: String,
//   sgpa6: String,
//   cgpa3: String,
//   sgpa7: String,
//   sgpa8: String,
//   cgpa4: String,
//   marksheets: {
//     marksheet1: fileMetadataSchema,
//     marksheet2: fileMetadataSchema,
//     marksheet3: fileMetadataSchema,
//     marksheet4: fileMetadataSchema,
//     marksheet5: fileMetadataSchema,
//     marksheet6: fileMetadataSchema,
//     marksheet7: fileMetadataSchema,
//     marksheet8: fileMetadataSchema
//   },
//   uploadedAt: {
//     type: Date,
//     default: Date.now
//   }
// });

// module.exports = mongoose.model("Result", resultSchema);



const mongoose = require('mongoose');

const fileMetadataSchema = new mongoose.Schema({
  originalname: String,
  url: String,
  public_id: String,
  format: String,
  uploadDate: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const resultSchema = new mongoose.Schema({
  studentEmail: { type: String, required: true, unique: true },
  sgpa1: String,
  sgpa2: String,
  cgpa1: String,
  sgpa3: String,
  sgpa4: String,
  cgpa2: String,
  sgpa5: String,
  sgpa6: String,
  cgpa3: String,
  sgpa7: String,
  sgpa8: String,
  cgpa4: String,
  marksheets: {
    marksheet1: fileMetadataSchema,
    marksheet2: fileMetadataSchema,
    marksheet3: fileMetadataSchema,
    marksheet4: fileMetadataSchema,
    marksheet5: fileMetadataSchema,
    marksheet6: fileMetadataSchema,
    marksheet7: fileMetadataSchema,
    marksheet8: fileMetadataSchema
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Result", resultSchema);
