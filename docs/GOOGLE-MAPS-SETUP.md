# Google Maps Places API - Setup Anleitung

## Übersicht

Die Hostel-App nutzt die **Google Maps Places API (New)** für dynamische Empfehlungen in der Umgebung.

## Features

✅ **Umkreis-Suche** - 10-30km einstellbar
✅ **Kategorien** - Thermen, Restaurants, Sehenswürdigkeiten
✅ **Live-Daten** - Ratings, Öffnungszeiten, Entfernung
✅ **Top 10** - Nur die besten Empfehlungen (Rating >= 3.5)

## API Key erstellen

### 1. Google Cloud Console öffnen

https://console.cloud.google.com/

### 2. Projekt erstellen

- Klicke auf "Projekt auswählen" (oben)
- "Neues Projekt"
- Name: **Hostel App**
- Klicke "Erstellen"

### 3. APIs aktivieren

Navigiere zu: **APIs & Dienste** → **Bibliothek**

Aktiviere diese 2 APIs:

1. ✅ **Places API (New)**
   - Suche: "Places API (New)"
   - Klicke "Aktivieren"

2. ✅ **Maps JavaScript API**
   - Suche: "Maps JavaScript API"
   - Klicke "Aktivieren"

### 4. API-Schlüssel erstellen

- Gehe zu: **APIs & Dienste** → **Anmeldedaten**
- Klicke "+ ANMELDEDATEN ERSTELLEN"
- Wähle "API-Schlüssel"
- **Kopiere den Schlüssel** (sieht aus wie: `AIzaSyC...`)

### 5. API-Schlüssel einschränken (WICHTIG!)

Um Missbrauch zu verhindern:

1. Klicke auf den erstellten Schlüssel
2. **Anwendungseinschränkungen:**
   - Wähle "HTTP-Referrer (Websites)"
   - Füge hinzu:
     - `http://localhost:8080/*` (für Entwicklung)
     - `https://hostel.ssi.at/*` (deine Domain)
3. **API-Einschränkungen:**
   - "Schlüssel einschränken"
   - Wähle nur:
     - Places API (New)
     - Maps JavaScript API
4. Klicke "Speichern"

### 6. API-Schlüssel eintragen

Öffne `dashboard/config.js`:

```javascript
GOOGLE_MAPS_API_KEY: "AIzaSyC...", // Deinen Key hier eintragen
```

**FERTIG!** 🎉

## Kosten

### Free Tier (pro Monat)

- **Erste 28.500 Requests:** KOSTENLOS
- **Danach:** ~$5 pro 1.000 Requests

### Typischer Verbrauch für ein Hostel

- **5 Kategorien** × **1 Request** = 5 Requests pro Gast-Login
- **10 Gäste/Tag** × 5 = **50 Requests/Tag**
- **50 × 30 Tage** = **1.500 Requests/Monat**

→ **Weit unter dem Free Tier!** ✅

### Budget-Limit setzen

Um sicherzugehen:

1. Google Cloud Console → **Abrechnung**
2. **Budgets & Benachrichtigungen**
3. Budget erstellen: **10 €/Monat**
4. Benachrichtigung bei: **80% Auslastung**

## Verwendete Kategorien

Die App sucht nach diesen POI-Typen:

| Kategorie | Google Type | Beispiele |
|-----------|-------------|-----------|
| Sehenswürdigkeiten | `tourist_attraction` | Burg Landsee, Aussichtspunkte |
| Thermen | `spa` | Asia Therme Lindsberg |
| Restaurants | `restaurant` | Gasthöfe, Restaurants |
| Museen | `museum` | Regionalmuseen |
| Parks | `park` | Naturparks, Wanderwege |

## Troubleshooting

### "This API project is not authorized to use this API"

→ Du hast die **Places API (New)** nicht aktiviert. Siehe Schritt 3.

### "API key not valid"

→ Prüfe:
1. Schlüssel korrekt kopiert (ohne Leerzeichen)?
2. APIs aktiviert?
3. Einschränkungen richtig gesetzt?

### "REQUEST_DENIED"

→ HTTP-Referrer Einschränkungen prüfen:
- `http://localhost:8080/*` für lokal
- `https://hostel.ssi.at/*` für Produktion

### Keine Ergebnisse

→ Umkreis vergrößern (Slider auf 30km)

## Alternative: Statische Empfehlungen

Falls du **keine Google Maps API** nutzen möchtest, kannst du in `index.html` die statischen Empfehlungen wieder aktivieren:

```html
<div class="recommendations-list">
    <div class="recommendation-item">
        <div class="recommendation-icon"><i data-lucide="castle"></i></div>
        <div>
            <h4>Burg Landsee</h4>
            <p>Historische Burganlage, 15 km</p>
        </div>
    </div>
    <!-- Weitere statische Empfehlungen... -->
</div>
```

## Multi-Hostel Support

Für weitere Hostels einfach **LOCATION** in `app.js` anpassen:

```javascript
const LOCATION = {
  lat: 48.2082,  // Wien
  lon: 16.3738,
  name: "Wien",
};
```

Oder dynamisch per Hostel-ID aus der Datenbank laden.
