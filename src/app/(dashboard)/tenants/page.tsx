import { TenantList } from '@/components/tenants/tenant-list';
import {
  Card,
  CardContent,
} from '@/components/ui/card';

export default function TenantsPage() {
  // Data is now fetched on the client inside TenantList.
  // Passing an empty array to avoid breaking the component's initial render.
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
          <TenantList tenants={[]} />
        </CardContent>
      </Card>
    </div>
  );
}
