// history.js — historial de reproducciones
import { loadEpisodes, getCurrentUser, isLoggedIn } from "./service.js";
import { escapeHtml } from "./utils.js";
import { navigate } from "./main.js";

export async function renderHistory(root) {
  if (!isLoggedIn()) { navigate("/auth"); return; }
  const u = getCurrentUser();
  const eps = await loadEpisodes();
  const byId = Object.fromEntries(eps.map(e => [String(e.id), e]));
  const history = (u.history || []).slice().reverse(); // más reciente primero

  if (!history.length) {
    root.innerHTML = `<div class="empty"><h2>Sin historial</h2><p>Los episodios que veas aparecerán aquí.</p></div>`;
    return;
  }

  root.innerHTML = `
    <h1 class="feed-title">Historial de reproducciones</h1>
    <div class="feed-grid">
      ${history.map(h => {
        const e = byId[String(h.id)];
        if (!e) return "";
        return `
          <a class="card" href="/show/${encodeURIComponent(e.slug)}" data-link>
            <div class="cover" ${e.cover ? `style="background-image:url('${escapeHtml(e.cover)}')"` : ""}></div>
            <div class="info">
              <div class="title">${escapeHtml(e.title)}</div>
              <div class="type">${new Date(h.at).toLocaleString()}</div>
            </div>
          </a>`;
      }).join("")}
    </div>`;
}
