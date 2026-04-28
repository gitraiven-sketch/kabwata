'use server';
/**
 * @fileOverview A flow for generating personalized WhatsApp messages to tenants reminding them about upcoming rent payments.
 *
 * - generateSingleRentReminder - A function that generates a single rent reminder message.
 * - RentReminderInput - The input type for the function.
 * - RentReminderOutput - The return type for the function.
 */

import { ai } from '@/ai';
import { z } from 'zod';

const RentReminderInputSchema = z.object({
  tenantName: z.string().describe('The name of the tenant.'),
  propertyName: z.string().describe('The name of the property.'),
  dueDate: z.string().describe('The due date for the rent payment (e.g., "15th July, 2024").'),
  phoneNumber: z.string().describe('The tenant phone number to send the reminder to'),
  dueDateProximity: z.string().describe('A phrase describing the payment status (e.g., "in 3 days", "tomorrow", "today", "overdue"). This will be used to tailor the urgency of the message.')
});
export type RentReminderInput = z.infer<typeof RentReminderInputSchema>;

const RentReminderOutputSchema = z.object({
  message: z.string().describe('The personalized WhatsApp message.'),
});
export type RentReminderOutput = z.infer<typeof RentReminderOutputSchema>;

/**
 * Generates a single, personalized rent reminder message.
 */
export async function generateSingleRentReminder(input: RentReminderInput): Promise<RentReminderOutput> {
  return generateRentReminderFlow(input);
}

const rentReminderPrompt = ai.definePrompt({
  name: 'rentReminderPrompt',
  input: {schema: RentReminderInputSchema},
  output: {schema: RentReminderOutputSchema},
  prompt: `Generate a polite and professional WhatsApp message to a tenant about their rent payment.

Here is the information:
- Tenant Name: {{tenantName}}
- Property: {{propertyName}}
- Due Date: {{dueDate}}
- Status: The payment is {{dueDateProximity}}.

The message should be friendly and clear. Start with "Dear {{tenantName}},".
Do not mention the rent amount.
Tailor the message urgency and content based on the status.
- If the payment is "overdue", the message should be an urgent reminder that their payment is past due and needs to be settled immediately.
- If the payment is due "today", the message should be a final reminder to pay now to avoid being overdue.
- If it's due "tomorrow" or "in a few days", it should be a gentle, friendly reminder.
End with "Thank you, Kabwata Shopping Complex Admin".`,
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
