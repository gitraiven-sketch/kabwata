'use server';
/**
 * @fileOverview A flow for generating personalized WhatsApp messages to tenants reminding them about upcoming rent payments.
 *
 * - generateSingleRentReminder - A function that generates a single rent reminder message.
 * - RentReminderInput - The input type for the function.
 * - RentReminderOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RentReminderInputSchema = z.object({
  tenantName: z.string().describe('The name of the tenant.'),
  propertyName: z.string().describe('The name of the property.'),
  dueDate: z.string().describe('The due date for the rent payment (e.g., "15th July, 2024").'),
  phoneNumber: z.string().describe('The tenant phone number to send the reminder to'),
  dueDateProximity: z.string().describe('A phrase describing how close the due date is (e.g., "in 3 days", "in 2 days", "tomorrow", "today"). This will be used to tailor the urgency of the message.')
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
  prompt: `Generate a polite and professional WhatsApp message to a tenant about their upcoming rent payment.

Here is the information:
- Tenant Name: {{tenantName}}
- Property: {{propertyName}}
- Due Date: {{dueDate}}
- Due Date Proximity: The rent is due {{dueDateProximity}}.

The message should be friendly and clear. Start with "Dear {{tenantName}},".
Do not mention the rent amount.
Tailor the message urgency based on the proximity.
- If the payment is due "today", the message should be a final reminder to pay now.
- If it's due "tomorrow" or in a few days, it should be a gentle reminder.
End with "Thank you, Kabwata Shopping Complex Management".`,
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
