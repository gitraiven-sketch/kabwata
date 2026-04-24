const express = require('express');
const router = express.Router();
const { properties, getPropertyById, getTenantsWithDetails } = require('../data');

router.get('/', (req, res) => {
  const propertySummary = properties.map((property) => {
    const tenants = getTenantsWithDetails().filter((tenant) => tenant.propertyId === property.id);
    return { ...property, tenantCount: tenants.length, tenants };
  });
  res.render('properties/index', { title: 'Properties', properties: propertySummary });
});

router.get('/:id', (req, res) => {
  const property = getPropertyById(req.params.id);
  if (!property) {
    return res.status(404).render('404', { url: req.originalUrl });
  }
  const tenants = getTenantsWithDetails().filter((tenant) => tenant.propertyId === property.id);
  res.render('properties/show', { title: `Property: ${property.name}`, property, tenants });
});

module.exports = router;