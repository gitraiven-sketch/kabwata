
'use client';

import type { TenantWithDetails } from '@/lib/types';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export function PaymentHistory({ tenants }: { tenants: TenantWithDetails[] }) {
    // This is a simplified placeholder. In a real app, you'd fetch and display actual payment records.
    // For now, we'll just show the last payment date from the tenant record if it exists.
    
    const payments = tenants
        .filter(tenant => tenant.lastPaidDate)
        .map(tenant => ({
            id: `payment-${tenant.id}`,
            tenantName: tenant.name,
            propertyName: tenant.property.name,
            amount: tenant.rentAmount,
            date: tenant.lastPaidDate!,
            status: tenant.paymentStatus,
        }))
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());


  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 py-24 text-center">
        <h3 className="mt-4 text-lg font-semibold">No Payment History Found</h3>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">
          No payments have been recorded yet.
        </p>
      </div>
    );
  }


  return (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {payments.map((payment) => (
                <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.tenantName}</TableCell>
                    <TableCell>{payment.propertyName}</TableCell>
                    <TableCell>{format(new Date(payment.date), 'do MMMM, yyyy')}</TableCell>
                    <TableCell className="text-right">K{payment.amount.toLocaleString()}</TableCell>
                </TableRow>
            ))}
        </TableBody>
    </Table>
  );
}
