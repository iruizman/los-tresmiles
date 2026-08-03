import {
  isAdmin,
  isAuthorized,
  observeAuth,
  signInWithGoogle,
  signOutCurrentUser
} from "./auth.js";

const loading = document.querySelector("#basecamp-loading");
const locked = document.querySelector("#basecamp-locked");
const denied = document.querySelector("#basecamp-denied");
const content = document.querySelector("#basecamp-content");

function showOnly(target) {
  [loading, locked, denied, content].forEach((section) => {
    if (!section) return;
    section.hidden = section !== target;
  });
}

function fillUser(user) {
  document.querySelectorAll("[data-user-name]").forEach((node) => {
    node.textContent = user.displayName || "Iñaki";
  });
  document.querySelectorAll("[data-user-email]").forEach((node) => {
    node.textContent = user.email || "";
  });
  document.querySelectorAll("[data-user-role]").forEach((node) => {
    node.textContent = isAdmin(user) ? "Administrador" : "Usuario autorizado";
  });
}

document.querySelectorAll("[data-basecamp-login]").forEach((button) => {
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await signInWithGoogle();
    } catch (error) {
      if (error?.code !== "auth/popup-closed-by-user") {
        console.error(error);
        const status = document.querySelector("#basecamp-auth-error");
        if (status) status.textContent = "No se pudo iniciar sesión. Inténtalo de nuevo.";
      }
    } finally {
      button.disabled = false;
    }
  });
});

document.querySelectorAll("[data-basecamp-signout]").forEach((button) => {
  button.addEventListener("click", () => signOutCurrentUser());
});

observeAuth((user) => {
  if (!user) {
    showOnly(locked);
    return;
  }
  fillUser(user);
  if (!isAuthorized(user)) {
    showOnly(denied);
    return;
  }
  showOnly(content);
});
