import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import firebaseConfigJSON from "../firebase-applet-config.json";

const env = (import.meta as any).env || {};

const firebaseConfig = {
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJSON.projectId || "rosy-flare-c5jvd",
  appId: env.VITE_FIREBASE_APP_ID || firebaseConfigJSON.appId || "1:117476310827:web:0ee73b4459a181c6e90f6e",
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfigJSON.apiKey || "AIzaSyCs8L3iDnIoz-fK74Ep1pihqT9iIK_JLuU",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJSON.authDomain || "rosy-flare-c5jvd.firebaseapp.com",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJSON.storageBucket || "rosy-flare-c5jvd.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJSON.messagingSenderId || "117476310827"
};

const databaseId = firebaseConfigJSON.firestoreDatabaseId || "ai-studio-fbfeed5f-d2f2-4653-8d9f-1abdd41b3d08";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with the database ID
export const db = getFirestore(app, databaseId);
export const auth = getAuth(app);

// Authenticate anonymously if needed
signInAnonymously(auth).catch((err) => {
  console.warn("Firebase anonymous auth fallback note:", err);
});

export default app;

