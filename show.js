// show.js — vista de un episodio, adaptada al tipo
import {
  getEpisodeBySlug, accessFor, isLoggedIn, getCurrentUser,
  toggleLike, toggleList, addHistory
} from "./service.js";
import { escapeHtml } from "./utils.js";
import { navigate } from "./main.js";

function actionsHTML(ep, user) {
  if (!user) return "";
  const liked = (user.likes || []).includes(ep.id);
  const inList = (user.list || []).includes(ep.id);
  return `
    <div class="show-actions">
      <button id="btn-like" class="${liked ? "active" : ""}">${liked ? "♥ Te gusta" : "♡ Me gusta"}</button>
      <button id="btn-list" class="${inList ? "active" : ""}">${inList ? "✓ En mi lista" : "+ Mi lista"}</button>
    </div>`;
}

function wireActions(ep, root) {
  const like = root.querySelector("#btn-like");
  const list = root.querySelector("#btn-list");
  if (like) like.onclick = async () => {
    like.disabled = true;
    try { await toggleLike(ep.id); renderInto(root, ep); } finally { like.disabled = false; }
  };
  if (list) list.onclick = async () => {
    list.disabled = true;
    try { await toggleList(ep.id); renderInto(root, ep); } finally { list.disabled = false; }
  };
}

function playerHTML(ep) {
  const type = (ep.type || "video").toLowerCase();
  const media = ep.media || "";
  if (type === "video") {
    return `<video controls poster="${escapeHtml(ep.cover || "")}" src="${escapeHtml(media)}"></video>`;
  }
  if (type === "audio") {
    return `
      ${ep.cover ? `<img src="${escapeHtml(ep.cover)}" alt="" style="width:100%;max-height:340px;object-fit:cover;border-radius:12px;margin-bottom:12px" />` : ""}
      <audio controls src="${escapeHtml(media)}" style="width:100%"></audio>`;
  }
  if (type === "images") {
    const urls = media.split("|").map(s => s.trim()).filter(Boolean);
    if (!urls.length) return `<div class="empty">Sin imágenes.</div>`;
    return `
      <div class="book" id="book" data-total="${urls.length}" data-current="0">
        <div class="page" id="page-current" style="background-image:url('${escapeHtml(urls[0])}')"></div>
        <button class="nav prev" id="prev">‹</button>
        <button class="nav next" id="next">›</button>
        <div class="counter"><span id="counter">1</span> / ${urls.length}</div>
      </div>
      <script type="application/json" id="book-data">${JSON.stringify(urls)}</script>
    `;
  }
  return `<a href="${escapeHtml(media)}" class="btn-primary" target="_blank" rel="noopener">Descargar / Abrir archivo</a>`;
}

function wireBook(root) {
  const book = root.querySelector("#book");
  if (!book) return;
  const data = JSON.parse(root.querySelector("#book-data").textContent);
  const page = root.querySelector("#page-current");
  const counter = root.querySelector("#counter");
  let idx = 0;
  function go(delta) {
    const next = idx + delta;
    if (next < 0 || next >= data.length) return;
    page.classList.add("turning");
    setTimeout(() => {
      idx = next;
      page.style.backgroundImage = `url('${data[idx]}')`;
      page.classList.remove("turning");
      counter.textContent = idx + 1;
    }, 350);
  }
  root.querySelector("#prev").onclick = () => go(-1);
  root.querySelector("#next").onclick = () => go(1);
  document.onkeydown = (e) => {
    if (e.key === "ArrowLeft") go(-1);
    if (e.key === "ArrowRight") go(1);
  };
}

function renderInto(root, ep) {
  const user = getCurrentUser();
  const access = accessFor(ep);

  let body;
  if (access === "login-required") {
    body = `
      <div class="premium-block">
        <div class="icon">🔐</div>
        <h2>Inicia sesión para ver este contenido</h2>
        <p>Regístrate gratis para acceder a los episodios.</p>
        <a href="/auth" data-link class="btn-primary">Iniciar sesión</a>
      </div>`;
  } else if (access === "premium-required") {
    body = `
      <div class="premium-block">
        <div class="icon">🔒</div>
        <h2>Contenido premium</h2>
        <p>Este episodio es exclusivo para miembros premium.</p>
        <a href="/${user.username}" data-link class="btn-gold">Hazte premium</a>
      </div>`;
  } else {
    body = playerHTML(ep);
    if (user) addHistory(ep.id).catch(() => {});
  }

  root.innerHTML = `
    <div class="show-wrap">
      <a href="/" data-link style="color:var(--muted);font-size:14px">← Volver</a>
      ${body}
      <h1>${escapeHtml(ep.title)}</h1>
      <div class="meta">
        <span>${escapeHtml((ep.type || "").toUpperCase())}</span>
        ${((ep.access || "").toLowerCase() === "premium") ? `<span style="color:var(--gold)">★ Premium</span>` : `<span>Gratis</span>`}
        ${ep.tags ? `<span>${escapeHtml(ep.tags)}</span>` : ""}
      </div>
      ${access === "open" ? actionsHTML(ep, user) : ""}
      <div class="desc">${escapeHtml(ep.description || "")}</div>
    </div>
  `;
  if (access === "open") {
    wireActions(ep, root);
    wireBook(root);
  }
}

export async function renderShow(root, slug) {
  const ep = await getEpisodeBySlug(slug);
  if (!ep) {
    root.innerHTML = `<div class="empty"><h2>Episodio no encontrado</h2><p><a href="/" data-link class="btn-primary">Volver</a></p></div>`;
    return;
  }
  renderInto(root, ep);
}
