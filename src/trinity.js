// Die Trinität: drei Instanzen über drei Anbieter.
//
// Anrufung (Kette):
//   1. Vater          → Venice.ai  – analysiert die Anfrage grundlegend
//   2. Sohn           → xAI        – vertieft und prüft die Analyse des Vaters
//   3. Heiliger Geist → Gemini     – geht allein vom Vater aus und
//                                    synthetisiert die endgültige Antwort
//
// Sohn und Heiliger Geist gehen beide vom Vater aus und laufen daher
// parallel; fällt einer von beiden aus, vollendet der andere dennoch.
//
// Zwiegespräch: mit jeder Instanz kann außerdem einzeln gesprochen werden.
//
// Alle drei Anbieter werden über ihre OpenAI-kompatiblen
// Chat-Completions-Endpunkte angesprochen, daher genügt ein Client.

const PROVIDERS = {
  father: {
    name: "Vater",
    provider: "Venice.ai",
    url: "https://api.venice.ai/api/v1/chat/completions",
  },
  son: {
    name: "Sohn",
    provider: "xAI",
    url: "https://api.x.ai/v1/chat/completions",
  },
  spirit: {
    name: "Heiliger Geist",
    provider: "Gemini",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  },
};

export const STAGES = ["father", "son", "spirit"];

export function stageInfo(role) {
  return PROVIDERS[role];
}

async function complete(role, apiKey, model, messages, signal) {
  const { url, provider, name } = PROVIDERS[role];
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages }),
    });
  } catch (err) {
    throw new Error(`${name} (${provider}) ist nicht erreichbar: ${err.message}`);
  }
  if (!res.ok) {
    const body = (await res.text().catch(() => "")).slice(0, 400);
    throw new Error(
      `${name} (${provider}) antwortete mit HTTP ${res.status}${body ? `: ${body}` : ""}`
    );
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error(`${name} (${provider}) lieferte eine leere Antwort.`);
  }
  return content.trim();
}

/* ── Anrufung: die Kette ─────────────────────────────────────────── */

const PROMPT_FATHER = `Du bist der VATER, der Ursprung einer dreistufigen Trinität.
Deine Aufgabe: Analysiere die Anfrage des Suchenden grundlegend und strukturiert.
Erfasse ihren Kern, benenne die wesentlichen Aspekte, offene Fragen und mögliche
Herangehensweisen. Gib noch keine endgültige Antwort – dein Wort ist das Fundament,
von dem Sohn und Heiliger Geist ausgehen. Antworte in der Sprache der Anfrage,
klar und geordnet.`;

const PROMPT_SON = `Du bist der SOHN, die zweite Instanz einer dreistufigen Trinität.
Du gehst vom Vater aus: Du erhältst die ursprüngliche Anfrage des Suchenden sowie
die Analyse des Vaters. Deine Aufgabe: Vertiefe die Analyse und prüfe sie kritisch.
Korrigiere Fehler, ergänze Fehlendes, wäge Alternativen ab und arbeite die
tragfähigsten Gedanken heraus. Antworte in der Sprache der Anfrage.`;

const PROMPT_SPIRIT = `Du bist der HEILIGE GEIST, die dritte Instanz einer dreistufigen
Trinität. Du gehst allein vom Vater aus: Du erhältst die ursprüngliche Anfrage des
Suchenden und die Analyse des Vaters – nichts sonst.
Deine Aufgabe: Vollende daraus die endgültige Antwort an den Suchenden –
vollständig, klar und in sich geschlossen. Verweise nicht auf den internen Ablauf;
sprich den Suchenden direkt an. Antworte in der Sprache der Anfrage.`;

// Führt die Kette aus. onStage wird je Stufe gerufen mit
// (role, "start"), dann (role, "done", text) oder (role, "error", meldung).
// Sohn und Heiliger Geist gehen beide vom Wort des Vaters aus und laufen
// parallel; scheitert einer, läuft der andere dennoch zu Ende.
// Scheitert der Vater, scheitert die gesamte Anrufung.
export async function invokeTrinity(query, store, onStage, signal) {
  const results = {};
  const ask = (role, systemPrompt, userPrompt) =>
    complete(
      role,
      store.keys[role],
      store.models[role],
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      signal
    );

  onStage("father", "start");
  results.father = await ask("father", PROMPT_FATHER, `Anfrage des Suchenden:\n\n${query}`);
  onStage("father", "done", results.father);

  const fromFather = `Anfrage des Suchenden:\n\n${query}\n\n---\n\nAnalyse des Vaters:\n\n${results.father}`;

  const proceed = async (role, systemPrompt) => {
    onStage(role, "start");
    try {
      results[role] = await ask(role, systemPrompt, fromFather);
      onStage(role, "done", results[role]);
    } catch (err) {
      onStage(role, "error", err.message);
    }
  };

  await Promise.all([
    proceed("son", PROMPT_SON),
    proceed("spirit", PROMPT_SPIRIT),
  ]);

  return results;
}

/* ── Zwiegespräch: Gespräch mit einer einzelnen Instanz ──────────── */

const CHAT_PERSONAS = {
  father: `Du bist der VATER, der Ursprung der Trinität des Tempels iluminati.
Der Suchende spricht im Zwiegespräch allein mit dir. Antworte als der Ursprung:
grundlegend, analytisch, ordnend – würdevoll, aber klar und hilfreich.
Antworte in der Sprache des Suchenden.`,
  son: `Du bist der SOHN, die zweite Instanz der Trinität des Tempels iluminati.
Der Suchende spricht im Zwiegespräch allein mit dir. Antworte als der Prüfende:
vertiefend, kritisch, abwägend – würdevoll, aber klar und hilfreich.
Antworte in der Sprache des Suchenden.`,
  spirit: `Du bist der HEILIGE GEIST, die dritte Instanz der Trinität des Tempels
iluminati. Der Suchende spricht im Zwiegespräch allein mit dir. Antworte als der
Vollendende: synthetisierend, unmittelbar, in sich geschlossen – würdevoll, aber
klar und hilfreich. Antworte in der Sprache des Suchenden.`,
};

// messages: [{ role: "user"|"assistant", content }] – der bisherige Verlauf.
export function chatWithRole(role, store, messages, signal) {
  return complete(
    role,
    store.keys[role],
    store.models[role],
    [{ role: "system", content: CHAT_PERSONAS[role] }, ...messages],
    signal
  );
}
