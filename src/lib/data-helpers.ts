'use server';

import { tenants, properties, payments } from './mock-data';
import type { Tenant, Property, Payment, TenantWithDetails, PaymentStatus } from './types';

function getPaymentStatus(tenant: Tenant, allPayments: Payment[]): { status: PaymentStatus, dueDate: Date } {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const dueDate = new Date(currentYear, currentMonth, tenant.paymentDay);
    
    const paymentForCurrentMonth = allPayments.find(p => 
        p.tenantId === tenant.id &&
        new Date(p.date).getMonth() === currentMonth &&
        new Date(p.date).getFullYear() === currentYear
    );

    if (paymentForCurrentMonth) {
        return { status: 'Paid', dueDate };
    }

    if (today > dueDate) {
        return { status: 'Overdue', dueDate };
    }

    return { status: 'Upcoming', dueDate };
}

export async function getTenantsWithDetails(): Promise<TenantWithDetails[]> {
    const propertyMap = new Map<string, Property>(properties.map(p => [p.id, p]));
    const paymentsByTenant = new Map<string, Payment[]>();

    for (const payment of payments) {
        if (!paymentsByTenant.has(payment.tenantId)) {
            paymentsByTenant.set(payment.tenantId, []);
        }
        paymentsByTenant.get(payment.tenantId)!.push(payment);
    }
    
    return tenants.map(tenant => {
        const tenantPayments = paymentsByTenant.get(tenant.id) || [];
        const { status, dueDate } = getPaymentStatus(tenant, tenantPayments);
        return {
            ...tenant,
            property: propertyMap.get(tenant.propertyId)!,
            paymentStatus: status,
            dueDate,
            payments: tenantPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        };
    });
}

export async function getDashboardData() {
    const tenantsWithDetails = await getTenantsWithDetails();

    const totalTenants = tenants.length;
    const totalProperties = properties.length;
    
    const statusCounts = tenantsWithDetails.reduce((acc, tenant) => {
        acc[tenant.paymentStatus] = (acc[tenant.paymentStatus] || 0) + 1;
        return acc;
    }, {} as Record<PaymentStatus, number>);

    const overdueTenants = tenantsWithDetails.filter(t => t.paymentStatus === 'Overdue');
    const upcomingPayments = tenantsWithDetails.filter(t => t.paymentStatus === 'Upcoming').sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return {
        totalTenants,
        totalProperties,
        statusCounts: {
            paid: statusCounts.Paid || 0,
            overdue: statusCounts.Overdue || 0,
            upcoming: statusCounts.Upcoming || 0,
        },
        overdueTenants,
        upcomingPayments: upcomingPayments.slice(0, 5) // Get next 5 upcoming
    };
}
