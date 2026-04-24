const express = require('express');
const router = express.Router();
const { getTenantsWithDetails, getOverdueTenants, getPropertySummary } = require('../data');

router.get('/', (req, res) => {
  const tenants = getTenantsWithDetails();
  const overdueTenants = getOverdueTenants();
  const propertySummary = getPropertySummary();

  const totalTenants = tenants.length;
  const totalProperties = propertySummary.length;
  const occupiedProperties = propertySummary.filter(p => p.tenantCount > 0).length;
  const totalOverdue = overdueTenants.length;

  res.render('index', {
    title: 'Dashboard',
    totalTenants,
    totalProperties,
    occupiedProperties,
    totalOverdue,
    overdueTenants: overdueTenants.slice(0, 5), // Show first 5 overdue tenants
  });
});

module.exports = router;