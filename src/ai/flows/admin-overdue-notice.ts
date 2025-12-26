'use server';
/**
 * @fileOverview A flow for generating a summary email for admins about overdue tenants.
 *
 * - generateAdminOverdueNotice - A function that generates the email subject and body.
 * - AdminOverdueNoticeInput - The input type for the function.
 * - AdminOverdueNoticeOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OverdueTenantDetailSchema = z.object({
  tenantName: z.string().describe("The name of the overdue tenant."),
  propertyName: z.string().describe("The property the tenant occupies."),
  rentAmount: z.number().describe("The rent amount that is overdue."),
  daysOverdue: z.string().describe("How long the payment has been overdue (e.g., '5 days')."),
});

const AdminOverdueNoticeInputSchema = z.object({
  overdueTenants: z.array(OverdueTenantDetailSchema).describe('A list of all tenants with overdue payments.'),
  totalOverdue: z.number().describe('The total number of overdue tenants.'),
});
export type AdminOverdueNoticeInput = z.infer<typeof AdminOverdueNoticeInputSchema>;

const AdminOverdueNoticeOutputSchema = z.object({
  subject: z.string().describe('The subject line for the admin email.'),
  body: z.string().describe('The full body content of the email, formatted for clarity.'),
});
export type AdminOverdueNoticeOutput = z.infer<typeof AdminOverdueNoticeOutputSchema>;

export async function generateAdminOverdueNotice(input: AdminOverdueNoticeInput): Promise<AdminOverdueNoticeOutput> {
  return generateAdminOverdueNoticeFlow(input);
}

const adminNoticePrompt = ai.definePrompt({
  name: 'adminOverdueNoticePrompt',
  input: {schema: AdminOverdueNoticeInputSchema},
  output: {schema: AdminOverdueNoticeOutputSchema},
  prompt: `Generate a summary email for property managers about tenants with overdue rent payments.

There are currently {{totalOverdue}} tenants with overdue payments.

Here is the list of overdue tenants:
{{#each overdueTenants}}
- Tenant: {{tenantName}}
  - Property: {{propertyName}}
  - Amount: K{{rentAmount}}
  - Overdue by: {{daysOverdue}}
{{/each}}

The subject line should be "Urgent: {{totalOverdue}} Overdue Rent Payments".
The email body should be professional and start with "Hi Team,".
It should present the information clearly, perhaps using a list format as shown above.
End with "Please follow up with these tenants as soon as possible."
`,
});

const generateAdminOverdueNoticeFlow = ai.defineFlow(
  {
    name: 'generateAdminOverdueNoticeFlow',
    inputSchema: AdminOverdueNoticeInputSchema,
    outputSchema: AdminOverdueNoticeOutputSchema,
  },
  async input => {
    const {output} = await adminNoticePrompt(input);
    return output!;
  }
);
