


const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/student');
const certificateRoutes = require('./routes/certificate');
const File = require('./models/File');
const docsRoute = require('./routes/docs');
const paymentRoutes = require("./routes/payment");
const internshipRoute = require('./routes/internship');
const placementRoute = require('./routes/placement');
const scholarshipRoute = require('./routes/scholarship');
const path = require('path');
const multer = require('multer');
require('dotenv').config();
const deleteRoute = require("./routes/delete");

const app = express();

// Middleware
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// Middleware with body size limit for large uploads (e.g., base64 images)
app.use(cors());
app.use(express.json({ limit: '5mb' })); // You can increase this if needed
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

app.use('/uploads', express.static('uploads'));


// Serve frontend files
app.use(express.static(path.join(__dirname, '../HTML_CSS_System')));
app.use(express.static('public'));
// Routes
app.use('/api/auth', authRoutes);
app.use("/api/delete", deleteRoute);
app.use('/api/student', studentRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/documents', docsRoute);
app.use("/api/result", require("./routes/result"));
app.use('/api/payment', paymentRoutes);
app.use('/api/internship', internshipRoute);
app.use('/api/placement', placementRoute);
app.use('/api/scholarship', scholarshipRoute);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ MongoDB connected');
  app.listen(3000, () => {
    console.log('🚀 Server running at http://localhost:3000');
  });
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('error', err => {
  console.log("❌ MongoDB error:", err);
});

mongoose.connection.on('connected', () => {
  console.log("✅ Mongoose is connected to:", process.env.MONGO_URI);
});


