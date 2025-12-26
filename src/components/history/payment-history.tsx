'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import type { TenantWithDetails } from '@/lib/types';
import { format } from 'date-fns';

type FullPaymentRecord = {
  paymentId: string;
  tenantName: string;
  tenantId: string;
  propertyName: string;
  amount: number;
  date: Date;
};

export function PaymentHistory({ tenants }: { tenants: TenantWithDetails[] }) {
  const [searchTerm, setSearchTerm] = React.useState('');

  const allPayments: FullPaymentRecord[] = React.useMemo(() => {
    return tenants
      .flatMap((tenant) =>
        tenant.payments.map((p) => ({
          paymentId: p.id,
          tenantName: tenant.name,
          tenantId: tenant.id,
          propertyName: tenant.property.name,
          amount: p.amount,
          date: new Date(p.date),
        }))
      )
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [tenants]);

  const filteredPayments = allPayments.filter(
    (payment) =>
      payment.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.propertyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by tenant or property..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead className="text-right">Amount Paid</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.length > 0 ? (
              filteredPayments.map((payment) => (
                <TableRow key={payment.paymentId}>
                  <TableCell className="font-medium">{payment.tenantName}</TableCell>
                  <TableCell>{payment.propertyName}</TableCell>
                  <TableCell>{format(payment.date, 'PPP')}</TableCell>
                  <TableCell className="text-right">
                    K{payment.amount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No payment records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
