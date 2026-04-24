const { initializeApp, getApps, getApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');
const { getFirestore } = require('firebase/firestore');
const { firebaseConfig } = require('./firebase-config');

let app;
let auth;
let firestore;

function initializeFirebase() {
  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }

  if (!auth) {
    auth = getAuth(app);
  }

  if (!firestore) {
    firestore = getFirestore(app);
  }

  return { app, auth, firestore };
}

module.exports = {
  initializeFirebase,
  getAuth: () => {
    if (!auth) initializeFirebase();
    return auth;
  },
  getFirestore: () => {
    if (!firestore) initializeFirebase();
    return firestore;
  }
};