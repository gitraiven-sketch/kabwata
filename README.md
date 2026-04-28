# Kabwata Shopping Complex - Tenant Management System

This is a comprehensive tenant and property management application designed for the Kabwata Shopping Complex. It provides administrators with a powerful and intuitive dashboard to manage tenants, track rent payments, and streamline communication.
## Key Features

### 1. Centralized Dashboard
A real-time overview of the shopping complex's status, including:
- **Key Metrics**: At-a-glance cards showing the total number of properties, active tenants, and vacant shops.
- **Payment Status Overview**: An interactive pie chart visualizing the proportion of tenants who are paid, have upcoming payments, or are overdue.
- **Urgent Action Lists**: Dedicated tables highlighting tenants with overdue payments and those with upcoming due dates, allowing for proactive management.

### 2. Full Tenant Management
A complete CRM for managing tenant information:
- **Add, Edit, & Archive**: Easily create new tenant profiles, update their information, or archive them when they leave. Archiving preserves data history while keeping the active tenant list clean.
- **Detailed Tenant Profiles**: Each tenant has a dedicated page showing all their details, including contact information, lease start date, rent amount, and current payment status.
- **Payment Tracking**: Mark rent as paid for the current cycle or revert a payment in case of an error, with the system automatically recalculating the tenant's status.

### 3. Comprehensive Property Management
Organize and manage all retail units within the complex:
- **Grouped & Sorted Views**: Properties are automatically grouped (Group A, B, C) and sorted by shop number for easy navigation.
- **Occupancy Status**: Quickly see which properties are vacant and which are occupied. For occupied properties, the current tenant and their payment status are displayed directly on the property card.
- **Bulk & Single Property Creation**: Add properties one by one or in large batches (e.g., create Shops 1 through 20 in Group A at once).

### 4. AI-Powered Reminders & Notifications
Leverage the power of Generative AI to automate and enhance communication:
- **Automated WhatsApp Reminders**: The system categorizes tenants with upcoming or overdue payments. With a single click, you can generate a personalized, professional, and polite WhatsApp reminder message tailored to the urgency of the situation.
- **Admin Overdue Summary**: For tenants with overdue payments, the system can generate a summary report and "send" it to a designated administrator, ensuring prompt follow-up.

### 5. Secure Authentication
A robust and secure system for administrator access:
- **Email & Password Authentication**: Secure login for authorized admin users.
- **User Profile Management**: Admins can update their own profile information.
- **Protected Routes**: All management pages are protected and require a user to be logged in.

## Tech Stack
- **Frontend**: Next.js, React, TypeScript
- **UI**: ShadCN UI Components & Tailwind CSS for a modern, responsive design.
- **Backend**: Firebase (Firestore for database, Firebase Authentication for users).
- **Generative AI**: Google's Genkit and Gemini models for AI-powered features.
