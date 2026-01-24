# OpenWeatherMap API - Setup Anleitung

## Übersicht

Die Hostel-App nutzt **OpenWeatherMap** für:

✅ **Aktuelles Wetter** - Temperatur, Wind, Luftfeuchtigkeit
✅ **5-Tage-Vorhersage** - Perfekt für Ausflugsplanung
✅ **Wetter-basierte Empfehlungen** - Automatische Anpassung der Ausflugsziele

## Features

### Intelligente Empfehlungen

🌧️ **Schlechtes Wetter** (Regen, Schnee, <10°C)
→ Thermen, Museen, Restaurants (Indoor)

☀️ **Gutes Wetter** (>20°C, klar)
→ Wandern, Burgen, Parks (Outdoor)

## API Key erstellen (KOSTENLOS)

### 1. Account erstellen

https://openweathermap.org/api

- Klicke "Sign Up"
- Email: **office@ssi.at** (oder deine Email)
- Passwort festlegen
- Email bestätigen

### 2. API Key abrufen

Nach dem Login:

1. Gehe zu: https://home.openweathermap.org/api_keys
2. Dein Default-Key ist bereits erstellt!
3. **Kopiere den API-Key**

### 3. API Key eintragen

Öffne `dashboard/config.js`:

```javascript
OPENWEATHER_API_KEY: "dein-api-key-hier",
```

**FERTIG!** 🎉

## Kosten

### Free Tier (absolut kostenlos!)

- **1.000 API Calls pro Tag** - GRATIS
- **60.000 Calls pro Monat** - GRATIS

### Typischer Verbrauch

- **1 Call alle 10 Minuten** = 144 Calls/Tag
- **Pro Gast:** 1-2 Calls
- **10 Gäste/Tag:** 10-20 Calls

→ **Weit unter dem Limit!** ✅

**Keine Kreditkarte nötig!** 💳❌

## Verwendete APIs

| API | Endpoint | Zweck |
|-----|----------|-------|
| **5 Day Forecast** | `/data/2.5/forecast` | Aktuell + 5 Tage |

## Wetter-basierte Kategorien

Die App passt Empfehlungen automatisch an:

| Wetter | Temp | Kategorie | Beispiele |
|--------|------|-----------|-----------|
| ☔ Regen | - | Spa (Thermen) | Asia Therme Lindsberg |
| ❄️ Schnee | - | Spa (Thermen) | Wellness & Entspannung |
| 🥶 Kalt | <10°C | Spa (Thermen) | Indoor-Aktivitäten |
| ☀️ Schön | ≥20°C | Tourist Attractions | Burg Landsee, Wandern |

## Wettervorhersage

Die 5-Tage-Vorhersage zeigt:

```
┌────────┬────────┬────────┬────────┬────────┐
│  Mo    │  Di    │  Mi    │  Do    │  Fr    │
│  ☀️    │  🌤️   │  ☁️    │  🌧️   │  ☀️    │
│  22°   │  20°   │  18°   │  15°   │  23°   │
└────────┴────────┴────────┴────────┴────────┘
```

→ Gäste können ihre Ausflüge perfekt planen!

## Troubleshooting

### "Invalid API key"

→ Prüfe:
1. Key korrekt kopiert (ohne Leerzeichen)?
2. Email bestätigt?
3. API Key aktiviert? (dauert ~10 Minuten nach Erstellung)

### Keine Wetterdaten

→ Konsole öffnen (F12) und prüfen:
- "OpenWeatherMap API Key fehlt" → Key eintragen
- "401 Unauthorized" → Key noch nicht aktiviert (10 Min warten)

### Alte Daten

→ OpenWeatherMap aktualisiert alle **10 Minuten**

## Vorteile vs. Open-Meteo

| Feature | Open-Meteo | OpenWeatherMap |
|---------|------------|----------------|
| API Key | ❌ Nicht nötig | ✅ Kostenlos |
| Genauigkeit | ⭐⭐⭐ Gut | ⭐⭐⭐⭐⭐ Sehr gut |
| Aktualisierung | ~1 Stunde | ~10 Minuten |
| Vorhersage | Ja | Ja, detaillierter |
| Deutsch | Ja | ✅ Ja |
| Rate Limit | Unbegrenzt | 1.000/Tag (genug!) |

## Alternative: Ohne API Key

Falls du **keinen API Key** nutzen möchtest, kannst du zu **Open-Meteo** zurück:

In `app.js` die `fetchWeather()` Funktion ersetzen mit der alten Version.

## Multi-Hostel Support

Für weitere Hostels einfach **LOCATION** in `app.js` anpassen:

```javascript
const LOCATION = {
  lat: 48.2082,  // Wien
  lon: 16.3738,
  name: "Wien",
};
```
