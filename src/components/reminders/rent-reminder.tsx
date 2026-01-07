'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Textarea } from '@/components/ui/textarea';
import type { TenantWithDetails } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { generateSingleRentReminder } from '@/ai/flows/automated-rent-reminders';
import { sendAdminOverdueNotice } from '@/ai/flows/send-admin-notice';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { Loader2, Wand2, User, Building, AlertTriangle, Mail } from 'lucide-react';

type CategorizedTenants = {
  dueIn3Days: TenantWithDetails[];
  dueIn2Days: TenantWithDetails[];
  dueIn1Day: TenantWithDetails[];
  dueToday: TenantWithDetails[];
  overdue: TenantWithDetails[];
}

function TenantReminderCard({ tenant, proximity }: { tenant: TenantWithDetails, proximity: string }) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerateReminder = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const result = await generateSingleRentReminder({
        tenantName: tenant.name,
        propertyName: tenant.property.name,
        dueDate: format(tenant.dueDate, 'do MMMM, yyyy'),
        phoneNumber: tenant.phone,
        dueDateProximity: proximity,
      });
      setMessage(result.message);
      toast({
        title: 'Reminder Generated',
        description: `Message for ${tenant.name} has been created.`,
      });
    } catch (error) {
      console.error('Failed to generate reminder:', error);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: 'Could not generate the reminder message.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendReminder = () => {
    if (!message) return;
    const whatsappLink = `https://wa.me/${tenant.phone.replace('+', '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappLink, '_blank');
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start justify-between gap-4 pb-4">
        <div>
           <CardTitle className="text-base">{tenant.name}</CardTitle>
          <CardDescription className="flex items-center gap-1 text-xs"><Building className="h-3 w-3" />{tenant.property.name}</CardDescription>
        </div>
         <div className="text-right">
            <div className="text-sm text-muted-foreground">{format(tenant.dueDate, 'do MMM')}</div>
        </div>
      </CardHeader>
       <CardContent className="flex-grow space-y-2">
        {message ? (
          <Textarea value={message} readOnly rows={4} className="bg-muted" />
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Click "Generate Reminder" to create a personalized WhatsApp message.
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={handleGenerateReminder} disabled={isLoading}>
           {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
          {message ? 'Regenerate' : 'Generate'}
        </Button>
        <Button size="sm" onClick={handleSendReminder} disabled={!message || isLoading}>
          Send via WhatsApp
        </Button>
      </CardFooter>
    </Card>
  )
}

function OverdueAdminReminder({ overdueTenants }: { overdueTenants: TenantWithDetails[] }) {
  const [isSending, setIsSending] = React.useState(false);
  const { toast } = useToast();
  const adminEmail = "kfikreselassie@gmail.com";

  if (overdueTenants.length === 0) {
    return null;
  }

  const handleSendEmail = async () => {
    setIsSending(true);
    try {
      const overdueDetails = overdueTenants.map(t => ({
        tenantName: t.name,
        propertyName: t.property.name,
        rentAmount: t.rentAmount,
        daysOverdue: formatDistanceToNowStrict(t.dueDate, { addSuffix: true }),
      }));

      await sendAdminOverdueNotice({
        to: adminEmail,
        overdueTenants: overdueDetails,
        totalOverdue: overdueTenants.length,
      });
      
      toast({
        title: "Admin Notice Sent",
        description: "The overdue payment summary has been sent to the administrator.",
      });

    } catch (error) {
      console.error("Failed to send admin email:", error);
      toast({
        variant: "destructive",
        title: "Send Failed",
        description: "Could not send the admin notification email.",
      });
    } finally {
      setIsSending(false);
    }
  };


  return (
    <Card className="border-destructive bg-destructive/5">
        <CardHeader>
            <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <div>
                    <CardTitle className="text-destructive">Overdue Payment Alert</CardTitle>
                    <CardDescription>
                       There are {overdueTenants.length} overdue tenants. Click below to send a summary email to the administrator.
                    </CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardFooter className="flex justify-end">
            <Button size="sm" onClick={handleSendEmail} disabled={isSending}>
                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                Send Summary to Admin
            </Button>
        </CardFooter>
    </Card>
  )
}


function ReminderCategory({ title, tenants, proximity }: { title: string, tenants: TenantWithDetails[], proximity: string }) {
  if (tenants.length === 0) return null;
  
  return (
    <AccordionItem value={title}>
      <AccordionTrigger className="text-lg font-semibold">
        {title} ({tenants.length})
      </AccordionTrigger>
      <AccordionContent>
        {tenants.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tenants.map(tenant => (
              <TenantReminderCard key={tenant.id} tenant={tenant} proximity={proximity}/>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-muted-foreground">No tenants in this category.</p>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}


export function CategorizedRentReminders({ categorizedTenants }: { categorizedTenants: CategorizedTenants }) {
  const { dueIn3Days, dueIn2Days, dueIn1Day, dueToday, overdue } = categorizedTenants;

  const defaultOpen = [
    dueToday.length > 0 ? 'Due Today' : undefined,
    overdue.length > 0 ? 'Overdue' : undefined,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      <OverdueAdminReminder overdueTenants={overdue} />
      <Accordion type="multiple" defaultValue={defaultOpen} className="w-full space-y-4">
        <ReminderCategory title="Due Today" tenants={dueToday} proximity="today" />
        <ReminderCategory title="Due Tomorrow" tenants={dueIn1Day} proximity="tomorrow" />
        <ReminderCategory title="Due in 2 Days" tenants={dueIn2Days} proximity="in 2 days" />
        <ReminderCategory title="Due in 3 Days" tenants={dueIn3Days} proximity="in 3 days" />
        <ReminderCategory title="Overdue" tenants={overdue} proximity="overdue" />
      </Accordion>
    </div>
  );
}
