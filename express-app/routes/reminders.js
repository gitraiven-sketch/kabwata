const express = require('express');
const router = express.Router();
const { reminders, getOverdueTenants } = require('../data');

router.get('/', (req, res) => {
  const overdueTenants = getOverdueTenants();
  res.render('reminders/index', { title: 'Reminders', reminders, overdueTenants });
});

module.exports = router;