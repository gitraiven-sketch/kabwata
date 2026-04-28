import { config } from 'dotenv';
config();

import '@/ai/flows/automated-rent-reminders.ts';
import '@/ai/flows/payment-receipt-email.ts';
import '@/ai/flows/admin-overdue-notice.ts';
import '@/ai/flows/send-admin-notice.ts';
