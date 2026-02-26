import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC_QieS3wcERdfgftV3UgBBb6N9dRci9ic",
  authDomain: "add-tls-order.firebaseapp.com",
  projectId: "add-tls-order",
  storageBucket: "add-tls-order.firebasestorage.app",
  messagingSenderId: "811805311585",
  appId: "1:811805311585:web:08edd86e95344aa8f6e020",
  measurementId: "G-RSNB27Q7R3"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
