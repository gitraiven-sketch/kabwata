'use server';

import type { Tenant, Property, Payment, TenantWithDetails, PaymentStatus } from './types';
import { getFirestore, collection, getDocs, collectionGroup } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

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

async function getProperties(): Promise<Property[]> {
    try {
        const { firestore } = initializeFirebase();
        const propertyCollection = collection(firestore, 'properties');
        const propertySnapshot = await getDocs(propertyCollection);
        return propertySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
    } catch (error) {
        console.error("Error fetching properties:", error);
        return [];
    }
}


export async function getTenantsWithDetails(): Promise<TenantWithDetails[]> {
    try {
        const { firestore } = initializeFirebase();
        const tenantsCollection = collection(firestore, 'tenants');
        const properties = await getProperties();
        
        const tenantSnapshot = await getDocs(tenantsCollection);
        const tenantList = tenantSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant));
        
        const propertyMap = new Map<string, Property>(properties.map(p => [p.id, p]));

        const tenantsWithDetails: TenantWithDetails[] = [];

        for (const tenant of tenantList) {
            const paymentCollection = collection(firestore, 'tenants', tenant.id, 'payments');
            const paymentSnapshot = await getDocs(paymentCollection);
            const tenantPayments = paymentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
            
            const { status, dueDate } = getPaymentStatus(tenant, tenantPayments);

            tenantsWithDetails.push({
                ...tenant,
                property: propertyMap.get(tenant.propertyId)!,
                paymentStatus: status,
                dueDate,
                payments: tenantPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            });
        }
        
        return tenantsWithDetails;

    } catch (error) {
        console.error("Error fetching tenants with details:", error);
        return [];
    }
}


export async function getDashboardData() {
    const tenantsWithDetails = await getTenantsWithDetails();
    const properties = await getProperties();

    const totalTenants = tenantsWithDetails.length;
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
