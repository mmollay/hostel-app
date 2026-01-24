# Hostel-App - Claude Projektanweisungen

## Projektübersicht

Guest Portal für Hostel/Airbnb mit integriertem Energiemonitoring.

**Hauptkomponenten:**
- Shelly Pro 3EM (Energiemessgerät)
- Web-Dashboard (Cloudflare Pages)
- API Proxy (Cloudflare Worker)
- Optional: Android-Gerät als Kiosk

## Wichtige Pfade

| Was | Pfad |
|-----|------|
| Dashboard | `dashboard/` |
| Konfiguration | `dashboard/config.js` |
| Worker | `worker/` |
| Dokumentation | `docs/` |
| Deploy-Script | `scripts/deploy-to-android.sh` |

## URLs

| Service | URL |
|---------|-----|
| Dashboard | https://gastauferden.at |
| API Worker | https://hostel-app-api.office-509.workers.dev |

## Environment Variables (.env)

**Zentrale Secrets-Verwaltung:** `.env` im Root-Verzeichnis

| Variable | Zweck |
|----------|-------|
| `ADMIN_PASSWORD` | Admin-Login im Dashboard |
| `SHELLY_AUTH_KEY` | Shelly Cloud API Authentication |
| `SHELLY_DEVICE_ID` | Shelly Pro 3EM Device ID |
| `SHELLY_CLOUD_SERVER` | Shelly Cloud Server URL |

**WICHTIG:**
- `.env` ist in `.gitignore` und wird NICHT committet
- Template: `.env.example` (kann committet werden)
- Für Claude: Secrets aus `.env` verwenden, NIEMALS hardcoden!

**Worker Secrets aktualisieren:**
```bash
cd worker
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SHELLY_AUTH_KEY
npx wrangler secret put SHELLY_DEVICE_ID
```

## Häufige Aufgaben

### Dashboard deployen (Cloudflare Pages)
```bash
# Automatisch via GitHub Push
git push origin main
```

### Worker deployen
```bash
cd worker && npx wrangler deploy
```

### Neues Kiosk-Gerät einrichten
→ Folge `docs/KIOSK-SETUP-ANLEITUNG.md`

### Dashboard auf Android deployen
```bash
./scripts/deploy-to-android.sh
```

## Shelly Pro 3EM API

**Basis-URL:** `http://SHELLY-IP/rpc/`

| Endpunkt | Beschreibung |
|----------|--------------|
| `EM.GetStatus?id=0` | Aktuelle Leistung & Energie |
| `EMData.GetStatus?id=0` | Historische Energiedaten |
| `Shelly.GetStatus` | Gesamtstatus des Geräts |

## Android Kiosk (optional)

**Device Owner:** TestDPC (`com.afwsamples.testdpc`)
**Kiosk Browser:** Fully Kiosk Browser (`de.ozerov.fully`)
**Dashboard-Pfad auf Android:** `/sdcard/hostel-dashboard/`

### Wichtige ADB-Befehle

```bash
# Geräte auflisten
./adb devices

# Fully Kiosk starten
./adb shell am start -n de.ozerov.fully/.FullyKioskActivity

# Dashboard-Dateien updaten
./adb push dashboard/* /sdcard/hostel-dashboard/
```

## Features

- **Multi-Apartment Verwaltung** - Mehrere Unterkünfte über einen Admin verwalten
  - Auto-Single-Mode: 1 Apartment → automatisch laden
  - Übersichtsseite: 2+ Apartments → Auswahl anzeigen
  - Apartment-spezifische URLs: `/?apt=slug`
- **Du/Sie-Form** - Admin kann Förmlichkeitsform global einstellen
- **UID-Verwaltung** - Umsatzsteuer-ID editierbar, wird dynamisch im Impressum angezeigt
- **Energiemonitoring** - Live-Verbrauch via Shelly Pro 3EM
- **Gastportal** - Check-in/out, Energiedaten, Kurtaxe-Berechnung
- **Rechtliche Seiten** - Impressum, Datenschutz, Kontakt (DSGVO-konform)

## Offene Punkte / TODOs

- [x] Dashboard auf Cloudflare Pages
- [x] Worker für API Proxy
- [x] Admin-Bereich für Einstellungen
- [x] Multi-Apartment Verwaltung
- [x] Du/Sie-Form umschaltbar
- [x] UID-Verwaltung
- [x] Rechtliche Seiten (Impressum, Datenschutz, Kontakt)
- [ ] Optional: Weitere Airbnb-Daten integrieren
- [ ] Domain gastauferden.at konfigurieren (Cloudflare Pages Custom Domain)
