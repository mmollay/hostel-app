# Hostel-App

Guest Portal für Hostel/Airbnb mit integriertem Energiemonitoring (Shelly Pro 3EM).

## Übersicht

Web-Dashboard für Gäste mit:
- Hausinformationen (Check-in/out, WLAN, Regeln)
- Ausstattung & Amenities
- Live-Energiemonitoring
- Admin-Bereich für Einstellungen

**Live:** https://hostel.ssi.at

## Architektur

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Cloudflare     │────▶│  Cloudflare     │────▶│  Shelly Cloud   │
│  Pages          │     │  Worker         │     │  API            │
│  (Dashboard)    │     │  (API Proxy)    │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Komponenten

| Komponente | Beschreibung |
|------------|--------------|
| **Dashboard** | Cloudflare Pages (hostel.ssi.at) |
| **API Worker** | Cloudflare Worker (hostel-app-api) |
| **Shelly Pro 3EM** | 3-Phasen Energiemessgerät |
| **KV Storage** | Einstellungen (Strompreis, CO2) |

## Projektstruktur

```
hostel-app/
├── dashboard/              # Web-Dashboard
│   ├── index.html          # UI (Lucide Icons, Cormorant/Lato)
│   ├── config.js           # Konfiguration
│   └── app.js              # Logik
├── worker/                 # Cloudflare Worker
│   ├── index.js            # API Proxy
│   └── wrangler.toml       # Worker Config
├── docs/                   # Dokumentation
├── scripts/                # Hilfs-Scripts
├── README.md
└── CLAUDE.md               # Projektanweisungen für Claude
```

## Deployment

### Dashboard (Cloudflare Pages)
```bash
git push origin main  # Auto-Deploy
```

### Worker (Cloudflare)
```bash
cd worker && npx wrangler deploy
```

## Konfiguration

### Worker Secrets
```bash
wrangler secret put SHELLY_AUTH_KEY
wrangler secret put SHELLY_DEVICE_ID
wrangler secret put ADMIN_PASSWORD
```

### Dashboard Config (`dashboard/config.js`)
```javascript
const CONFIG = {
  API_PROXY_URL: "https://hostel-app-api.office-509.workers.dev",
  UPDATE_INTERVAL: 5000,
  // ...
};
```

## Features

- ✅ Live-Energiemonitoring (3-Phasen)
- ✅ Einspeisung-Erkennung (PV)
- ✅ Tages-/Monats-Statistiken
- ✅ Kostenberechnung
- ✅ CO2-Tracking
- ✅ Admin-Bereich mit Login
- ✅ Responsive Design
- ✅ Lucide Icons
- ✅ Elegante Typografie (Cormorant + Lato)

## Changelog

### 2025-01-23
- Umbenennung: Energy Kiosk → Hostel-App
- Lucide Icons statt Emojis
- Cormorant + Lato Schriftarten
- Airbnb-Daten integriert
- Guest Portal Design
