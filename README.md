# Energy Kiosk

Dediziertes Kiosk-System zur Anzeige von Stromverbrauch und Kosten mit Shelly Pro 3EM.

## Übersicht

Dieses Projekt ermöglicht es, Android-Geräte (z.B. Samsung Galaxy M32) als dedizierte Kiosk-Displays für Energiemonitoring einzurichten.

```
┌─────────────────────────────────┐
│      STROMVERBRAUCH             │
│                                 │
│    Aktuell: 1.234 W             │
│                                 │
│    Heute:    12,5 kWh / 3,75 €  │
│    Monat:   245,8 kWh / 73,74 € │
└─────────────────────────────────┘
```

## Komponenten

| Komponente | Beschreibung |
|------------|--------------|
| **Shelly Pro 3EM** | 3-Phasen Energiemessgerät |
| **Android Kiosk** | Samsung Galaxy M32 (oder ähnlich) |
| **Dashboard** | Web-basierte Kostenanzeige |
| **TestDPC** | Android Device Owner für Kiosk-Modus |

## Projektstruktur

```
energy-kiosk/
├── dashboard/              # Web-Dashboard
│   ├── index.html          # UI
│   ├── config.js           # Konfiguration (IP, Strompreis)
│   └── app.js              # Logik
├── docs/                   # Dokumentation
│   ├── KIOSK-SETUP-ANLEITUNG.md   # Android Kiosk einrichten
│   ├── ANDROID-SETUP.md           # Dashboard auf Android
│   └── DASHBOARD.md               # Dashboard-Dokumentation
├── scripts/                # Hilfs-Scripts
│   └── deploy-to-android.sh       # Dashboard auf Gerät kopieren
├── android-tools/          # ADB & Tools
│   └── (symlink zu platform-tools)
├── README.md
└── CLAUDE.md               # Projektanweisungen für Claude
```

## Schnellstart

### Neues Kiosk-Gerät einrichten

1. **Dokumentation lesen:** `docs/KIOSK-SETUP-ANLEITUNG.md`
2. **TestDPC als Device Owner** einrichten
3. **Dashboard konfigurieren:** `dashboard/config.js`
4. **Auf Gerät deployen:** `./scripts/deploy-to-android.sh`

### Bestehendes Gerät updaten

```bash
# Config anpassen
nano dashboard/config.js

# Auf Gerät deployen
./scripts/deploy-to-android.sh
```

## Hardware-Anforderungen

### Android-Gerät
- Android 10+ (getestet mit Android 13)
- WLAN-fähig
- USB-Debugging möglich
- Empfohlen: Samsung Galaxy M32 oder ähnlich

### Shelly Pro 3EM
- Im gleichen WLAN-Netzwerk
- Zugriff auf lokale API (Standard)

## Konfiguration

Die Datei `dashboard/config.js` enthält:

```javascript
const CONFIG = {
  SHELLY_IP: "192.168.1.XXX",  // Shelly Pro 3EM IP
  PRICE_PER_KWH: 0.30,         // Strompreis in €/kWh
  UPDATE_INTERVAL: 2000,       // Aktualisierung in ms
  // ...
};
```

## Dokumentation

| Dokument | Beschreibung |
|----------|--------------|
| [KIOSK-SETUP-ANLEITUNG.md](docs/KIOSK-SETUP-ANLEITUNG.md) | Vollständige Anleitung für Android Kiosk |
| [ANDROID-SETUP.md](docs/ANDROID-SETUP.md) | Dashboard auf Android installieren |
| [DASHBOARD.md](docs/DASHBOARD.md) | Dashboard-Dokumentation & API |

## Changelog

### 2025-01-23
- Initiales Projekt erstellt
- Dashboard für Shelly Pro 3EM
- Android Kiosk-Setup mit TestDPC
- Dokumentation für Replikation
