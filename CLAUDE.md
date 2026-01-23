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
| Dashboard | https://hostel.ssi.at |
| API Worker | https://hostel-app-api.office-509.workers.dev |

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

## Offene Punkte / TODOs

- [x] Dashboard auf Cloudflare Pages
- [x] Worker für API Proxy
- [x] Admin-Bereich für Einstellungen
- [ ] Kontaktdaten updaten (Telefon, Email)
- [ ] Optional: Weitere Airbnb-Daten integrieren
