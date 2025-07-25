const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');

// Signup route
router.post('/signup', async (req, res) => {
  const { username, email, prn, password } = req.body;

  if (!username || !email || !prn || !password) {
    return res.status(400).json({ message: 'Please fill all fields' });
  }

  try {
    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email: email.trim().toLowerCase(),
      prn,
      password: hashedPassword
    });

    await newUser.save();
    res.status(201).json({ message: 'Signup successful' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Admin hardcoded login
    if (email === 'patilmrunali631@gmail.com' && password === 'Mru123') {
      return res.json({ role: 'admin' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    res.json({ role: 'student', username: user.username });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

