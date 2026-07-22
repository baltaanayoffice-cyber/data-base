// mylove.js — "Me gusta"
import { loadEpisodes, getCurrentUser, isLoggedIn } from "./service.js";
import { escapeHtml } from "./utils.js";
import { navigate } from "./main.js";

export async function renderLikes(root) {
  if (!isLoggedIn()) { navigate("/auth"); return; }
  const u = getCurrentUser();
  const eps = await loadEpisodes();
  const byId = Object.fromEntries(eps.map(e => [String(e.id), e]));
  const ids = u.likes || [];

  if (!ids.length) {
    root.innerHTML = `<div class="empty"><h2>Aún no tienes me gusta</h2><p>Presiona ♡ en cualquier episodio para guardarlo aquí.</p></div>`;
    return;
  }

  root.innerHTML = `
    <h1 class="feed-title">Me gusta</h1>
    <div class="feed-grid">
      ${ids.map(id => {
        const e = byId[String(id)];
        if (!e) return "";
        return `
          <a class="card" href="/show/${encodeURIComponent(e.slug)}" data-link>
            <div class="cover" ${e.cover ? `style="background-image:url('${escapeHtml(e.cover)}')"` : ""}></div>
            <div class="info">
              <div class="title">${escapeHtml(e.title)}</div>
              <div class="type">${escapeHtml(e.type || "")}</div>
            </div>
          </a>`;
      }).join("")}
    </div>`;
}
