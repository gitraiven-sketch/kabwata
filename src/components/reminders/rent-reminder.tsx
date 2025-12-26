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
import { generateRentReminder } from '@/ai/flows/automated-rent-reminders';
import { format } from 'date-fns';
import { Loader2, Wand2, User, Building } from 'lucide-react';

type CategorizedTenants = {
  dueIn3Days: TenantWithDetails[];
  dueIn2Days: TenantWithDetails[];
  dueIn1Day: TenantWithDetails[];
  dueToday: TenantWithDetails[];
  overdue: TenantWithDetails[];
}

function TenantReminderCard({ tenant, proximity }: { tenant: TenantWithDetails, proximity: string }) {
  const [generatedMessage, setGeneratedMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const handleGenerateReminder = async () => {
    setIsLoading(true);
    setGeneratedMessage('');

    try {
      const result = await generateRentReminder({
        tenantName: tenant.name,
        propertyName: tenant.property.name,
        rentAmount: tenant.rentAmount,
        dueDate: format(tenant.dueDate, 'do MMMM, yyyy'),
        phoneNumber: tenant.phone,
        dueDateProximity: proximity,
      });
      setGeneratedMessage(result.message);
      toast({
        title: 'Reminder Generated',
        description: `Message for ${tenant.name} is ready.`,
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

  const handleSend = () => {
    if (!generatedMessage) return;
    const whatsappLink = `https://wa.me/${tenant.phone.replace('+', '')}?text=${encodeURIComponent(generatedMessage)}`;
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
            <div className="font-bold">K{tenant.rentAmount.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">{format(tenant.dueDate, 'do MMM')}</div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-2">
         <Textarea
            id={`message-${tenant.id}`}
            placeholder="AI-generated message will appear here..."
            value={generatedMessage}
            onChange={(e) => setGeneratedMessage(e.target.value)}
            rows={5}
            className="bg-muted/40 text-sm"
          />
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button size="sm" variant="outline" onClick={handleGenerateReminder} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
          Generate
        </Button>
        <Button size="sm" onClick={handleSend} disabled={!generatedMessage}>
          Send via WhatsApp
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
    <Accordion type="multiple" defaultValue={defaultOpen} className="w-full space-y-4">
      <ReminderCategory title="Due Today" tenants={dueToday} proximity="today" />
      <ReminderCategory title="Due Tomorrow" tenants={dueIn1Day} proximity="tomorrow" />
      <ReminderCategory title="Due in 2 Days" tenants={dueIn2Days} proximity="in 2 days" />
      <ReminderCategory title="Due in 3 Days" tenants={dueIn3Days} proximity="in 3 days" />
      <ReminderCategory title="Overdue" tenants={overdue} proximity="overdue" />
    </Accordion>
  );
}
