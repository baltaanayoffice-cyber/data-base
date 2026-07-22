// service.js — capa entre el frontend y el backend (Google Apps Script)
// PASO REQUERIDO: pega aquí la URL de tu Web App de Apps Script tras el deploy.
export const API_URL = "PEGA_AQUI_LA_URL_DE_TU_APPS_SCRIPT";

import { slugify } from "./utils.js";

const SESSION_KEY = "episodios.session";

function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
  catch { return null; }
}
function setSession(s) {
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else localStorage.removeItem(SESSION_KEY);
}

async function api(action, payload = {}) {
  if (!API_URL || API_URL.startsWith("PEGA_")) {
    throw new Error("Configura API_URL en js/service.js con la URL de tu Google Apps Script.");
  }
  const session = getSession();
  const body = JSON.stringify({
    action,
    userId: session?.userId || null,
    token: session?.token || null,
    ...payload,
  });
  const res = await fetch(API_URL, {
    method: "POST",
    // text/plain evita el preflight CORS
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error("Respuesta inválida: " + text.slice(0, 200)); }
  if (!data.ok) throw new Error(data.error || "Error del servidor");
  return data.data;
}

// ==== Cache en memoria de la sesión de usuario ====
let currentUser = null;
let episodesCache = null;

export function isLoggedIn() { return !!getSession(); }
export function getCurrentUser() { return currentUser; }
export function isPremium() { return !!(currentUser && currentUser.premium); }

export async function refreshCurrentUser() {
  if (!getSession()) { currentUser = null; return null; }
  try {
    currentUser = await api("getUser");
    return currentUser;
  } catch (e) {
    console.warn("Sesión inválida, cerrando:", e.message);
    setSession(null);
    currentUser = null;
    return null;
  }
}

export async function loadEpisodes(force = false) {
  if (episodesCache && !force) return episodesCache;
  const list = await api("getEpisodes");
  // Normaliza: genera slug si falta
  list.forEach(e => {
    if (!e.slug || !e.slug.trim()) e.slug = slugify(e.title) + "-" + e.id;
  });
  episodesCache = list;
  return list;
}

export async function getEpisodeBySlug(slug) {
  const list = await loadEpisodes();
  return list.find(e => e.slug === slug || String(e.id) === String(slug));
}

// ==== Autenticación ====
export async function register({ name, email, password }) {
  const { user, token } = await api("register", { name, email, password });
  setSession({ userId: user.id, token });
  currentUser = user;
  return user;
}
export async function login({ email, password }) {
  const { user, token } = await api("login", { email, password });
  setSession({ userId: user.id, token });
  currentUser = user;
  return user;
}
export function logout() {
  setSession(null);
  currentUser = null;
}

// ==== Acciones de usuario ====
export async function toggleLike(episodeId) {
  const user = await api("toggleLike", { episodeId });
  currentUser = user;
  return user;
}
export async function toggleList(episodeId) {
  const user = await api("toggleList", { episodeId });
  currentUser = user;
  return user;
}
export async function addHistory(episodeId) {
  const user = await api("addHistory", { episodeId });
  currentUser = user;
  return user;
}
export async function setPremium(value) {
  const user = await api("setPremium", { value: !!value });
  currentUser = user;
  return user;
}

// ==== Reglas de acceso ====
// Devuelve: "open" (puede ver), "login-required" (mandar a /auth),
// "premium-required" (mostrar candado con CTA)
export function accessFor(episode) {
  const access = (episode.access || "free").toLowerCase();
  if (access !== "premium") {
    return isLoggedIn() ? "open" : "login-required";
  }
  // premium
  if (!isLoggedIn()) return "login-required";
  if (!isPremium()) return "premium-required";
  return "open";
}
