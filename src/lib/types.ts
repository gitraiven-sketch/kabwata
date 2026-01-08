
export type Tenant = {
  id: string;
  name: string;
  phone: string;
  propertyId: string;
  rentAmount: number;
  paymentDay: number; // Day of the month rent is due
  leaseStartDate: string;
  lastPaidDate?: string; // ISO date string
};

export type Property = {
  id: string;
  name: string;
  group: string;
  shopNumber: number;
  address: string;
  paymentDay: number;
};

export type Payment = {
  id: string;
  tenantId: string;
  propertyId: string;
  amount: number;
  paymentDate: string; // ISO date string
  recordedAt: string; // ISO date string
  tenantName: string;
  propertyName: string;
}

export type PaymentStatus = 'Paid' | 'Overdue' | 'Upcoming';

export type TenantWithDetails = Tenant & {
  property: Property;
  paymentStatus: PaymentStatus;
  dueDate: Date;
};
