'use server';
/**
 * @fileOverview A flow for generating a professional payment receipt email.
 *
 * - generateReceiptEmail - A function that generates the email subject and body.
 * - ReceiptEmailInput - The input type for the generateReceiptEmail function.
 * - ReceiptEmailOutput - The return type for the generateReceiptEmail function.
 */
import { ai } from '@/ai';
import { z } from 'zod';

const ReceiptEmailInputSchema = z.object({
  tenantName: z.string().describe('The name of the tenant.'),
  propertyName: z.string().describe('The name of the property.'),
  paymentAmount: z.number().describe('The amount of the payment.'),
  paymentDate: z.string().describe('The date of the payment (e.g., "15th July, 2024").'),
  receiptUrl: z.string().optional().describe('A URL to the payment receipt.'),
});
export type ReceiptEmailInput = z.infer<typeof ReceiptEmailInputSchema>;

const ReceiptEmailOutputSchema = z.object({
  subject: z.string().describe('The subject line for the email.'),
  body: z.string().describe('The full body content of the email.'),
});
export type ReceiptEmailOutput = z.infer<typeof ReceiptEmailOutputSchema>;

export async function generateReceiptEmail(input: ReceiptEmailInput): Promise<ReceiptEmailOutput> {
  return generateReceiptEmailFlow(input);
}

const receiptEmailPrompt = ai.definePrompt({
  name: 'receiptEmailPrompt',
  input: {schema: ReceiptEmailInputSchema},
  output: {schema: ReceiptEmailOutputSchema},
  prompt: `Generate a polite and professional email to a tenant confirming their recent rent payment.

Here is the information:
- Tenant Name: {{tenantName}}
- Property: {{propertyName}}
- Payment Amount: K{{paymentAmount}}
- Payment Date: {{paymentDate}}
{{#if receiptUrl}}- Receipt URL: {{receiptUrl}}{{/if}}

The email should have a clear subject line like "Payment Receipt - Kabwata Shopping Complex".
The body should start with "Dear {{tenantName}}," and clearly state that the payment has been received and processed.
Mention the property, amount, and date.
If a receipt URL is provided, include a line that says "You can view your receipt here: {{receiptUrl}}".
End with "Thank you for your timely payment." and "Sincerely, Kabwata Shopping Complex Admin".`,
});


const generateReceiptEmailFlow = ai.defineFlow(
  {
    name: 'generateReceiptEmailFlow',
    inputSchema: ReceiptEmailInputSchema,
    outputSchema: ReceiptEmailOutputSchema,
  },
  async input => {
    const {output} = await receiptEmailPrompt(input);
    return output!;
  }
);
