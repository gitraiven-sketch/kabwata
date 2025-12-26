'use server';
/**
 * @fileOverview A flow for generating personalized WhatsApp messages to tenants reminding them about upcoming rent payments.
 *
 * - generateRentReminder - A function that generates the rent reminder message.
 * - RentReminderInput - The input type for the generateRentReminder function.
 * - RentReminderOutput - The return type for the generateRentReminder function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RentReminderInputSchema = z.object({
  tenantName: z.string().describe('The name of the tenant.'),
  propertyName: z.string().describe('The name of the property.'),
  rentAmount: z.number().describe('The amount of rent due.'),
  dueDate: z.string().describe('The due date for the rent payment (YYYY-MM-DD).'),
  phoneNumber: z.string().describe('The tenant phone number to send the reminder to'),
});
export type RentReminderInput = z.infer<typeof RentReminderInputSchema>;

const RentReminderOutputSchema = z.object({
  message: z.string().describe('The personalized WhatsApp message.'),
});
export type RentReminderOutput = z.infer<typeof RentReminderOutputSchema>;

export async function generateRentReminder(input: RentReminderInput): Promise<RentReminderOutput> {
  return generateRentReminderFlow(input);
}

const rentReminderPrompt = ai.definePrompt({
  name: 'rentReminderPrompt',
  input: {schema: RentReminderInputSchema},
  output: {schema: RentReminderOutputSchema},
  prompt: `Dear {{tenantName}},

This is a friendly reminder that your rent payment of K{{rentAmount}} for {{propertyName}} is due on {{dueDate}}.

Please make your payment on time to avoid any late fees.

Thank you,
Kabwata Shopping Complex Management`,
});

const generateRentReminderFlow = ai.defineFlow(
  {
    name: 'generateRentReminderFlow',
    inputSchema: RentReminderInputSchema,
    outputSchema: RentReminderOutputSchema,
  },
  async input => {
    const {output} = await rentReminderPrompt(input);
    return output!;
  }
);
