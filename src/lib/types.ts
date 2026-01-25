
export type Tenant = {
  id: string;
  name: string;
  phone: string;
  propertyId: string;
  rentAmount: number;
  paymentDay: number; // Day of the month rent is due
  leaseStartDate: string;
  lastPaidDate?: string; // ISO date string
  isArchived?: boolean;
};

export type Property = {
  id: string;
  name: string;
  group: string;
  shopNumber: number;
  address: string;
  paymentDay: number;
};

export type PaymentStatus = 'Paid' | 'Overdue' | 'Upcoming';

export type TenantWithDetails = Tenant & {
  property: Property;
  paymentStatus: PaymentStatus;
  dueDate: Date;
};
