'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';

type PageHeaderContextType = {
    actions: ReactNode | null;
    setActions: (actions: ReactNode | null) => void;
};

const PageHeaderContext = createContext<PageHeaderContextType | undefined>(undefined);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
    const [actions, setActions] = useState<ReactNode | null>(null);

    return (
        <PageHeaderContext.Provider value={{ actions, setActions }}>
            {children}
        </PageHeaderContext.Provider>
    );
}

export function usePageHeader() {
    const context = useContext(PageHeaderContext);
    if (context === undefined) {
        throw new Error('usePageHeader must be used within a PageHeaderProvider');
    }
    return context;
}
