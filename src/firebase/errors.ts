'use client';

import { onIdTokenChanged, getAuth } from 'firebase/auth';
import { useUser, useFirebaseApp } from '@/firebase';

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  public name = 'FirestorePermissionError';
  public context: SecurityRuleContext;
  public user: ReturnType<typeof useUser>['user'];
  public token: any;

  constructor(context: SecurityRuleContext) {
    const message = `The following request was denied by Firestore Security Rules:\n${JSON.stringify(context, null, 2)}`;
    super(message);
    this.context = context;

    const app = useFirebaseApp();
    if (app) {
      const auth = getAuth(app);
      this.user = auth.currentUser;
      auth.currentUser?.getIdTokenResult().then((result) => {
        this.token = result.claims;
      });
    }
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      context: this.context,
      user: this.user
        ? {
            uid: this.user.uid,
            email: this.user.email,
            displayName: this.user.displayName,
            photoURL: this.user.photoURL,
            emailVerified: this.user.emailVerified,
            token: this.token,
          }
        : null,
    };
  }
}

export function FirebaseErrorListener({ children }: { children: React.ReactNode }) {
  const [error, setError] = React.useState<FirestorePermissionError | null>(
    null
  );

  React.useEffect(() => {
    const handler = (error: FirestorePermissionError) => {
      setError(error);
    };
    errorEmitter.on('permission-error', handler);

    return () => {
      errorEmitter.off('permission-error', handler);
    };
  }, []);

  if (error) {
    throw error;
  }

  return <>{children}</>;
}
