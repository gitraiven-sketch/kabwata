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

export type PaymentProofStatus = 'pending' | 'approved' | 'rejected';

export type PaymentProof = {
  id: string;
  tenantId: string;
  amountInWords: string;
  uploadedAt: any; // Can be an ISO date string or a Firestore Timestamp
  status: PaymentProofStatus;
  adminNotes?: string;
};
