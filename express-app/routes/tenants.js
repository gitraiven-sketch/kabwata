const express = require('express');
const router = express.Router();
const { getTenantsWithDetails, getTenantById, getPaymentsForTenant } = require('../data');

router.get('/', (req, res) => {
  const tenants = getTenantsWithDetails();
  res.render('tenants/index', { title: 'Tenants', tenants });
});

router.get('/:id', (req, res) => {
  const tenant = getTenantById(req.params.id);
  if (!tenant) {
    return res.status(404).render('404', { url: req.originalUrl });
  }
  const payments = getPaymentsForTenant(req.params.id);
  res.render('tenants/show', { title: `Tenant: ${tenant.name}`, tenant, payments });
});

module.exports = router;