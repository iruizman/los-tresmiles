import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  browserLocalPersistence,
  getAuth,
  setPersistence
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyB71dn5F5cJd07NWRCVYlsX3VlfbB0FWmE",
  authDomain: "los-tresmiles.firebaseapp.com",
  projectId: "los-tresmiles",
  storageBucket: "los-tresmiles.firebasestorage.app",
  messagingSenderId: "686165061384",
  appId: "1:686165061384:web:527b1008607a68e5cfc6bd"
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

// Conserva la sesión al navegar entre las páginas estáticas.
export const authReady = setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("No se pudo configurar la persistencia de Firebase:", error);
});
