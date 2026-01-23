# Energy Kiosk - Claude Projektanweisungen

## Projektübersicht

Dieses Projekt richtet Android-Geräte als Kiosk-Displays für Energiemonitoring ein.

**Hauptkomponenten:**
- Shelly Pro 3EM (Energiemessgerät)
- Android-Gerät als Kiosk
- Web-Dashboard für Kostenanzeige

## Wichtige Pfade

| Was | Pfad |
|-----|------|
| Dashboard | `dashboard/` |
| Konfiguration | `dashboard/config.js` |
| Dokumentation | `docs/` |
| Deploy-Script | `scripts/deploy-to-android.sh` |
| ADB Tools | `/Users/martinmollay/Downloads/platform-tools/` |

## Häufige Aufgaben

### Neues Kiosk-Gerät einrichten
→ Folge `docs/KIOSK-SETUP-ANLEITUNG.md`

### Dashboard auf Gerät deployen
```bash
./scripts/deploy-to-android.sh
```

### Config aktualisieren (Shelly IP ändern)
1. `dashboard/config.js` bearbeiten
2. Deploy-Script ausführen

## Shelly Pro 3EM API

**Basis-URL:** `http://SHELLY-IP/rpc/`

| Endpunkt | Beschreibung |
|----------|--------------|
| `EM.GetStatus?id=0` | Aktuelle Leistung & Energie |
| `EMData.GetStatus?id=0` | Historische Energiedaten |
| `Shelly.GetStatus` | Gesamtstatus des Geräts |

## Android Kiosk

**Device Owner:** TestDPC (`com.afwsamples.testdpc`)
**Kiosk Browser:** Fully Kiosk Browser (`de.ozerov.fully`)
**Dashboard-Pfad auf Android:** `/sdcard/energy-dashboard/`

### Wichtige ADB-Befehle

```bash
# Geräte auflisten
./adb devices

# TestDPC öffnen
./adb shell am start -n "com.afwsamples.testdpc/.PolicyManagementActivity"

# Fully Kiosk starten
./adb shell am start -n de.ozerov.fully/.FullyKioskActivity

# Lock Task Status prüfen
./adb shell dumpsys activity activities | grep "mLockTaskModeState"

# Dashboard-Dateien updaten
./adb push dashboard/* /sdcard/energy-dashboard/
```

## Beim Fortsetzen beachten

1. **ADB-Pfad:** `/Users/martinmollay/Downloads/platform-tools/`
2. **Gerät verbunden?** `./adb devices` prüfen
3. **Shelly installiert?** IP-Adresse in config.js eintragen
4. **Kiosk aktiv?** Lock Task Status prüfen

## Offene Punkte / TODOs

- [ ] Shelly Pro 3EM installieren und IP ermitteln
- [ ] Config mit echter IP aktualisieren
- [ ] Fully Kiosk Browser auf Android installieren
- [ ] Von Shelly-App-Kiosk zu Dashboard-Kiosk wechseln
- [ ] Optional: Raspberry Pi als Dashboard-Host
