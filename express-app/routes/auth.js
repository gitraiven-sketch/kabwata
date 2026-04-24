const express = require('express');
const router = express.Router();

// GET /login
router.get('/login', (req, res) => {
  res.render('login');
});

// GET /signup
router.get('/signup', (req, res) => {
  res.render('signup');
});

// GET /forgot-password
router.get('/forgot-password', (req, res) => {
  res.render('forgot-password');
});

// POST /login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  // For now, just redirect to dashboard
  // In a real app, you'd validate credentials
  res.redirect('/');
});

// POST /signup
router.post('/signup', (req, res) => {
  const { email, password, confirmPassword } = req.body;
  // For now, just redirect to login
  // In a real app, you'd create the user account
  res.redirect('/login');
});

// POST /forgot-password
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  // For now, just redirect to login
  // In a real app, you'd send a password reset email
  res.redirect('/login');
});

module.exports = router;