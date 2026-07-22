// feed.js — vista principal (grid de episodios)
import { loadEpisodes, accessFor, getCurrentUser, isLoggedIn } from "./service.js";
import { escapeHtml, pickSimilar, shuffle } from "./utils.js";

function cardHTML(e) {
  const access = accessFor(e);
  const isPremium = (e.access || "").toLowerCase() === "premium";
  const badge = isPremium
    ? `<span class="badge premium">Premium</span>`
    : `<span class="badge">Gratis</span>`;
  const lock = access === "premium-required"
    ? `<div class="lock">🔒</div>`
    : "";
  const cover = e.cover
    ? `style="background-image:url('${escapeHtml(e.cover)}')"`
    : "";
  return `
    <a class="card" href="/show/${encodeURIComponent(e.slug)}" data-link>
      <div class="cover" ${cover}>
        ${badge}
        ${lock}
      </div>
      <div class="info">
        <div class="title">${escapeHtml(e.title)}</div>
        <div class="type">${escapeHtml(e.type || "episodio")}</div>
      </div>
    </a>`;
}

function sectionHTML(title, items) {
  if (!items.length) return "";
  return `
    <section class="feed-section">
      <h2 class="feed-title">${escapeHtml(title)}</h2>
      <div class="feed-grid">
        ${items.map(cardHTML).join("")}
      </div>
    </section>`;
}

export async function renderFeed(root) {
  const episodes = await loadEpisodes();
  const user = getCurrentUser();

  if (!episodes.length) {
    root.innerHTML = `<div class="empty">Aún no hay episodios. Agrega algunos en tu Google Sheet.</div>`;
    return;
  }

  let html = "";

  if (!isLoggedIn()) {
    // Usuario no logueado: destacar gratis primero, luego todo el resto
    const free = episodes.filter(e => (e.access || "").toLowerCase() !== "premium");
    html += sectionHTML("Contenido gratis", shuffle(free).slice(0, 12));
    html += sectionHTML("Todos los episodios", episodes);
  } else if (user) {
    const tagsById = {};
    episodes.forEach(e => tagsById[e.id] = (e.tags || "").split(",").map(s => s.trim()).filter(Boolean));
    const liked = (user.likes || []);
    const similar = pickSimilar(episodes, liked, tagsById, 12);

    if (liked.length > 0) {
      html += sectionHTML("Recomendado para ti", similar);
    }
    html += sectionHTML("Novedades", shuffle(episodes).slice(0, 12));
    html += sectionHTML("Todos los episodios", episodes);
  }

  root.innerHTML = html;
}
