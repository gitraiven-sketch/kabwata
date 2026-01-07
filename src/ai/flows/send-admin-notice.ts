'use server';
/**
 * @fileOverview A flow for sending a summary email about overdue tenants to an admin.
 *
 * - sendAdminOverdueNotice - A function that generates and "sends" the email.
 * - SendAdminNoticeInput - The input type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { generateAdminOverdueNotice, type AdminOverdueNoticeInput, type AdminOverdueNoticeOutput } from './admin-overdue-notice';


const SendAdminNoticeInputSchema = z.object({
  to: z.string().email().describe('The email address of the recipient.'),
  overdueTenants: z.array(z.object({
      tenantName: z.string(),
      propertyName: z.string(),
      rentAmount: z.number(),
      daysOverdue: z.string(),
  })),
  totalOverdue: z.number(),
});

export type SendAdminNoticeInput = z.infer<typeof SendAdminNoticeInputSchema>;

export async function sendAdminOverdueNotice(input: SendAdminNoticeInput): Promise<void> {
  await sendAdminOverdueNoticeFlow(input);
}


const sendAdminOverdueNoticeFlow = ai.defineFlow(
  {
    name: 'sendAdminOverdueNoticeFlow',
    inputSchema: SendAdminNoticeInputSchema,
    outputSchema: z.void(),
  },
  async (input: SendAdminNoticeInput) => {
    
    // Step 1: Generate the email content using the existing flow
    const emailContent: AdminOverdueNoticeOutput = await generateAdminOverdueNotice({
        overdueTenants: input.overdueTenants,
        totalOverdue: input.totalOverdue
    });
    
    // Step 2: "Send" the email.
    // In a real application, you would integrate an email service like SendGrid, Resend, or Mailgun here.
    // For this prototype, we will log the action to the console to simulate sending.
    
    console.log('**************************************************');
    console.log(`SIMULATING SENDING EMAIL TO: ${input.to}`);
    console.log('**************************************************');
    console.log(`SUBJECT: ${emailContent.subject}`);
    console.log('--------------------------------------------------');
    console.log(`BODY:\n${emailContent.body}`);
    console.log('**************************************************');
    
    // This is where you would add your email sending logic, for example:
    //
    // import { Resend } from 'resend';
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'admin@kabwatacomplex.com',
    //   to: input.to,
    //   subject: emailContent.subject,
    //   html: `<p>${emailContent.body.replace(/\n/g, '<br>')}</p>`
    // });

    // Since we are not implementing a real email service, we just resolve.
    return;
  }
);
