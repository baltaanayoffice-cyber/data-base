// auth.js — login y registro
import { login, register, isLoggedIn } from "./service.js";
import { navigate } from "./main.js";

export function renderAuth(root) {
  if (isLoggedIn()) { navigate("/"); return; }

  let mode = "login";

  function draw() {
    root.innerHTML = `
      <div class="auth-wrap">
        <h1>${mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</h1>
        <form id="auth-form">
          ${mode === "register" ? `
            <div class="field">
              <label>Nombre</label>
              <input name="name" required autocomplete="name" />
            </div>` : ""}
          <div class="field">
            <label>Email</label>
            <input name="email" type="email" required autocomplete="email" />
          </div>
          <div class="field">
            <label>Contraseña</label>
            <input name="password" type="password" required minlength="6" autocomplete="${mode === "login" ? "current-password" : "new-password"}" />
          </div>
          <button type="submit" class="btn-primary">${mode === "login" ? "Entrar" : "Registrarme"}</button>
          <div id="msg"></div>
        </form>
        <div class="auth-toggle">
          ${mode === "login"
            ? `¿No tienes cuenta? <a href="#" id="toggle">Regístrate</a>`
            : `¿Ya tienes cuenta? <a href="#" id="toggle">Inicia sesión</a>`}
        </div>
      </div>`;
    root.querySelector("#toggle").onclick = (e) => {
      e.preventDefault();
      mode = mode === "login" ? "register" : "login";
      draw();
    };
    root.querySelector("#auth-form").onsubmit = async (e) => {
      e.preventDefault();
      const msg = root.querySelector("#msg");
      msg.className = ""; msg.textContent = "Enviando…";
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd.entries());
      try {
        if (mode === "login") await login(data);
        else await register(data);
        msg.className = "success";
        msg.textContent = "¡Listo!";
        setTimeout(() => navigate("/"), 400);
      } catch (err) {
        msg.className = "error";
        msg.textContent = err.message;
      }
    };
  }
  draw();
}
