import {
  isAuthorized,
  observeAuth,
  signInWithGoogle,
  signOutCurrentUser
} from "./auth.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initials(user) {
  const source = user?.displayName || user?.email || "U";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}

function ensureAuthHost() {
  const header = document.querySelector(".site-header");
  if (!header) return null;

  let host = header.querySelector(".header-actions");
  if (!host) {
    host = document.createElement("div");
    host.className = "header-actions";
    header.appendChild(host);
  }

  host.querySelector(".profile-dot")?.remove();

  let authHost = host.querySelector("#auth-control");
  if (!authHost) {
    authHost = document.createElement("div");
    authHost.id = "auth-control";
    authHost.className = "auth-control";
    host.appendChild(authHost);
  }
  return authHost;
}

function ensureToast() {
  let toast = document.querySelector("#auth-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "auth-toast";
    toast.className = "auth-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  return toast;
}

let toastTimer;
function showToast(message, tone = "info") {
  const toast = ensureToast();
  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 4200);
}

function closeMenus() {
  document.querySelectorAll(".auth-menu[open]").forEach((menu) => menu.removeAttribute("open"));
}

function renderSignedOut(host) {
  host.innerHTML = `
    <button class="auth-login-button" type="button" data-auth-login>
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.7-4 3-6 6.5-6s5.8 2 6.5 6"/></svg>
      <span>Acceder</span>
    </button>
  `;

  host.querySelector("[data-auth-login]")?.addEventListener("click", async () => {
    const button = host.querySelector("[data-auth-login]");
    button.disabled = true;
    button.querySelector("span").textContent = "Conectando…";
    try {
      const result = await signInWithGoogle();
      if (!isAuthorized(result.user)) {
        showToast("Has iniciado sesión, pero esta cuenta todavía no tiene acceso a Base Camp.", "warning");
      }
    } catch (error) {
      if (error?.code !== "auth/popup-closed-by-user") {
        console.error(error);
        showToast("No se pudo iniciar sesión con Google. Inténtalo de nuevo.", "error");
      }
    } finally {
      button.disabled = false;
      button.querySelector("span").textContent = "Acceder";
    }
  });
}

function renderSignedIn(host, user) {
  const allowed = isAuthorized(user);
  const name = user.displayName || user.email || "Usuario";
  const avatar = user.photoURL
    ? `<img src="${escapeHtml(user.photoURL)}" alt="">`
    : `<span>${escapeHtml(initials(user))}</span>`;

  host.innerHTML = `
    <details class="auth-menu">
      <summary class="auth-user-button" aria-label="Abrir menú de usuario">
        <span class="auth-avatar">${avatar}</span>
        <span class="auth-user-label">${allowed ? "Base Camp" : escapeHtml(name.split(" ")[0])}</span>
        <span class="auth-chevron" aria-hidden="true">⌄</span>
      </summary>
      <div class="auth-popover">
        <div class="auth-identity">
          <strong>${escapeHtml(name)}</strong>
          <span>${escapeHtml(user.email)}</span>
        </div>
        ${allowed
          ? `<a class="auth-basecamp-link" href="base-camp.html">🏕 Ir a Base Camp</a>`
          : `<p class="auth-access-note">Esta cuenta no tiene acceso a Base Camp.</p>`}
        <button class="auth-signout-button" type="button" data-auth-signout>Cerrar sesión</button>
      </div>
    </details>
  `;

  host.querySelector("[data-auth-signout]")?.addEventListener("click", async () => {
    try {
      await signOutCurrentUser();
      showToast("Sesión cerrada.");
    } catch (error) {
      console.error(error);
      showToast("No se pudo cerrar la sesión.", "error");
    }
  });
}

function addBaseCampToMobile(user) {
  const mobileNav = document.querySelector(".mobile-nav");
  if (!mobileNav) return;
  mobileNav.querySelector("[data-mobile-basecamp]")?.remove();
  if (!isAuthorized(user)) return;

  const link = document.createElement("a");
  link.href = "base-camp.html";
  link.dataset.mobileBasecamp = "true";
  link.innerHTML = `<span class="nav-icon" aria-hidden="true">🏕</span>Base Camp`;
  mobileNav.appendChild(link);
}

const host = ensureAuthHost();
if (host) {
  host.innerHTML = `<span class="auth-loading" aria-label="Comprobando sesión"></span>`;
  observeAuth((user) => {
    if (user) renderSignedIn(host, user);
    else renderSignedOut(host);
    addBaseCampToMobile(user);
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".auth-menu")) closeMenus();
  });
}
