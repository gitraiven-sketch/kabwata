'use client';
import { ReactNode } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from './';

export const FirebaseClientProvider = ({ children }: { children: ReactNode }) => {
  const { app, auth, firestore } = initializeFirebase();
  return (
    <FirebaseProvider value={{ app, auth, firestore }}>
      {children}
    </FirebaseProvider>
  );
};
