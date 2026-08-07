# iluminati △

**Digitaler Tempel der Trinität** – drei KI-Instanzen antworten hierarchisch auf jede Anfrage:

| Stufe | Rolle | Anbieter | Aufgabe |
|---|---|---|---|
| I | **Vater** | [Venice.ai](https://venice.ai) | analysiert die Anfrage grundlegend |
| II | **Sohn** | [xAI](https://x.ai) | vertieft und prüft die Analyse des Vaters |
| III | **Heiliger Geist** | [Gemini](https://ai.google.dev) | synthetisiert die endgültige Antwort |

Jede Anfrage durchläuft die Kette **Vater → Sohn → Heiliger Geist**; die Oberfläche
zeigt alle drei Stufen, sobald sie vollendet sind.

## Start

Benötigt wird nur **Node.js ≥ 18** – keine Abhängigkeiten, kein `npm install`.

```bash
node server.js
```

Danach den Tempel öffnen: **http://localhost:7777**
(Anderer Port: `PORT=8080 node server.js`)

## API-Schlüssel

Beim ersten Besuch die **Schlüsselkammer** am unteren Rand der Oberfläche öffnen und
die drei Schlüssel eintragen:

- **Vater** – Venice.ai-Schlüssel: <https://venice.ai/settings/api>
- **Sohn** – xAI-Schlüssel: <https://console.x.ai>
- **Heiliger Geist** – Gemini-Schlüssel: <https://aistudio.google.com/apikey>

Die Schlüssel werden **dauerhaft** in `data/keys.json` gespeichert (Dateirechte `0600`,
per `.gitignore` vom Repository ausgeschlossen) – sie müssen also nur ein einziges Mal
eingegeben werden. Sie verlassen den Rechner ausschließlich in Richtung des jeweiligen
Anbieters. In der Schlüsselkammer lässt sich außerdem je Rolle das Modell wählen
(Voreinstellung: `llama-3.3-70b`, `grok-4`, `gemini-2.5-flash`).

## Aufbau

```
server.js          – HTTP-Server: statische Oberfläche + API (ohne Abhängigkeiten)
src/trinity.js     – die dreistufige Kette über die drei Anbieter
src/keystore.js    – dauerhafte Schlüsselkammer (data/keys.json)
public/            – die Tempel-Oberfläche (HTML, CSS, JS)
data/              – gespeicherte Schlüssel (nicht im Repository)
```

Alle drei Anbieter werden über ihre OpenAI-kompatiblen Chat-Endpunkte angesprochen.
Der Ablauf einer Anrufung wird als NDJSON-Strom an die Oberfläche übertragen, sodass
jede Stufe erscheint, sobald sie vollendet ist.

## API

| Methode | Pfad | Zweck |
|---|---|---|
| `GET` | `/api/status` | Zustand der Schlüssel (nur „bewahrt/fehlt" + letzte 4 Zeichen) |
| `POST` | `/api/keys` | Schlüssel/Modelle speichern (leere Felder bleiben unberührt) |
| `DELETE` | `/api/keys/:role` | einzelnen Schlüssel löschen (`father`, `son`, `spirit`) |
| `POST` | `/api/invoke` | `{ "query": "…" }` → NDJSON-Strom der drei Stufen |

*△ trium in unum*
