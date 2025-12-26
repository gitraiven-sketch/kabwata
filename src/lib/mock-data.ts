import type { Tenant, Property, Payment } from './types';
import { PlaceHolderImages } from './placeholder-images';

export const properties: Property[] = [
  { id: 'prop1', name: 'Unit 101A', address: '123 Main St, Kabwata', rentAmount: 2500, image: PlaceHolderImages[0].imageUrl, imageHint: PlaceHolderImages[0].imageHint },
  { id: 'prop2', name: 'Unit 102B', address: '123 Main St, Kabwata', rentAmount: 3000, image: PlaceHolderImages[1].imageUrl, imageHint: PlaceHolderImages[1].imageHint },
  { id: 'prop3', name: 'Kiosk 3', address: '456 Side Ave, Kabwata', rentAmount: 1200, image: PlaceHolderImages[2].imageUrl, imageHint: PlaceHolderImages[2].imageHint },
  { id: 'prop4', name: 'Office 201', address: '789 Business Rd, Kabwata', rentAmount: 5500, image: PlaceHolderImages[3].imageUrl, imageHint: PlaceHolderImages[3].imageHint },
  { id: 'prop5', name: 'Shop 5', address: '123 Main St, Kabwata', rentAmount: 4000, image: PlaceHolderImages[4].imageUrl, imageHint: PlaceHolderImages[4].imageHint },
  { id: 'prop6', name: 'Restaurant Space', address: '10 Foodie Lane, Kabwata', rentAmount: 7000, image: PlaceHolderImages[5].imageUrl, imageHint: PlaceHolderImages[5].imageHint },
];

export const tenants: Tenant[] = [
  { id: 'ten1', name: 'John Doe', email: 'john.doe@example.com', phone: '+260977123456', propertyId: 'prop1', rentAmount: 2500, paymentDay: 1, leaseStartDate: '2023-01-01', leaseEndDate: '2024-12-31' },
  { id: 'ten2', name: 'Jane Smith', email: 'jane.smith@example.com', phone: '+260966123456', propertyId: 'prop2', rentAmount: 3000, paymentDay: 5, leaseStartDate: '2022-06-01', leaseEndDate: '2024-05-31' },
  { id: 'ten3', name: 'Bob Johnson', email: 'bob.j@example.com', phone: '+260955123456', propertyId: 'prop3', rentAmount: 1200, paymentDay: 1, leaseStartDate: '2023-11-01', leaseEndDate: '2024-10-31' },
  { id: 'ten4', name: 'Alice Williams', email: 'alice.w@example.com', phone: '+260777123456', propertyId: 'prop4', rentAmount: 5500, paymentDay: 10, leaseStartDate: '2024-02-15', leaseEndDate: '2025-02-14' },
  { id: 'ten5', name: 'Charlie Brown', email: 'charlie.b@example.com', phone: '+260765123456', propertyId: 'prop5', rentAmount: 4000, paymentDay: 28, leaseStartDate: '2023-08-01', leaseEndDate: '2024-07-31' },
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
