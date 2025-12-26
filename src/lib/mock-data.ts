import type { Tenant, Property, Payment } from './types';

const generateProperties = (): Property[] => {
  const groups = [
    { name: 'Group A', count: 31 },
    { name: 'Group B', count: 38 },
    { name: 'Group C', count: 19 },
  ];

  const allProperties: Property[] = [];
  
  groups.forEach(group => {
    for (let i = 1; i <= group.count; i++) {
      const propertyName = `${group.name} - Shop ${i}`;
      allProperties.push({
        id: `prop_${group.name.toLowerCase().replace(' ', '')}_${i}`,
        name: propertyName,
        group: group.name,
        shopNumber: i,
        address: 'Kabwata Shopping Complex, Lusaka',
        rentAmount: 2000 + Math.floor(Math.random() * 30) * 100, // Rent from K2000 to K4900
      });
    }
  });

  return allProperties;
};

export const properties: Property[] = generateProperties();

export const tenants: Tenant[] = [
  { id: 'ten1', name: 'Besa Chibwe', email: 'besa.c@example.com', phone: '+260977112233', propertyId: 'prop_groupa_1', rentAmount: 2500, paymentDay: 1, leaseStartDate: '2023-01-01' },
  { id: 'ten2', name: 'Chisomo Phiri', email: 'chisomo.p@example.com', phone: '+260966223344', propertyId: 'prop_groupa_2', rentAmount: 3000, paymentDay: 5, leaseStartDate: '2022-06-01' },
  { id: 'ten3', name: 'Daliso Mumba', email: 'daliso.m@example.com', phone: '+260955334455', propertyId: 'prop_groupb_1', rentAmount: 1200, paymentDay: 1, leaseStartDate: '2023-11-01' },
  { id: 'ten4', name: 'Emeli Zande', email: 'emeli.z@example.com', phone: '+260777445566', propertyId: 'prop_groupb_2', rentAmount: 5500, paymentDay: 10, leaseStartDate: '2024-02-15' },
  { id: 'ten5', name: 'Fungai Banda', email: 'fungai.b@example.com', phone: '+260765556677', propertyId: 'prop_groupc_1', rentAmount: 4000, paymentDay: 28, leaseStartDate: '2023-08-01' },
];

const today = new Date();
const currentMonth = today.getMonth();
const currentYear = today.getFullYear();

export const payments: Payment[] = [
  // John Doe (due 1st) - Paid this month
  { id: 'pay1', tenantId: 'ten1', amount: 2500, date: new Date(currentYear, currentMonth, 1).toISOString() },
  // Jane Smith (due 5th) - Paid this month
  { id: 'pay2', tenantId: 'ten2', amount: 3000, date: new Date(currentYear, currentMonth, 4).toISOString() },
  // Bob Johnson (due 1st) - Not paid this month yet (Overdue)
  // No payment for Bob this month
  // Alice Williams (due 10th) - Paid for this month
  { id: 'pay4', tenantId: 'ten4', amount: 5500, date: new Date(currentYear, currentMonth, 9).toISOString() },
  // Charlie Brown (due 28th) - Upcoming
  // No payment for Charlie this month yet
  
  // Historical payments
  { id: 'pay5', tenantId: 'ten1', amount: 2500, date: new Date(currentYear, currentMonth - 1, 1).toISOString() },
  { id: 'pay6', tenantId: 'ten2', amount: 3000, date: new Date(currentYear, currentMonth - 1, 5).toISOString() },
  { id: 'pay7', tenantId: 'ten3', amount: 1200, date: new Date(currentYear, currentMonth - 1, 2).toISOString() },
  { id: 'pay8', tenantId: 'ten4', amount: 5500, date: new Date(currentYear, currentMonth - 1, 10).toISOString() },
  { id: 'pay9', tenantId: 'ten5', amount: 4000, date: new Date(currentYear, currentMonth - 1, 27).toISOString() },

  { id: 'pay10', tenantId: 'ten1', amount: 2500, date: new Date(currentYear, currentMonth - 2, 1).toISOString() },
  { id: 'pay11', tenantId: 'ten2', amount: 3000, date: new Date(currentYear, currentMonth - 2, 5).toISOString() },
  { id: 'pay12', tenantId: 'ten3', amount: 1200, date: new Date(currentYear, currentMonth - 2, 2).toISOString() },
  { id: 'pay13', tenantId: 'ten4', amount: 5500, date: new Date(currentYear, currentMonth - 2, 10).toISOString() },
  { id: 'pay14', tenantId: 'ten5', amount: 4000, date: new Date(currentYear, currentMonth - 2, 27).toISOString() },
];
