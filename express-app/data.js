const today = new Date();
const currentMonth = today.getMonth();
const currentYear = today.getFullYear();

const groups = [
  { name: 'Group A', count: 31 },
  { name: 'Group B', count: 38 },
  { name: 'Group C', count: 19 },
];

function generateProperties() {
  const allProperties = [];
  groups.forEach((group) => {
    for (let i = 1; i <= group.count; i += 1) {
      allProperties.push({
        id: `prop_${group.name.toLowerCase().replace(' ', '')}_${i}`,
        name: `${group.name} - Shop ${i}`,
        group: group.name,
        shopNumber: i,
        address: 'Kabwata Shopping Complex, Lusaka',
        paymentDay: 1,
      });
    }
  });
  return allProperties;
}

const properties = generateProperties();

const tenants = [
  { id: 'ten1', name: 'Besa Chibwe', phone: '+260977112233', propertyId: 'prop_groupa_1', paymentDay: 1, leaseStartDate: '2023-01-01', lastPaidDate: new Date(currentYear, currentMonth, 1).toISOString() },
  { id: 'ten2', name: 'Chisomo Phiri', phone: '+260966223344', propertyId: 'prop_groupa_2', paymentDay: 5, leaseStartDate: '2022-06-01', lastPaidDate: new Date(currentYear, currentMonth, 4).toISOString() },
  { id: 'ten3', name: 'Daliso Mumba', phone: '+260955334455', propertyId: 'prop_groupb_1', paymentDay: 1, leaseStartDate: '2023-11-01' },
  { id: 'ten4', name: 'Emeli Zande', phone: '+260777445566', propertyId: 'prop_groupb_2', paymentDay: 10, leaseStartDate: '2024-02-15', lastPaidDate: new Date(currentYear, currentMonth, 9).toISOString() },
  { id: 'ten5', name: 'Fungai Banda', phone: '+260765556677', propertyId: 'prop_groupc_1', paymentDay: 28, leaseStartDate: '2023-08-01' },
];

const reminders = [
  { id: 'rem1', title: 'Rent due for Group A tenants', type: 'Rent', dueDate: formatIso(new Date(currentYear, currentMonth, 1)), notes: 'Collect rent from tenants with payment day 1.' },
  { id: 'rem2', title: 'Maintenance check', type: 'Maintenance', dueDate: formatIso(new Date(currentYear, currentMonth, 6)), notes: 'Inspect all units in Group B.' },
  { id: 'rem3', title: 'Upcoming lease renewals', type: 'Lease', dueDate: formatIso(new Date(currentYear, currentMonth, 28)), notes: 'Follow up with tenants whose lease renews soon.' },
];

const payments = [
  { id: 'pay1', tenantId: 'ten1', amount: 2500, date: formatIso(new Date(currentYear, currentMonth, 1)) },
  { id: 'pay2', tenantId: 'ten2', amount: 3000, date: formatIso(new Date(currentYear, currentMonth, 4)) },
  { id: 'pay4', tenantId: 'ten4', amount: 5500, date: formatIso(new Date(currentYear, currentMonth, 9)) },
  { id: 'pay5', tenantId: 'ten1', amount: 2500, date: formatIso(new Date(currentYear, currentMonth - 1, 1)) },
  { id: 'pay6', tenantId: 'ten2', amount: 3000, date: formatIso(new Date(currentYear, currentMonth - 1, 5)) },
  { id: 'pay7', tenantId: 'ten3', amount: 1200, date: formatIso(new Date(currentYear, currentMonth - 1, 2)) },
  { id: 'pay8', tenantId: 'ten4', amount: 5500, date: formatIso(new Date(currentYear, currentMonth - 1, 10)) },
  { id: 'pay9', tenantId: 'ten5', amount: 4000, date: formatIso(new Date(currentYear, currentMonth - 1, 27)) },
];

function formatIso(date) {
  return date.toISOString();
}

function getPropertyById(id) {
  return properties.find((property) => property.id === id) || null;
}

function getPaymentStatus(tenant) {
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const leaseStart = tenant.leaseStartDate ? new Date(tenant.leaseStartDate) : new Date(0);
  leaseStart.setHours(0, 0, 0, 0);

  const lastPaid = tenant.lastPaidDate ? new Date(tenant.lastPaidDate) : new Date(0);
  lastPaid.setHours(0, 0, 0, 0);

  const paymentDay = tenant.paymentDay || 1;
  let cycleStartDate = new Date(todayDate.getFullYear(), todayDate.getMonth(), paymentDay);
  if (todayDate.getDate() < paymentDay) {
    cycleStartDate.setMonth(cycleStartDate.getMonth() - 1);
  }

  const currentDueDate = cycleStartDate;

  if (leaseStart > currentDueDate) {
    let firstDueDate = new Date(leaseStart.getFullYear(), leaseStart.getMonth(), paymentDay);
    if (leaseStart.getDate() > paymentDay) {
      firstDueDate.setMonth(firstDueDate.getMonth() + 1);
    }
    return { status: 'Upcoming', dueDate: firstDueDate };
  }

  if (lastPaid >= currentDueDate) {
    const nextDueDate = new Date(currentDueDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    return { status: 'Paid', dueDate: nextDueDate };
  }

  if (todayDate > currentDueDate) {
    return { status: 'Overdue', dueDate: currentDueDate };
  }
  return { status: 'Upcoming', dueDate: currentDueDate };
}

function getTenantsWithDetails() {
  return tenants.map((tenant) => {
    const property = getPropertyById(tenant.propertyId);
    const { status, dueDate } = getPaymentStatus(tenant);
    return {
      ...tenant,
      property: property || { id: tenant.propertyId, name: 'Unknown Property', group: 'Unknown', shopNumber: 0, address: '', paymentDay: tenant.paymentDay },
      paymentStatus: status,
      dueDate,
    };
  });
}

function getTenantById(id) {
  return getTenantsWithDetails().find((tenant) => tenant.id === id) || null;
}

function getPaymentsForTenant(tenantId) {
  return payments.filter((payment) => payment.tenantId === tenantId).sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getOverdueTenants() {
  return getTenantsWithDetails().filter((tenant) => tenant.paymentStatus === 'Overdue');
}

function getPropertySummary() {
  return properties.map((property) => {
    const tenantsForProperty = tenants.filter((tenant) => tenant.propertyId === property.id);
    return { ...property, tenantCount: tenantsForProperty.length };
  });
}

module.exports = {
  properties,
  tenants,
  reminders,
  payments,
  getPropertyById,
  getPaymentStatus,
  getTenantsWithDetails,
  getTenantById,
  getPaymentsForTenant,
  getOverdueTenants,
  getPropertySummary,
};