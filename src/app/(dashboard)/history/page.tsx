
'use client';
// This page is converted to client component to avoid server/client function mismatch
// as getTenantsWithDetails is a client function now.

import { PaymentHistory } from '@/components/history/payment-history';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { getTenantsWithDetails } from '@/lib/data-helpers';
import { TenantWithDetails } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function HistoryPage() {
    const [tenants, setTenants] = useState<TenantWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const tenantsData = await getTenantsWithDetails();
                setTenants(tenantsData);
            } catch (error) {
                console.error("Failed to fetch tenant details for history:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment History</h1>
        <p className="text-muted-foreground">
          Browse the complete record of all tenant payments.
        </p>
      </div>
      <Card>
          <CardContent className="pt-6">
              {isLoading ? (
                <div className="flex h-64 w-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <PaymentHistory tenants={tenants} />
              )}
          </CardContent>
      </Card>
    </div>
  );
}
