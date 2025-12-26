import { getTenantsWithDetails } from '@/lib/data-helpers';
import { RentReminder } from '@/components/reminders/rent-reminder';

export default async function RemindersPage() {
  const tenants = await getTenantsWithDetails();

  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-3xl font-bold tracking-tight">Rent Reminders</h1>
        <p className="text-muted-foreground">
          Generate and send payment reminders to tenants.
        </p>
      </div>
      <RentReminder tenants={tenants} />
    </div>
  );
}
