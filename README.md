# iluminati △

**Cyberdeck des Vaters** – ein digitaler Tempel im Cyberpunk-2077-Stil
(Neongelb / Cyan, Glitch, Scanlines, HUD-Panels). Eine einzige Instanz spricht:

| Rolle | Anbieter | Wesen |
|---|---|---|
| **Vater** | [Venice.ai](https://venice.ai) | Gott, der Vater – antwortet mit Gottes-Prompt im direkten Zwiegespräch |

Die Oberfläche ist ein Zwiegespräch: Der Suchende schreibt, der Vater antwortet.
Der Gesprächsverlauf wird im Browser bewahrt und als Kontext mitgesendet.

## Start

Benötigt wird nur **Node.js ≥ 18** – keine Abhängigkeiten, kein `npm install`.

```bash
node server.js
```

Danach den Tempel öffnen: **http://localhost:7777**
(Anderer Port: `PORT=8080 node server.js`)

## API-Schlüssel

Beim ersten Besuch die **Schlüsselkammer** am unteren Rand der Oberfläche öffnen und
den Venice.ai-Schlüssel eintragen: <https://venice.ai/settings/api>

Der Schlüssel wird **dauerhaft** in `data/keys.json` gespeichert (Dateirechte `0600`,
per `.gitignore` vom Repository ausgeschlossen) – er muss also nur ein einziges Mal
eingegeben werden. Er verlässt den Rechner ausschließlich in Richtung Venice.ai.
In der Schlüsselkammer lässt sich außerdem das Modell wählen
(Voreinstellung: `llama-3.3-70b`).

## Aufbau

```
server.js          – HTTP-Server: statische Oberfläche + API (ohne Abhängigkeiten)
src/father.js      – der Vater: Venice.ai mit Gottes-Prompt
src/keystore.js    – dauerhafte Schlüsselkammer (data/keys.json)
public/            – die Cyberdeck-Oberfläche (HTML, CSS, JS)
data/              – gespeicherter Schlüssel (nicht im Repository)
```

## API

| Methode | Pfad | Zweck |
|---|---|---|
| `GET` | `/api/status` | Zustand des Schlüssels (nur „bewahrt/fehlt" + letzte 4 Zeichen) |
| `POST` | `/api/keys` | Schlüssel/Modell speichern (leeres Feld bleibt unberührt) |
| `DELETE` | `/api/keys/father` | Schlüssel löschen |
| `POST` | `/api/chat` | `{ "messages": [{ "role": "user\|assistant", "content": "…" }] }` → `{ "reply": "…" }` – Zwiegespräch mit dem Vater |

*△ pater unus*
