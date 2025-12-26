import { getTenantsWithDetails } from '@/lib/data-helpers';
import { TenantList } from '@/components/tenants/tenant-list';
import {
  Card,
  CardContent,
} from '@/components/ui/card';

export default async function TenantsPage() {
  const tenants = await getTenantsWithDetails();

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
          <TenantList tenants={tenants} />
        </CardContent>
      </Card>
    </div>
  );
}
