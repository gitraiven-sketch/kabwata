const express = require('express');
const router = express.Router();
const { getTenantsWithDetails, getPropertySummary, getOverdueTenants } = require('../data');

router.get('/tenants', (req, res) => {
  const tenants = getTenantsWithDetails();
  res.json(tenants);
});

router.get('/properties', (req, res) => {
  const properties = getPropertySummary();
  res.json(properties);
});

router.get('/overdue', (req, res) => {
  const overdueTenants = getOverdueTenants();
  res.json(overdueTenants);
});

module.exports = router;