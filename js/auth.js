import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { auth, authReady } from "./firebase-config.js";

const ADMIN_EMAILS = new Set([
  "iruizm@ekonomistak.eus"
]);

// Añade aquí futuros usuarios con acceso de lectura a Base Camp.
const MEMBER_EMAILS = new Set([]);

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

export function isAdmin(user) {
  return ADMIN_EMAILS.has(normalizeEmail(user?.email));
}

export function isAuthorized(user) {
  const email = normalizeEmail(user?.email);
  return ADMIN_EMAILS.has(email) || MEMBER_EMAILS.has(email);
}

export function roleFor(user) {
  if (isAdmin(user)) return "admin";
  if (isAuthorized(user)) return "member";
  return "guest";
}

export function observeAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle() {
  await authReady;
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth, provider);
}

export async function signOutCurrentUser() {
  await authReady;
  return signOut(auth);
}

export function currentUser() {
  return auth.currentUser;
}
