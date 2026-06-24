import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAtRYw7mPEIJkfaRyoPJZYQJDza0rA5FWM",
  authDomain: "projektownik2026.firebaseapp.com",
  projectId: "projektownik2026",
  storageBucket: "projektownik2026.firebasestorage.app",
  messagingSenderId: "752941908477",
  appId: "1:752941908477:web:c58e8bd24fe796a226d994"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const provider = new GoogleAuthProvider();
export { signInWithPopup, onAuthStateChanged, signOut, ref, uploadBytes, getDownloadURL };
