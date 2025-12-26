import { getTenantsWithDetails } from '@/lib/data-helpers';
import { PaymentHistory } from '@/components/history/payment-history';
import {
  Card,
  CardContent,
} from '@/components/ui/card';

export default async function HistoryPage() {
    const tenants = await getTenantsWithDetails();

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
              <PaymentHistory tenants={tenants} />
          </CardContent>
      </Card>
    </div>
  );
}
