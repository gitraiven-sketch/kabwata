export type Tenant = {
  id: string;
  name: string;
  email: string;
  phone: string;
  propertyId: string;
  rentAmount: number;
  paymentDay: number; // Day of the month rent is due
  leaseStartDate: string;
  leaseEndDate: string;
};

export type Property = {
  id: string;
  name: string;
  address: string;
  rentAmount: number;
  image: string;
  imageHint: string;
};

export type Payment = {
  id: string;
  tenantId: string;
  amount: number;
  date: string; // ISO date string
};

export type PaymentStatus = 'Paid' | 'Overdue' | 'Upcoming';

export type TenantWithDetails = Tenant & {
  property: Property;
  paymentStatus: PaymentStatus;
  dueDate: Date;
  payments: Payment[];
};
