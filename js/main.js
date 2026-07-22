// main.js — router y bootstrap
import { refreshCurrentUser, getCurrentUser, isLoggedIn, logout } from "./service.js";
import { renderFeed } from "./feed.js";
import { renderShow } from "./show.js";
import { renderAuth } from "./auth.js";
import { renderUser } from "./user.js";
import { renderHistory } from "./history.js";
import { renderList } from "./list.js";
import { renderLikes } from "./mylove.js";

const app = document.getElementById("app");

// Interceptar todos los enlaces internos para hacer routing SPA (URLs limpias sin #)
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-link], a[href^='/']");
  if (!a) return;
  const url = new URL(a.href, location.origin);
  if (url.origin !== location.origin) return;
  if (a.target === "_blank") return;
  e.preventDefault();
  navigate(url.pathname + url.search);
});

window.addEventListener("popstate", () => render());

export function navigate(path) {
  if (location.pathname + location.search !== path) {
    history.pushState({}, "", path);
  }
  render();
}

function updateUserMenu() {
  const el = document.getElementById("user-menu");
  if (!el) return;
  const u = getCurrentUser();
  if (u) {
    el.innerHTML = `
      <a href="/${u.username}" data-link class="username">${u.username}</a>
      <button id="logout-btn" class="btn">Salir</button>
    `;
    el.querySelector("#logout-btn").onclick = () => {
      logout();
      updateUserMenu();
      navigate("/");
    };
  } else {
    el.innerHTML = `<a href="/auth" data-link class="btn">Iniciar sesión</a>`;
  }
}

function updateActiveTab() {
  document.querySelectorAll(".tabs a").forEach(a => {
    const path = new URL(a.href).pathname;
    a.classList.toggle("active", path === location.pathname);
  });
}

async function render() {
  app.innerHTML = `<div class="loading">Cargando…</div>`;
  updateActiveTab();
  updateUserMenu();

  const path = location.pathname;

  try {
    // Perfil de usuario: /@username
    if (path.startsWith("/@")) {
      const username = decodeURIComponent(path.slice(1));
      return renderUser(app, username);
    }

    if (path === "/" || path === "") return renderFeed(app);
    if (path === "/auth") return renderAuth(app);
    if (path === "/list") return renderList(app);
    if (path === "/likes") return renderLikes(app);
    if (path === "/history") return renderHistory(app);
    if (path.startsWith("/show/")) {
      const slug = decodeURIComponent(path.slice("/show/".length));
      return renderShow(app, slug);
    }

    // 404
    app.innerHTML = `
      <div class="empty">
        <h2>Página no encontrada</h2>
        <p>La URL <code>${path}</code> no existe.</p>
        <p style="margin-top:16px"><a href="/" data-link class="btn-primary">Volver al inicio</a></p>
      </div>`;
  } catch (err) {
    console.error(err);
    app.innerHTML = `<div class="empty"><h2>Ocurrió un error</h2><p>${err.message}</p></div>`;
  }
}

// Bootstrap
(async function init() {
  document.getElementById("year").textContent = new Date().getFullYear();
  if (isLoggedIn()) {
    await refreshCurrentUser();
  }
  render();
  // Re-render user menu after data loads
  updateUserMenu();
})();
