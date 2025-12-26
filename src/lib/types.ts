export type Tenant = {
  id: string;
  name: string;
  phone: string;
  propertyId: string;
  rentAmount: number;
  paymentDay: number; // Day of the month rent is due
  leaseStartDate: string;
};

export type Property = {
  id: string;
  name: string;
  group: string;
  shopNumber: number;
  address: string;
  rentAmount: number;
};

export type Payment = {
  id: string;
  tenantId: string;
  amount: number;
  date: string; // ISO date string
  receiptUrl?: string;
};

export type PaymentStatus = 'Paid' | 'Overdue' | 'Upcoming';

export type TenantWithDetails = Tenant & {
  property: Property;
  paymentStatus: PaymentStatus;
  dueDate: Date;
  payments: Payment[];
};
