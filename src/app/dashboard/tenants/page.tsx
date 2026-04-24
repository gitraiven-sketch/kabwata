'use client';

import { useEffect, useState } from 'react';
import { getDocs, collection } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { TenantList } from '@/components/tenants/tenant-list';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import type { Tenant } from '@/lib/types';

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const firestore = useFirestore();

  useEffect(() => {
    const loadTenants = async () => {
      if (!firestore) return;

      try {
        const snapshot = await getDocs(collection(firestore, 'tenants'));
        const tenantsData = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as Tenant))
          .filter((tenant) => !tenant.isArchived);

        setTenants(tenantsData);
      } catch (error) {
        console.error('Failed to load tenants:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTenants();
  }, [firestore]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
        <p className="text-muted-foreground">
          Manage all tenants in the shopping complex.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex h-64 w-full items-center justify-center rounded-lg border">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <TenantList tenants={tenants} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
