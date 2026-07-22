// user.js — perfil del usuario /@username
import { getCurrentUser, isLoggedIn, setPremium } from "./service.js";
import { escapeHtml } from "./utils.js";
import { navigate } from "./main.js";

export function renderUser(root, username) {
  if (!isLoggedIn()) { navigate("/auth"); return; }
  const u = getCurrentUser();
  if (!u) { root.innerHTML = `<div class="loading">Cargando perfil…</div>`; return; }
  if (u.username !== username) {
    root.innerHTML = `
      <div class="empty">
        <h2>Perfil no disponible</h2>
        <p>Solo puedes ver tu propio perfil.</p>
        <a href="/${u.username}" data-link class="btn-primary">Ir a mi perfil</a>
      </div>`;
    return;
  }

  const initial = (u.name || "?").trim().charAt(0).toUpperCase();

  root.innerHTML = `
    <div class="profile">
      <div class="header">
        <div class="avatar">${escapeHtml(initial)}</div>
        <h1>${escapeHtml(u.name)}</h1>
        <div class="username">${escapeHtml(u.username)}</div>
        <div style="color:var(--muted);font-size:14px;margin-top:6px">${escapeHtml(u.email)}</div>
        <div class="stat-row">
          <div class="stat"><b>${(u.likes||[]).length}</b> Me gusta</div>
          <div class="stat"><b>${(u.list||[]).length}</b> En mi lista</div>
          <div class="stat"><b>${(u.history||[]).length}</b> Reproducidos</div>
        </div>
      </div>

      <div class="header">
        <h2 style="margin-bottom:10px">Membresía</h2>
        ${u.premium
          ? `<p style="color:var(--gold);font-weight:600;margin-bottom:12px">★ Premium activo</p>
             <button id="downgrade" class="btn-primary">Cancelar premium</button>`
          : `<p style="color:var(--muted);margin-bottom:12px">Estás en el plan gratis. Hazte premium para acceder a todo el contenido exclusivo.</p>
             <button id="upgrade" class="btn-gold">Hazte premium</button>`}
      </div>
    </div>
  `;

  const up = root.querySelector("#upgrade");
  const down = root.querySelector("#downgrade");
  if (up) up.onclick = async () => { up.disabled = true; await setPremium(true); renderUser(root, username); };
  if (down) down.onclick = async () => { down.disabled = true; await setPremium(false); renderUser(root, username); };
}
