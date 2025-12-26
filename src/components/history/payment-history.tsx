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
import { Loader2, Search } from 'lucide-react';
import type { Tenant, Property, Payment } from '@/lib/types';
import { format } from 'date-fns';
import { useAuth, useFirestore } from '@/firebase';
import { collection, collectionGroup, onSnapshot, query } from 'firebase/firestore';
import { properties as mockProperties } from '@/lib/mock-data';

type FullPaymentRecord = {
  paymentId: string;
  tenantName: string;
  tenantId: string;
  propertyName: string;
  amount: number;
  date: Date;
};

export function PaymentHistory() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [allPayments, setAllPayments] = React.useState<FullPaymentRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!firestore) {
      setIsLoading(false);
      return;
    }

    const paymentsQuery = query(collectionGroup(firestore, 'payments'));
    const tenantsQuery = query(collection(firestore, 'tenants'));

    const propertyMap = new Map<string, Property>(mockProperties.map(p => [p.id, p]));
    let tenantMap = new Map<string, Tenant>();

    const unsubTenants = onSnapshot(tenantsQuery, (snapshot) => {
      const newTenantMap = new Map<string, Tenant>();
      snapshot.forEach(doc => {
        newTenantMap.set(doc.id, { id: doc.id, ...doc.data() } as Tenant);
      });
      tenantMap = newTenantMap;
    });

    const unsubPayments = onSnapshot(paymentsQuery, (snapshot) => {
      const paymentsData: FullPaymentRecord[] = [];
      snapshot.forEach((doc) => {
        const payment = { id: doc.id, ...doc.data() } as Payment;
        const tenant = tenantMap.get(payment.tenantId);
        if (tenant) {
          const property = propertyMap.get(tenant.propertyId);
          paymentsData.push({
            paymentId: payment.id,
            tenantName: tenant.name,
            tenantId: tenant.id,
            propertyName: property?.name || 'N/A',
            amount: payment.amount,
            date: new Date(payment.date),
          });
        }
      });
      setAllPayments(paymentsData.sort((a, b) => b.date.getTime() - a.date.getTime()));
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching payments: ", error);
      setIsLoading(false);
    });

    return () => {
      unsubTenants();
      unsubPayments();
    };
  }, [firestore]);


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
             {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                </TableCell>
              </TableRow>
            ) : filteredPayments.length > 0 ? (
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
