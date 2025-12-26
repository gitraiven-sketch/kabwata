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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { TenantWithDetails } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { generateRentReminder } from '@/ai/flows/automated-rent-reminders';
import { format } from 'date-fns';
import { Loader2, Wand2 } from 'lucide-react';

export function RentReminder({ tenants }: { tenants: TenantWithDetails[] }) {
  const [selectedTenantId, setSelectedTenantId] = React.useState<string>('');
  const [generatedMessage, setGeneratedMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();
  
  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);

  const handleGenerateReminder = async () => {
    if (!selectedTenant) {
      toast({
        variant: 'destructive',
        title: 'No Tenant Selected',
        description: 'Please select a tenant to generate a reminder.',
      });
      return;
    }

    setIsLoading(true);
    setGeneratedMessage('');

    try {
      const result = await generateRentReminder({
        tenantName: selectedTenant.name,
        propertyName: selectedTenant.property.name,
        rentAmount: selectedTenant.rentAmount,
        dueDate: format(selectedTenant.dueDate, 'do MMMM, yyyy'),
        phoneNumber: selectedTenant.phone,
      });
      setGeneratedMessage(result.message);
      toast({
        title: 'Reminder Generated',
        description: 'You can now review and send the message.',
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
    if (!selectedTenant || !generatedMessage) return;
    const whatsappLink = `https://wa.me/${selectedTenant.phone.replace('+', '')}?text=${encodeURIComponent(generatedMessage)}`;
    window.open(whatsappLink, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Automated Rent Reminders</CardTitle>
        <CardDescription>
          Select a tenant to generate a personalized WhatsApp rent reminder using AI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="tenant-select">Select Tenant</Label>
          <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
            <SelectTrigger id="tenant-select">
              <SelectValue placeholder="Choose a tenant..." />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.name} - {tenant.property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {selectedTenant && (
            <div className='grid sm:grid-cols-3 gap-4 text-sm'>
                <div><span className='font-medium text-muted-foreground'>Due Date:</span> {format(selectedTenant.dueDate, 'PPP')}</div>
                <div><span className='font-medium text-muted-foreground'>Amount:</span> ${selectedTenant.rentAmount.toLocaleString()}</div>
                <div><span className='font-medium text-muted-foreground'>Status:</span> {selectedTenant.paymentStatus}</div>
            </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="message">Generated Message</Label>
          <Textarea
            id="message"
            placeholder="AI-generated message will appear here..."
            value={generatedMessage}
            onChange={(e) => setGeneratedMessage(e.target.value)}
            rows={6}
            className="bg-muted/40"
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleGenerateReminder} disabled={isLoading || !selectedTenant}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
          Generate Message
        </Button>
        <Button onClick={handleSend} disabled={!generatedMessage}>
          Send via WhatsApp
        </Button>
      </CardFooter>
    </Card>
  );
}
