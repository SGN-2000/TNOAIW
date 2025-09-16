import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyBbPIgOvXJYZU32nD-jvtn2JGiMNwTUvi8",
  authDomain: "wiaont-24.firebaseapp.com",
  databaseURL: "https://wiaont-24-default-rtdb.firebaseio.com",
  projectId: "wiaont-24",
  storageBucket: "wiaont-24.appspot.com",
  messagingSenderId: "332355578955",
  appId: "1:332355578955:web:36ebcdcf8f0b659dc371ce",
  measurementId: "G-9CP0MDX5L6"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
// This is to ensure persistence works with Next.js SSR
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence);
}

const db = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };
