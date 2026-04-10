export type Tenant = {
  id: string;
  uid?: string;
  name: string;
  phone: string;
  propertyId: string;
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

export type PaymentProofStatus = 'pending' | 'approved' | 'rejected';

export type PaymentProof = {
  id: string;
  tenantId: string;
  amountInWords: string;
  uploadedAt: string; // ISO date string
  status: PaymentProofStatus;
  adminNotes?: string;
};
