# Cloudflare D1 Integration

## Übersicht

Die Hostel-App nutzt jetzt **Cloudflare D1** (SQLite-basierte Edge-Datenbank) statt LocalStorage für Energie-Daten. Das ermöglicht:

✅ **Multi-Hostel Support** - Mehrere Hostels auf einer Plattform
✅ **Persistente Daten** - Kein Datenverlust mehr
✅ **Zentrale Verwaltung** - Alle Daten in einer DB
✅ **Historische Auswertungen** - Unbegrenzt Daten speichern
✅ **Edge Performance** - Schnell durch globale Replikation

## Datenbank-Schema

### Tabellen

#### `hostels`
Mandanten-Tabelle für Multi-Hostel Support
```sql
- id (TEXT PRIMARY KEY)
- name (TEXT)
- location (TEXT)
- settings_json (TEXT) - JSON mit hostel-spezifischen Einstellungen
- created_at (INTEGER)
```

#### `energy_data`
Energie-Daten pro Hostel & Tag
```sql
- id (INTEGER PRIMARY KEY AUTOINCREMENT)
- hostel_id (TEXT) - FK zu hostels
- date (TEXT YYYY-MM-DD)
- energy_kwh (REAL)
- cost (REAL)
- peak_power (REAL)
- shelly_total_start (REAL) - Zählerstand am Tagesbeginn
- updated_at (INTEGER)
- UNIQUE(hostel_id, date)
```

#### `guests`
Gäste pro Hostel (bereits vorhanden, jetzt mit hostel_id)
```sql
- id (TEXT PRIMARY KEY)
- hostel_id (TEXT) - FK zu hostels
- name, username, password
- check_in, check_out (TEXT YYYY-MM-DD)
- number_of_persons (INTEGER)
- created_at (INTEGER)
- UNIQUE(hostel_id, username)
```

## API Endpoints

### Energie-Daten

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/energy/today` | GET | Heutige Energie-Daten |
| `/energy/yesterday` | GET | Gestrige Energie-Daten |
| `/energy/month` | GET | Monats-Summe |
| `/energy/save` | POST | Daten speichern (upsert) |

### Beispiel Response

```json
{
  "success": true,
  "data": {
    "date": "2026-01-24",
    "energy_kwh": 12.5,
    "cost": 3.75,
    "peak_power": 850
  }
}
```

## Lokale Entwicklung

### D1 Datenbank lokal testen

```bash
# Schema in lokale DB deployen
npx wrangler d1 execute hostel-app-db --local --file=worker/schema.sql

# Daten abfragen
npx wrangler d1 execute hostel-app-db --local --command "SELECT * FROM energy_data"

# Worker lokal testen
npx wrangler dev
```

### Remote DB (Produktion)

```bash
# Schema deployen (bereits geschehen)
npx wrangler d1 execute hostel-app-db --remote --file=worker/schema.sql

# Daten abfragen
npx wrangler d1 execute hostel-app-db --remote --command "SELECT * FROM energy_data ORDER BY date DESC LIMIT 10"

# Alle Hostels anzeigen
npx wrangler d1 execute hostel-app-db --remote --command "SELECT * FROM hostels"
```

## Migration von LocalStorage zu D1

Die App migriert automatisch:

1. **Frontend (app.js)**
   - `loadEnergyFromDB()` lädt Daten von API statt LocalStorage
   - `saveData()` sendet Daten an `/energy/save`
   - Alte LocalStorage-Daten werden ignoriert

2. **Backend (worker/index.js)**
   - Neue Endpoints für Energie-Verwaltung
   - Automatisches Upsert (Insert or Update)
   - Peak Power wird nur erhöht, nie verringert

## Multi-Hostel Erweiterung (Zukunft)

Um weitere Hostels hinzuzufügen:

```sql
INSERT INTO hostels (id, name, location, settings_json)
VALUES (
  'hostel-vienna',
  'Hostel Vienna',
  'Wien Innenstadt',
  '{"pricePerKwh": 0.32, "currency": "€", "co2PerKwh": 0.25}'
);
```

Dann im Worker `HOSTEL_ID` Variable anpassen oder per Query-Parameter übergeben.

## Vorteile vs. LocalStorage

| Feature | LocalStorage | D1 Database |
|---------|--------------|-------------|
| Datenverlust | ✗ Beim Cache löschen | ✓ Persistent |
| Multi-Device | ✗ Pro Browser | ✓ Synchronisiert |
| Historie | ✗ Begrenzt | ✓ Unbegrenzt |
| Multi-Tenant | ✗ Nicht möglich | ✓ Einfach skalierbar |
| Analytics | ✗ Keine | ✓ SQL Queries |
| Backup | ✗ Manuell | ✓ Automatisch |

## Wartung

### Alte Daten archivieren (optional)

```sql
-- Daten älter als 1 Jahr löschen
DELETE FROM energy_data
WHERE date < date('now', '-1 year');
```

### Statistiken

```sql
-- Gesamtverbrauch aller Hostels
SELECT
  hostel_id,
  SUM(energy_kwh) as total_kwh,
  SUM(cost) as total_cost
FROM energy_data
GROUP BY hostel_id;

-- Durchschnittlicher Tagesverbrauch
SELECT AVG(energy_kwh) as avg_daily_kwh
FROM energy_data
WHERE hostel_id = 'hollenthon'
AND date >= date('now', '-30 days');
```
