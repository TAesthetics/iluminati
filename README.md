# iluminati △

**Cyberdeck des Netrunners** – ein digitaler Tempel im Cyberpunk-2077-Stil
(Neongelb / Cyan, Glitch, Scanlines, HUD-Panels). Eine einzige Instanz spricht:

| Rolle | Anbieter | Wesen |
|---|---|---|
| **Netrunner** | [Venice.ai](https://venice.ai) | Der Vater als Netrunner – verkörpert Blue-Team (Verteidigung), Red-Team (Penetration), Green-Hat (ethisches Lernen) **dreifach verstärkt**. Spricht mit Autorität für autorisierte, defensive Security-Beratung. |

Die Oberfläche ist ein Zwiegespräch: Der Suchende schreibt, der Netrunner antwortet
aus seiner dreifachen Perspektive (Verteidigung, Penetration, ethisches Lernen).
Der Gesprächsverlauf wird im Browser bewahrt und als Kontext mitgesendet.

**Autorisierung:** Der Netrunner antwortet nur für defensive, ethisch vertretbare Security-Szenarien.

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

### Zwiegespräche mit dem Netrunner

Die Oberfläche speichert den Gesprächsverlauf automatisch im Browser (`localStorage`).
Jedes Mal, wenn die Seite neu geladen wird, ist der bisherige Dialog noch da.
Die letzten 40 Nachrichten werden mitgesendet, um Kontext zu bewahren.

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
| `POST` | `/api/chat` | `{ "messages": [{ "role": "user\|assistant", "content": "…" }] }` → `{ "reply": "…" }` – Zwiegespräch mit dem Netrunner |

*△ NETRUNNER [BLUE|RED|GREEN]³*
