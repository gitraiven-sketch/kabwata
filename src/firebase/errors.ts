'use client';

import type { User, Auth } from 'firebase/auth';

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  public name = 'FirestorePermissionError';
  public context: SecurityRuleContext;
  public user: User | null;
  public token: any;

  constructor(context: SecurityRuleContext, auth: Auth | null) {
    const user = auth?.currentUser || null;
    const message = `The following request was denied by Firestore Security Rules:\n${JSON.stringify(
      {
        ...context,
        auth: user ? { uid: user.uid, email: user.email } : null,
      },
      null,
      2
    )}`;
    super(message);
    this.context = context;
    this.user = user;
    
    if (user) {
        user.getIdTokenResult().then((result) => {
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
