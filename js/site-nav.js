
const ICONS = {
  "Inicio": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>`,
  "Progreso": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></svg>`,
  "Mapa": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15"/><path d="M15 6v15"/></svg>`,
  "Viajes": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19 9 8l3 5 3-8 5 14Z"/><path d="M2 19h20"/></svg>`,
  "Cumbres": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2 20 7-13 4 7 3-5 6 11Z"/><path d="m7 11 2-4 2 4"/></svg>`,
  "Personas": `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 20c0-4 2.6-7 6-7s6 3 6 7"/><path d="M14 15c.8-.7 1.8-1 3-1 2.5 0 4 2.2 4 5"/></svg>`,
  "GR11": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18c4-7 7-10 10-9 3 1 4 6 8 2"/><path d="M4 5h5v5"/><path d="M15 16h6v5"/></svg>`
};

function labelFor(anchor) {
  return anchor.textContent.trim();
}

function addIcons(nav) {
  nav.querySelectorAll("a").forEach((anchor) => {
    const label = labelFor(anchor);
    if (!ICONS[label] || anchor.querySelector("svg")) return;
    anchor.insertAdjacentHTML("afterbegin", `<span class="nav-icon">${ICONS[label]}</span>`);
  });
}

function closeMenu() {
  document.body.classList.remove("mobile-menu-open");
  document.querySelector(".mobile-menu-toggle")?.setAttribute("aria-expanded", "false");
}

function createMobileNavigation() {
  const header = document.querySelector(".site-header");
  const desktopNav = header?.querySelector("nav");
  if (!header || !desktopNav || document.querySelector(".mobile-menu-toggle")) return;

  addIcons(desktopNav);

  const toggle = document.createElement("button");
  toggle.className = "mobile-menu-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-label", "Abrir menú");
  toggle.setAttribute("aria-expanded", "false");
  toggle.innerHTML = `
    <span></span><span></span><span></span>
  `;

  const overlay = document.createElement("div");
  overlay.className = "mobile-menu-overlay";
  overlay.setAttribute("aria-hidden", "true");

  const drawer = document.createElement("aside");
  drawer.className = "mobile-menu-drawer";
  drawer.setAttribute("aria-label", "Menú móvil");
  drawer.innerHTML = `
    <div class="mobile-menu-head">
      <div>
        <span class="mobile-menu-kicker">Archivo personal</span>
        <strong>Los Tresmiles<br>de Iñaki</strong>
      </div>
      <button class="mobile-menu-close" type="button" aria-label="Cerrar menú">×</button>
    </div>
    <nav class="mobile-nav">${desktopNav.innerHTML}</nav>
    <div class="mobile-menu-foot">
      <span>Montañas, viajes y recuerdos.</span>
    </div>
  `;

  header.appendChild(toggle);
  document.body.append(overlay, drawer);

  addIcons(drawer.querySelector("nav"));

  toggle.addEventListener("click", () => {
    const opening = !document.body.classList.contains("mobile-menu-open");
    document.body.classList.toggle("mobile-menu-open", opening);
    toggle.setAttribute("aria-expanded", String(opening));
  });

  overlay.addEventListener("click", closeMenu);
  drawer.querySelector(".mobile-menu-close").addEventListener("click", closeMenu);
  drawer.querySelectorAll("a").forEach((anchor) => anchor.addEventListener("click", closeMenu));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
}

createMobileNavigation();
