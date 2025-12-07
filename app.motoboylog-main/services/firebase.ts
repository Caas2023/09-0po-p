import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAjb3XUzyx9_H8FQTvWk8eFlemi0jr3t4k",
  authDomain: "motoboy-d5137.firebaseapp.com",
  projectId: "motoboy-d5137",
  storageBucket: "motoboy-d5137.firebasestorage.app",
  messagingSenderId: "588991145642",
  appId: "1:588991145642:web:de09a87428bf2ba85ed2d3",
  measurementId: "G-59NBYEE045"
};

// Initialize Firebase (Singleton pattern to prevent double-init errors)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);