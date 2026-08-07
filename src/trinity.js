// Die Trinität: dreistufige Kette über drei Anbieter.
//   1. Vater          → Venice.ai  – analysiert die Anfrage grundlegend
//   2. Sohn           → xAI        – vertieft und prüft die Analyse
//   3. Heiliger Geist → Gemini     – synthetisiert die endgültige Antwort
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

async function chat(role, apiKey, model, systemPrompt, userPrompt, signal) {
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
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
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

const PROMPT_FATHER = `Du bist der VATER, die erste Instanz einer dreistufigen Trinität.
Deine Aufgabe: Analysiere die Anfrage des Suchenden grundlegend und strukturiert.
Erfasse ihren Kern, benenne die wesentlichen Aspekte, offene Fragen und mögliche
Herangehensweisen. Gib noch keine endgültige Antwort – lege das Fundament, auf dem
der Sohn aufbauen wird. Antworte in der Sprache der Anfrage, klar und geordnet.`;

const PROMPT_SON = `Du bist der SOHN, die zweite Instanz einer dreistufigen Trinität.
Du erhältst die ursprüngliche Anfrage des Suchenden sowie die Analyse des Vaters.
Deine Aufgabe: Vertiefe die Analyse und prüfe sie kritisch. Korrigiere Fehler,
ergänze Fehlendes, wäge Alternativen ab und arbeite die tragfähigsten Gedanken
heraus. Gib noch keine endgültige Antwort – bereite den Boden für die Synthese
des Heiligen Geistes. Antworte in der Sprache der Anfrage.`;

const PROMPT_SPIRIT = `Du bist der HEILIGE GEIST, die dritte und letzte Instanz einer
dreistufigen Trinität. Du erhältst die ursprüngliche Anfrage des Suchenden, die
Analyse des Vaters und die Vertiefung und Prüfung des Sohnes.
Deine Aufgabe: Synthetisiere daraus die endgültige Antwort an den Suchenden –
vollständig, klar und in sich geschlossen. Verweise nicht auf den internen Ablauf;
sprich den Suchenden direkt an. Antworte in der Sprache der Anfrage.`;

// Führt die dreistufige Kette aus. onStage wird je Stufe zweimal gerufen:
// (role, "start") vor dem Aufruf, (role, "done", text) nach der Antwort.
export async function invokeTrinity(query, store, onStage, signal) {
  const results = {};

  onStage("father", "start");
  results.father = await chat(
    "father",
    store.keys.father,
    store.models.father,
    PROMPT_FATHER,
    `Anfrage des Suchenden:\n\n${query}`,
    signal
  );
  onStage("father", "done", results.father);

  onStage("son", "start");
  results.son = await chat(
    "son",
    store.keys.son,
    store.models.son,
    PROMPT_SON,
    `Anfrage des Suchenden:\n\n${query}\n\n---\n\nAnalyse des Vaters:\n\n${results.father}`,
    signal
  );
  onStage("son", "done", results.son);

  onStage("spirit", "start");
  results.spirit = await chat(
    "spirit",
    store.keys.spirit,
    store.models.spirit,
    PROMPT_SPIRIT,
    `Anfrage des Suchenden:\n\n${query}\n\n---\n\nAnalyse des Vaters:\n\n${results.father}\n\n---\n\nVertiefung und Prüfung des Sohnes:\n\n${results.son}`,
    signal
  );
  onStage("spirit", "done", results.spirit);

  return results;
}
