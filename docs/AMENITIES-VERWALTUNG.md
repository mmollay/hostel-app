# Annehmlichkeiten-Verwaltung

## Übersicht

Das Hostel-App System bietet eine flexible Verwaltung von Annehmlichkeiten (Amenities). Alle Einträge können im Admin-Bereich bearbeitet, angepasst und ein-/ausgeblendet werden.

## Features

✅ **Editierbare Inhalte** - Titel und Beschreibung anpassbar
✅ **Sichtbarkeits-Steuerung** - Einträge ein-/ausblenden
✅ **Icon-System** - Lucide Icons für visuelle Darstellung
✅ **Default-Werte** - 12 vordefinierte Annehmlichkeiten
✅ **Reihenfolge** - Sortierung nach display_order

## Admin-Bereich nutzen

### Zugriff

1. Öffne: `https://hostel.ssi.at/admin.html`
2. Admin-Passwort eingeben
3. Scrolle zu **"Annehmlichkeiten"**

### Annehmlichkeiten bearbeiten

#### Text ändern

1. Klicke auf **Bearbeiten** (Stift-Icon)
2. Ändere **Titel** und/oder **Beschreibung**
3. Klicke **Speichern**

**Beispiel:**
```
Original:  Voll ausgestattete Küche
           Herd, Ofen, Kühlschrank, Kaffeemaschine

Angepasst: Voll ausgestattete Küche
           Herd, Ofen, Kühlschrank
```

#### Ein-/Ausblenden

1. Klicke auf **Auge-Icon**
2. Grün = Sichtbar für Gäste
3. Rot = Ausgeblendet

**Beispiel:**
- ✅ "Waschmaschine" → Sichtbar
- ❌ "Kaffeemaschine nicht vorhanden" → Ausgeblendet

## Default-Annehmlichkeiten

| Icon | Titel | Beschreibung |
|------|-------|--------------|
| `chef-hat` | Voll ausgestattete Küche | Herd, Ofen, Kühlschrank |
| `flame` | Kamin | Pellets & Holz vorhanden |
| `trees` | Garten mit Feuerstelle | Gartenmöbel & Hängematte |
| `utensils` | Grill & Außenküche | Essbereich im Freien |
| `washing-machine` | Waschmaschine | In der Waschküche |
| `wifi` | Kostenloses WLAN | Highspeed-Internet |
| `bed-double` | Komfortable Betten | Hochwertige Matratzen |
| `bath` | Badezimmer | Mit Dusche & WC |
| `car` | Parkplatz | Kostenlose Parkplätze |
| `coffee` | Kaffee & Tee | Zur freien Verfügung |
| `tv` | TV & Streaming | Netflix, YouTube, etc. |
| `book` | Bücher & Spiele | Kleine Bibliothek |

## Anwendungsbeispiele

### Beispiel 1: Waschmaschine in Waschküche

**Problem:** Waschmaschine ist nicht im Haus, sondern in separater Waschküche

**Lösung:**
1. Öffne Admin → Annehmlichkeiten
2. Finde "Waschmaschine"
3. Klicke **Bearbeiten**
4. Ändere Beschreibung:
   ```
   Alt: Kostenlos nutzbar
   Neu: In der Waschküche
   ```
5. **Speichern**

### Beispiel 2: Keine Kaffeemaschine

**Problem:** Küche hat keine Kaffeemaschine

**Lösung:**
1. Öffne Admin → Annehmlichkeiten
2. Finde "Voll ausgestattete Küche"
3. Klicke **Bearbeiten**
4. Ändere Beschreibung:
   ```
   Alt: Herd, Ofen, Kühlschrank, Kaffeemaschine
   Neu: Herd, Ofen, Kühlschrank
   ```
5. **Speichern**

### Beispiel 3: Familienfreundlich ausblenden

**Problem:** Hostel ist nicht auf Familien ausgerichtet

**Lösung:**
1. Öffne Admin → Annehmlichkeiten
2. Finde Einträge wie "Kinderspielzeug", "Baby-Ausstattung"
3. Klicke **Auge-Icon** um auszublenden
4. Eintrag wird durchsichtig dargestellt
5. Gäste sehen ihn nicht mehr

## API-Endpunkte

### Öffentlich (Gäste)

```bash
GET https://hostel-app-api.office-509.workers.dev/amenities
```

Gibt nur **sichtbare** Annehmlichkeiten zurück (`is_visible = 1`)

### Admin (mit Auth)

```bash
# Alle Annehmlichkeiten (inkl. ausgeblendete)
GET /amenities/all
Headers: Authorization: Bearer ADMIN_PASSWORD

# Annehmlichkeit bearbeiten
PUT /amenities/{id}
Headers: Authorization: Bearer ADMIN_PASSWORD
Body: { "title": "...", "description": "..." }

# Sichtbarkeit umschalten
PUT /amenities/{id}/toggle
Headers: Authorization: Bearer ADMIN_PASSWORD
```

## Datenbank-Struktur

```sql
CREATE TABLE amenities (
  id TEXT PRIMARY KEY,              -- z.B. "amen_1"
  hostel_id TEXT NOT NULL,          -- "hollenthon"
  icon TEXT NOT NULL,               -- Lucide icon name
  title TEXT NOT NULL,              -- Titel
  description TEXT NOT NULL,        -- Beschreibung
  is_visible INTEGER DEFAULT 1,     -- 1 = sichtbar, 0 = ausgeblendet
  display_order INTEGER DEFAULT 0,  -- Sortierung
  created_at INTEGER DEFAULT (unixepoch())
);
```

## Icon-Referenz (Lucide)

Verfügbare Icons: https://lucide.dev/icons

**Beliebt für Hostels:**
- `chef-hat` - Küche
- `flame` - Kamin/Heizung
- `trees` - Garten
- `utensils` - Essen/Grill
- `washing-machine` - Waschmaschine
- `wifi` - WLAN
- `bed-double` - Betten
- `bath` - Bad/Dusche
- `car` - Parkplatz
- `coffee` - Kaffee
- `tv` - TV/Entertainment
- `book` - Bücher/Bibliothek
- `baby` - Familienfreundlich
- `air-vent` - Klimaanlage
- `snowflake` - Kühlschrank
- `sun` - Terrasse/Balkon

## Troubleshooting

### Änderungen werden nicht angezeigt

→ **Lösung:** Seite neu laden (Strg+F5 / Cmd+Shift+R)

### "Unauthorized" Fehler beim Bearbeiten

→ **Lösung:** Neu im Admin-Bereich anmelden

### Amenities-Sektion bleibt leer

→ **Lösung:** Browser-Konsole prüfen (F12):
```javascript
// Manuell testen
fetch('https://hostel-app-api.office-509.workers.dev/amenities')
  .then(r => r.json())
  .then(console.log)
```

## Multi-Hostel Support

Für mehrere Hostels:

1. Neue Einträge in DB einfügen:
```sql
INSERT INTO amenities (id, hostel_id, icon, title, description, is_visible, display_order)
VALUES ('amen_wien_1', 'wien', 'chef-hat', 'Küche', 'Modern ausgestattet', 1, 1);
```

2. Worker anpassen (HOSTEL_ID dynamisch setzen)

## Wartung

### Neue Annehmlichkeit hinzufügen

```sql
INSERT INTO amenities (id, hostel_id, icon, title, description, is_visible, display_order)
VALUES ('amen_13', 'hollenthon', 'snowflake', 'Klimaanlage', 'In allen Räumen', 1, 13);
```

Dann Worker neu deployen:
```bash
npx wrangler d1 execute hostel-app-db --remote --command "INSERT INTO..."
```

### Annehmlichkeit löschen

```sql
DELETE FROM amenities WHERE id = 'amen_13' AND hostel_id = 'hollenthon';
```

## Zusammenfassung

Das Annehmlichkeiten-System ist:
- ✅ **Flexibel** - Inhalte jederzeit anpassbar
- ✅ **Einfach** - Admin-Oberfläche ohne Code-Kenntnisse
- ✅ **Dynamisch** - Änderungen sofort live
- ✅ **Erweiterbar** - Neue Einträge einfach hinzufügbar
