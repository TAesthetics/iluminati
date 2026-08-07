// iluminati – Oberfläche des Tempels

const ROLES = ["father", "son", "spirit"];
const $ = (sel) => document.querySelector(sel);

const stageEl = (role) => $(`#stage-${role}`);
const bodyEl = (role) => stageEl(role).querySelector(".stage-body");

/* ── Schlüsselkammer ─────────────────────────────── */

async function refreshStatus() {
  const res = await fetch("/api/status");
  const view = await res.json();
  for (const role of ROLES) {
    const state = $(`#state-${role}`);
    const info = view.keys[role];
    state.textContent = info.saved ? `bewahrt (${info.hint})` : "kein Schlüssel";
    state.classList.toggle("saved", info.saved);
    const modelInput = $(`#model-${role}`);
    if (!modelInput.value) modelInput.value = view.models[role];
  }
  return view;
}

$("#keys-form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const payload = { keys: {}, models: {} };
  for (const role of ROLES) {
    payload.keys[role] = $(`#key-${role}`).value;
    payload.models[role] = $(`#model-${role}`).value;
  }
  const res = await fetch("/api/keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const note = $("#sacristy-note");
  if (res.ok) {
    for (const role of ROLES) $(`#key-${role}`).value = "";
    note.textContent = "Die Schlüssel sind bewahrt.";
    note.classList.remove("error");
  } else {
    note.textContent = "Das Bewahren ist misslungen.";
    note.classList.add("error");
  }
  await refreshStatus();
});

document.querySelectorAll(".btn-clear").forEach((btn) => {
  btn.addEventListener("click", async () => {
    await fetch(`/api/keys/${btn.dataset.role}`, { method: "DELETE" });
    await refreshStatus();
  });
});

/* ── Anrufung der Trinität ───────────────────────── */

function resetStages() {
  for (const role of ROLES) {
    stageEl(role).dataset.state = "idle";
    bodyEl(role).textContent = "";
  }
}

async function invoke() {
  const query = $("#query").value.trim();
  const note = $("#altar-note");
  note.classList.remove("error");
  note.textContent = "";
  if (!query) {
    note.textContent = "Sprich zuerst dein Anliegen.";
    return;
  }

  const button = $("#invoke");
  button.disabled = true;
  resetStages();
  note.textContent = "Die Trinität ist angerufen …";

  try {
    const res = await fetch("/api/invoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      note.textContent = err.missing
        ? `Es fehlen Schlüssel für: ${err.missing.join(", ")}. Öffne die Schlüsselkammer.`
        : err.error || "Die Anrufung ist misslungen.";
      note.classList.add("error");
      if (err.missing) $("#sacristy-details").open = true;
      return;
    }

    // NDJSON-Strom lesen: eine JSON-Zeile pro Ereignis.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let currentRole = null;

    const handle = (event) => {
      if (event.type === "stage") {
        currentRole = event.role;
        if (event.phase === "start") {
          stageEl(event.role).dataset.state = "working";
        } else if (event.phase === "done") {
          stageEl(event.role).dataset.state = "done";
          bodyEl(event.role).textContent = event.text;
        } else if (event.phase === "error") {
          // Eine Instanz fiel aus – die übrigen sprechen dennoch weiter.
          stageEl(event.role).dataset.state = "error";
          bodyEl(event.role).textContent = event.text;
        }
      } else if (event.type === "error") {
        if (currentRole) stageEl(currentRole).dataset.state = "error";
        note.textContent = event.message;
        note.classList.add("error");
      } else if (event.type === "done") {
        note.textContent = "Die Trinität hat gesprochen.";
      }
    };

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (line.trim()) handle(JSON.parse(line));
      }
    }
    if (buffer.trim()) handle(JSON.parse(buffer));
  } catch (err) {
    note.textContent = `Die Verbindung zum Tempel riss ab: ${err.message}`;
    note.classList.add("error");
  } finally {
    button.disabled = false;
  }
}

$("#invoke").addEventListener("click", invoke);
$("#query").addEventListener("keydown", (ev) => {
  if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) invoke();
});

/* ── Zwiegespräch ────────────────────────────────── */

const NAMES = { father: "Vater", son: "Sohn", spirit: "Heiliger Geist" };
const NAMES_DATIVE = { father: "den Vater", son: "den Sohn", spirit: "den Heiligen Geist" };
const CHAT_STORE = "iluminati-dialogues";

let chatRole = "father";
let chatBusy = false;

function loadChats() {
  try {
    const raw = JSON.parse(localStorage.getItem(CHAT_STORE)) || {};
    for (const role of ROLES) if (!Array.isArray(raw[role])) raw[role] = [];
    return raw;
  } catch {
    return { father: [], son: [], spirit: [] };
  }
}
const chats = loadChats();

function saveChats() {
  for (const role of ROLES) chats[role] = chats[role].slice(-40);
  localStorage.setItem(CHAT_STORE, JSON.stringify(chats));
}

function renderChat() {
  const log = $("#chat-log");
  log.textContent = "";
  for (const msg of chats[chatRole]) {
    const el = document.createElement("div");
    el.className = `msg ${msg.role}`;
    if (msg.role === "assistant") {
      const name = document.createElement("span");
      name.className = "msg-name";
      name.textContent = NAMES[chatRole];
      el.appendChild(name);
    }
    el.appendChild(document.createTextNode(msg.content));
    log.appendChild(el);
  }
  if (chatBusy) {
    const el = document.createElement("div");
    el.className = "msg assistant pending";
    el.textContent = `${NAMES[chatRole]} sinnt …`;
    log.appendChild(el);
  }
  log.scrollTop = log.scrollHeight;
}

function switchChat(role) {
  chatRole = role;
  document.querySelectorAll(".dialogue .tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.role === role);
  });
  $("#chat-input").placeholder = `Dein Wort an ${NAMES_DATIVE[role]} …`;
  $("#chat-note").textContent = "";
  renderChat();
}

document.querySelectorAll(".dialogue .tab").forEach((tab) => {
  tab.addEventListener("click", () => switchChat(tab.dataset.role));
});

$("#chat-form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if (chatBusy) return;
  const input = $("#chat-input");
  const text = input.value.trim();
  if (!text) return;

  const role = chatRole;
  const note = $("#chat-note");
  note.classList.remove("error");
  note.textContent = "";

  chats[role].push({ role: "user", content: text });
  saveChats();
  input.value = "";
  chatBusy = true;
  $("#chat-send").disabled = true;
  renderChat();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, messages: chats[role].slice(-24) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      note.textContent = data.missing
        ? `Es fehlt der Schlüssel für: ${data.missing.join(", ")}. Öffne die Schlüsselkammer.`
        : data.error || "Das Zwiegespräch ist misslungen.";
      note.classList.add("error");
      if (data.missing) $("#sacristy-details").open = true;
    } else {
      chats[role].push({ role: "assistant", content: data.reply });
      saveChats();
    }
  } catch (err) {
    note.textContent = `Die Verbindung zum Tempel riss ab: ${err.message}`;
    note.classList.add("error");
  } finally {
    chatBusy = false;
    $("#chat-send").disabled = false;
    renderChat();
    $("#chat-input").focus();
  }
});

$("#chat-clear").addEventListener("click", () => {
  chats[chatRole] = [];
  saveChats();
  renderChat();
});

switchChat("father");
refreshStatus();
