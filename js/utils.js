// utils.js — helpers
export function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "episodio";
}

export function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstChild;
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickSimilar(episodes, likedIds, tagsById, limit = 12) {
  const likedTags = new Set();
  likedIds.forEach(id => (tagsById[id] || []).forEach(t => likedTags.add(t)));
  const scored = episodes
    .filter(e => !likedIds.includes(e.id))
    .map(e => {
      const t = (e.tags || "").split(",").map(s => s.trim()).filter(Boolean);
      const score = t.filter(x => likedTags.has(x)).length;
      return { e, score };
    })
    .sort((a, b) => b.score - a.score);
  const withScore = scored.filter(s => s.score > 0).slice(0, limit).map(s => s.e);
  if (withScore.length >= limit) return withScore;
  const rest = shuffle(scored.filter(s => s.score === 0).map(s => s.e)).slice(0, limit - withScore.length);
  return [...withScore, ...rest];
}
