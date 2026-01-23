# Shelly Pro 3EM Energy Dashboard

Ein einfaches Kiosk-Dashboard zur Anzeige von Stromverbrauch und Kosten.

## Vorschau

```
┌─────────────────────────────────────┐
│         STROMVERBRAUCH              │
│                                     │
│     ┌─────────────────────────┐     │
│     │  Aktueller Verbrauch    │     │
│     │       1.234 W           │     │
│     └─────────────────────────┘     │
│                                     │
│  ┌───────────┐  ┌───────────┐       │
│  │  Heute    │  │  Gestern  │       │
│  │ 12,5 kWh  │  │ 15,3 kWh  │       │
│  │  3,75 €   │  │  4,59 €   │       │
│  └───────────┘  └───────────┘       │
│                                     │
│     ┌─────────────────────────┐     │
│     │     Dieser Monat        │     │
│     │       245,8 kWh         │     │
│     │        73,74 €          │     │
│     └─────────────────────────┘     │
│                                     │
│      ● Aktualisiert: 14:32:15       │
└─────────────────────────────────────┘
```

## Schnellstart

### 1. Shelly Pro 3EM IP-Adresse ermitteln

Nach der Installation des Shelly Pro 3EM:

1. **Shelly App** öffnen
2. Gerät auswählen
3. **Einstellungen** → **Geräteinfo**
4. IP-Adresse notieren (z.B. `192.168.1.100`)

### 2. Konfiguration anpassen

Datei `config.js` öffnen und anpassen:

```javascript
const CONFIG = {
    SHELLY_IP: "192.168.1.100",  // Deine Shelly IP
    PRICE_PER_KWH: 0.30,         // Strompreis in €/kWh
    // ...
};
```

### 3. Dashboard testen

#### Option A: Lokal im Browser
```bash
cd energy-dashboard
python3 -m http.server 8080
# Dann http://localhost:8080 öffnen
```

#### Option B: Direkt öffnen
Die `index.html` direkt im Browser öffnen (funktioniert möglicherweise nicht wegen CORS).

---

## Installation auf Android Kiosk

### Methode 1: Fully Kiosk Browser (Empfohlen)

1. **Fully Kiosk Browser** aus Play Store installieren
   - https://play.google.com/store/apps/details?id=de.ozerov.fully

2. Dashboard auf Webserver hosten (siehe unten)

3. In Fully Kiosk:
   - Start URL: `http://DEIN-SERVER/energy-dashboard/`
   - Kiosk Mode aktivieren
   - Navigation ausblenden

### Methode 2: Chrome Kiosk Mode

1. Chrome installieren
2. Dashboard-URL als Startseite setzen
3. Vollbildmodus aktivieren

### Methode 3: WebView App (für fortgeschrittene Nutzer)

Eine einfache Android WebView App erstellen, die nur das Dashboard anzeigt.

---

## Dashboard hosten

### Option 1: Raspberry Pi / Mini-Server

```bash
# Auf dem Pi/Server
sudo apt install nginx
sudo cp -r energy-dashboard /var/www/html/
# Dashboard erreichbar unter: http://PI-IP/energy-dashboard/
```

### Option 2: Lokaler Webserver auf anderem PC

```bash
# Python (temporär)
cd energy-dashboard
python3 -m http.server 8080

# Node.js (temporär)
npx serve energy-dashboard
```

### Option 3: NAS (Synology, QNAP, etc.)

Dashboard-Ordner in Web Station oder Web Server Ordner kopieren.

---

## Shelly Pro 3EM API Referenz

Das Dashboard nutzt folgende API-Endpunkte:

### Aktuelle Leistung
```
GET http://SHELLY-IP/rpc/EM.GetStatus?id=0
```

Antwort:
```json
{
  "id": 0,
  "a_current": 2.5,
  "a_voltage": 230.5,
  "a_act_power": 575.0,
  "a_pf": 0.98,
  "b_current": 1.8,
  "b_voltage": 231.2,
  "b_act_power": 415.0,
  "c_current": 0.5,
  "c_voltage": 229.8,
  "c_act_power": 115.0,
  "total_current": 4.8,
  "total_act_power": 1105.0,
  "total_act_energy": 12345678.9
}
```

### Energiedaten
```
GET http://SHELLY-IP/rpc/EMData.GetStatus?id=0
```

---

## Fehlerbehebung

### "Verbindung zum Shelly fehlgeschlagen"

1. **IP-Adresse prüfen**: Ist die IP in `config.js` korrekt?
2. **Netzwerk**: Sind Dashboard und Shelly im gleichen Netzwerk?
3. **Shelly erreichbar?**: Im Browser `http://SHELLY-IP` öffnen
4. **CORS**: Dashboard muss von einem Webserver geladen werden (nicht als lokale Datei)

### Dashboard zeigt keine Daten

1. Browser-Konsole öffnen (F12) und Fehlermeldungen prüfen
2. Shelly API direkt testen: `http://SHELLY-IP/rpc/EM.GetStatus?id=0`

### Energiewerte werden nicht gespeichert

- Dashboard nutzt LocalStorage
- Bei jedem Tageswechsel wird "Heute" zu "Gestern" verschoben
- Monatsenergie akkumuliert automatisch

---

## Anpassungen

### Farben ändern

In `index.html` im `<style>` Block:

```css
/* Hintergrund */
body {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

/* Aktuelle Leistung */
.current-power .value {
    color: #22d3ee;  /* Cyan */
}

/* Kosten */
.stat-card .cost {
    color: #4ade80;  /* Grün */
}
```

### Zusätzliche Felder anzeigen

Die Shelly API liefert auch:
- Spannung pro Phase (`a_voltage`, `b_voltage`, `c_voltage`)
- Strom pro Phase (`a_current`, `b_current`, `c_current`)
- Leistungsfaktor (`a_pf`, `b_pf`, `c_pf`)

---

## Dateien

```
energy-dashboard/
├── index.html    # Dashboard UI
├── config.js     # Konfiguration (IP, Strompreis)
├── app.js        # Logik & API-Aufrufe
└── README.md     # Diese Anleitung
```

---

## Nächste Schritte nach Shelly-Installation

1. [ ] Shelly Pro 3EM installieren und mit WLAN verbinden
2. [ ] IP-Adresse ermitteln
3. [ ] `config.js` mit IP und Strompreis anpassen
4. [ ] Dashboard auf Webserver hosten
5. [ ] Android Kiosk-Browser einrichten
6. [ ] Testen!
