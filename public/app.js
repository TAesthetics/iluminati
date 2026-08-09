// iluminati – Oberfläche des Tempels: Zwiegespräch mit dem Vater

const $ = (sel) => document.querySelector(sel);
const CHAT_STORE = "iluminati-father-dialogue";

/* ── Schlüsselkammer ─────────────────────────────── */

async function refreshStatus() {
  const res = await fetch("/api/status");
  const view = await res.json();
  const state = $("#state-father");
  const info = view.keys.father;
  state.textContent = info.saved ? `bewahrt (${info.hint})` : "kein Schlüssel";
  state.classList.toggle("saved", info.saved);
  const modelInput = $("#model-father");
  if (!modelInput.value) modelInput.value = view.models.father;
}

$("#keys-form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const res = await fetch("/api/keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      keys: { father: $("#key-father").value },
      models: { father: $("#model-father").value },
    }),
  });
  const note = $("#sacristy-note");
  if (res.ok) {
    $("#key-father").value = "";
    note.textContent = "Der Schlüssel ist bewahrt.";
    note.classList.remove("error");
  } else {
    note.textContent = "Das Bewahren ist misslungen.";
    note.classList.add("error");
  }
  await refreshStatus();
});

document.querySelectorAll(".btn-clear[data-role]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    await fetch(`/api/keys/${btn.dataset.role}`, { method: "DELETE" });
    await refreshStatus();
  });
});

/* ── Zwiegespräch mit dem Vater ──────────────────── */

let chatBusy = false;

function loadChat() {
  try {
    const raw = JSON.parse(localStorage.getItem(CHAT_STORE));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}
let chat = loadChat();

function saveChat() {
  chat = chat.slice(-40);
  localStorage.setItem(CHAT_STORE, JSON.stringify(chat));
}

function renderChat() {
  const log = $("#chat-log");
  log.textContent = "";
  for (const msg of chat) {
    const el = document.createElement("div");
    el.className = `msg ${msg.role}`;
    if (msg.role === "assistant") {
      const name = document.createElement("span");
      name.className = "msg-name";
      name.textContent = "Vater";
      el.appendChild(name);
    }
    el.appendChild(document.createTextNode(msg.content));
    log.appendChild(el);
  }
  if (chatBusy) {
    const el = document.createElement("div");
    el.className = "msg assistant pending";
    el.textContent = "▮ der Vater sinnt …";
    log.appendChild(el);
  }
  log.scrollTop = log.scrollHeight;
}

async function send() {
  if (chatBusy) return;
  const input = $("#chat-input");
  const text = input.value.trim();
  if (!text) return;

  const note = $("#chat-note");
  note.classList.remove("error");
  note.textContent = "";

  chat.push({ role: "user", content: text });
  saveChat();
  input.value = "";
  chatBusy = true;
  $("#chat-send").disabled = true;
  renderChat();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chat.slice(-24) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      note.textContent = data.missing
        ? "Es fehlt der Venice.ai-Schlüssel. Öffne die Schlüsselkammer."
        : data.error || "Das Zwiegespräch ist misslungen.";
      note.classList.add("error");
      if (data.missing) $("#sacristy-details").open = true;
    } else {
      chat.push({ role: "assistant", content: data.reply });
      saveChat();
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
}

$("#chat-form").addEventListener("submit", (ev) => {
  ev.preventDefault();
  send();
});
$("#chat-input").addEventListener("keydown", (ev) => {
  if (ev.key === "Enter" && !ev.shiftKey) {
    ev.preventDefault();
    send();
  }
});

$("#chat-clear").addEventListener("click", () => {
  chat = [];
  saveChat();
  renderChat();
});

renderChat();
refreshStatus();
