import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const workspace = "C:/Users/jpbra/Documents/GitHub/Cofrin";
const assetDir = path.join(workspace, ".codex-build", "presentation-cofrin", "assets");
const profileDir = path.join(workspace, ".codex-build", "presentation-cofrin", "edge-capture-profile");
const port = 9226;
const edge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Falha ao acessar ${url}: ${response.status}`);
  return response.json();
}

async function connect(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  let id = 0;
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    if (message.error) entry.reject(new Error(message.error.message));
    else entry.resolve(message.result);
  });
  return {
    call(method, params = {}, sessionId) {
      const requestId = ++id;
      socket.send(JSON.stringify({ id: requestId, method, params, ...(sessionId ? { sessionId } : {}) }));
      return new Promise((resolve, reject) => pending.set(requestId, { resolve, reject }));
    },
    close() { socket.close(); },
  };
}

const login = await fetch("http://localhost:3001/api/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json", origin: "http://localhost:5173" },
  body: JSON.stringify({ email: "joao@cofrin.app", password: "CofrinDemo2026!" }),
});
if (!login.ok) throw new Error(`Não foi possível iniciar a sessão de captura: ${login.status}`);
const cookieHeader = login.headers.getSetCookie?.().find((cookie) => cookie.startsWith("cofrin_session=")) ?? login.headers.get("set-cookie");
const sessionToken = cookieHeader?.match(/cofrin_session=([^;]+)/)?.[1];
if (!sessionToken) throw new Error("Cookie de sessão não retornado pela aplicação.");

await fs.mkdir(profileDir, { recursive: true });
const browser = spawn(edge, [
  "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`,
  "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars", "about:blank",
], { stdio: "ignore" });

try {
  let version;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try { version = await fetchJson(`http://127.0.0.1:${port}/json/version`); break; } catch { await wait(150); }
  }
  if (!version) throw new Error("O navegador de captura não iniciou.");
  const browserProtocol = await connect(version.webSocketDebuggerUrl);
  const target = await browserProtocol.call("Target.createTarget", { url: "about:blank" });
  const attached = await browserProtocol.call("Target.attachToTarget", { targetId: target.targetId, flatten: true });
  const sessionId = attached.sessionId;
  await browserProtocol.call("Page.enable", {}, sessionId);
  await browserProtocol.call("Network.enable", {}, sessionId);
  await browserProtocol.call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
  await browserProtocol.call("Network.setCookie", { name: "cofrin_session", value: sessionToken, url: "http://localhost:5173/", httpOnly: true, sameSite: "Lax" }, sessionId);

  for (const [route, file] of [["/dashboard", "dashboard-current.png"], ["/transactions", "transactions-current.png"], ["/social", "social-current.png"]]) {
    await browserProtocol.call("Page.navigate", { url: `http://localhost:5173${route}` }, sessionId);
    await wait(900);
    const image = await browserProtocol.call("Page.captureScreenshot", { format: "png", fromSurface: true }, sessionId);
    await fs.writeFile(path.join(assetDir, file), Buffer.from(image.data, "base64"));
  }
  browserProtocol.close();
} finally {
  browser.kill();
}
