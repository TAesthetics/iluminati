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

refreshStatus();
