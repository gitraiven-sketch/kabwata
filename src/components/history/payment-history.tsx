
'use client';

import * as React from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { Search, Loader2 } from 'lucide-react';
import type { Payment } from '@/lib/types';
import { format } from 'date-fns';
import { useFirestore } from '@/firebase';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';


export function PaymentHistory() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const firestore = useFirestore();

  React.useEffect(() => {
    if (!firestore) return;

    const paymentsQuery = query(collection(firestore, 'payments'), orderBy('recordedAt', 'desc'));
    
    const unsubscribe = onSnapshot(paymentsQuery, (snapshot) => {
      const paymentData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
              id: doc.id,
              ...data,
              // Firestore Timestamps need to be converted to JS Dates then to strings
              paymentDate: (data.paymentDate as any).toDate().toISOString(),
              recordedAt: (data.recordedAt as any).toDate().toISOString(),
          } as Payment;
      });
      setPayments(paymentData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching payment history:", error);
      setIsLoading(false);
      // In a real app, you would want to show an error state to the user
    });

    return () => unsubscribe();
  }, [firestore]);


  const filteredPayments = payments.filter(
    (payment) =>
      payment.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.propertyName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
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

       {isLoading ? (
            <div className="flex h-64 w-full items-center justify-center rounded-lg border">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : filteredPayments.length > 0 ? (
           <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Payment For</TableHead>
                    <TableHead>Recorded On</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
            {filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.tenantName}</TableCell>
                    <TableCell>{payment.propertyName}</TableCell>
                    <TableCell>{format(new Date(payment.paymentDate), 'do MMMM yyyy')}</TableCell>
                    <TableCell>{format(new Date(payment.recordedAt), 'do MMM yyyy, h:mm a')}</TableCell>
                    <TableCell className="text-right font-mono">
                        K{payment.amount.toLocaleString()}
                    </TableCell>
                </TableRow>
            ))}
            </TableBody>
           </Table>
        ) : (
             <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 py-24 text-center">
                <h3 className="mt-4 text-lg font-semibold">No Payments Found</h3>
                <p className="mb-4 mt-2 text-sm text-muted-foreground">Once you mark a tenant's rent as paid, the payment record will appear here.</p>
            </div>
        )}
    </div>
  );
}
