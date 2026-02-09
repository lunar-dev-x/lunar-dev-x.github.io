import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCneQT_L5ZoP8_NZsM40L6Rp6xVJjyqn84",
  authDomain: "soul-link-a412b.firebaseapp.com",
  databaseURL: "https://soul-link-a412b-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "soul-link-a412b",
  storageBucket: "soul-link-a412b.firebasestorage.app",
  messagingSenderId: "400252408425",
  appId: "1:400252408425:web:20f8f20f36aeedbb40c8f8",
  measurementId: "G-R5T2ZY0XLP"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
