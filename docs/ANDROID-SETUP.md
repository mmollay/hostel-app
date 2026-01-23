# Dashboard auf Android einrichten (ohne externen Server)

## Übersicht

Das Dashboard läuft direkt auf dem Android-Gerät mit dem **Fully Kiosk Browser**.

## Schritt 1: Fully Kiosk Browser installieren

### Via ADB (empfohlen für Kiosk-Geräte)

```bash
# APK herunterladen
# Download von: https://www.fully-kiosk.com/files/fully-kiosk-browser-v1.55.3-oat.apk

# Installieren
./adb install fully-kiosk-browser.apk
```

### Via Play Store

Falls das Gerät Zugang zum Play Store hat:
- https://play.google.com/store/apps/details?id=de.ozerov.fully

**Hinweis:** Die kostenlose Version reicht für unsere Zwecke.

---

## Schritt 2: Dashboard-Dateien auf Android kopieren

```bash
# Ordner auf dem Gerät erstellen
./adb shell mkdir -p /sdcard/energy-dashboard

# Dateien kopieren
./adb push index.html /sdcard/energy-dashboard/
./adb push config.js /sdcard/energy-dashboard/
./adb push app.js /sdcard/energy-dashboard/
```

### Prüfen ob Dateien vorhanden sind

```bash
./adb shell ls -la /sdcard/energy-dashboard/
```

---

## Schritt 3: Fully Kiosk Browser konfigurieren

### 3.1 App starten

```bash
./adb shell am start -n de.ozerov.fully/.FullyKioskActivity
```

### 3.2 Einstellungen öffnen

- 3x schnell auf eine freie Stelle tippen → Einstellungen

### 3.3 Wichtige Einstellungen

| Einstellung | Wert |
|-------------|------|
| **Start URL** | `file:///sdcard/energy-dashboard/index.html` |
| **Enable Kiosk Mode** | ✅ An |
| **Hide Navigation Bar** | ✅ An |
| **Hide Status Bar** | ✅ An |
| **Disable Status Bar Pull** | ✅ An |
| **Disable Volume Buttons** | ✅ An |
| **Keep Screen On** | ✅ An |
| **Screen Brightness** | 80% (oder nach Wunsch) |

### 3.4 Web Auto Reload (optional)

Falls das Dashboard bei Verbindungsproblemen neu laden soll:

| Einstellung | Wert |
|-------------|------|
| **Auto Reload on Idle** | 300 (5 Minuten) |
| **Auto Reload on Network Error** | ✅ An |

### 3.5 Kiosk-Passwort setzen

Unter "Kiosk Mode":
- **Kiosk Exit PIN** setzen (z.B. `1234`)

Damit kann nur jemand mit PIN den Kiosk verlassen.

---

## Schritt 4: Fully Kiosk zur Lock Task Liste hinzufügen

Falls das Gerät bereits als Kiosk mit TestDPC eingerichtet ist:

### 4.1 TestDPC öffnen

```bash
./adb shell am start -n "com.afwsamples.testdpc/.PolicyManagementActivity"
```

### 4.2 Fully Kiosk zur Whitelist hinzufügen

1. Zu "Lock task" scrollen
2. "Manage lock task list" antippen
3. `de.ozerov.fully` eingeben
4. "Add" antippen

### 4.3 Kiosk-Modus mit Fully Kiosk starten

1. "Single-use devices" → "Start kiosk mode"
2. **Fully Kiosk Browser** auswählen (statt Shelly)
3. OK

---

## Schritt 5: Config anpassen (wenn Shelly installiert ist)

### Via ADB die config.js bearbeiten

```bash
# Config vom Gerät holen
./adb pull /sdcard/energy-dashboard/config.js ./config_temp.js

# Bearbeiten (IP-Adresse und Strompreis eintragen)
nano ./config_temp.js

# Zurück auf Gerät kopieren
./adb push ./config_temp.js /sdcard/energy-dashboard/config.js
```

### Oder neue config.js direkt erstellen

```bash
cat << 'EOF' > config_updated.js
const CONFIG = {
  SHELLY_IP: "192.168.1.100",  // DEINE SHELLY IP
  PRICE_PER_KWH: 0.30,         // DEIN STROMPREIS
  UPDATE_INTERVAL: 2000,
  SHELLY_USER: "",
  SHELLY_PASSWORD: "",
  CURRENCY: "€",
  DECIMALS_POWER: 0,
  DECIMALS_ENERGY: 2,
  DECIMALS_COST: 2,
};
EOF

./adb push config_updated.js /sdcard/energy-dashboard/config.js
```

---

## Schritt 6: Dashboard neu laden

In Fully Kiosk:
- 3x tippen → Einstellungen → "Reload" oder
- Gerät neustarten

---

## Fehlerbehebung

### Dashboard zeigt "Verbindung fehlgeschlagen"

1. **Shelly IP prüfen**: Ist die IP in config.js korrekt?
2. **Netzwerk prüfen**: Ist das Handy im gleichen WLAN wie der Shelly?
3. **Shelly erreichbar?**: Im normalen Browser `http://SHELLY-IP` testen

### Fully Kiosk zeigt weiße Seite

1. Pfad prüfen: `file:///sdcard/energy-dashboard/index.html`
2. Dateien prüfen: `./adb shell ls /sdcard/energy-dashboard/`
3. Berechtigungen: Fully Kiosk braucht Speicherzugriff

### Kiosk-Modus verlassen

- **Mit Fully Kiosk PIN**: 3x tippen → PIN eingeben
- **Via ADB**: `./adb shell am start -n "com.afwsamples.testdpc/.PolicyManagementActivity"`

---

## Später: Migration zu Raspberry Pi

Wenn du später einen Raspberry Pi einrichtest:

1. Dashboard-Ordner auf Pi kopieren
2. Nginx installieren: `sudo apt install nginx`
3. Dashboard in `/var/www/html/energy-dashboard/` kopieren
4. In Fully Kiosk die URL ändern: `http://PI-IP/energy-dashboard/`

Vorteil: Mehrere Displays können das gleiche Dashboard anzeigen.

---

## Quick Reference - Befehle

```bash
# Dashboard-Dateien auf Android kopieren
./adb push index.html /sdcard/energy-dashboard/
./adb push config.js /sdcard/energy-dashboard/
./adb push app.js /sdcard/energy-dashboard/

# Fully Kiosk starten
./adb shell am start -n de.ozerov.fully/.FullyKioskActivity

# Config aktualisieren
./adb push config.js /sdcard/energy-dashboard/config.js

# Dateien prüfen
./adb shell ls -la /sdcard/energy-dashboard/

# TestDPC öffnen (für Kiosk-Einstellungen)
./adb shell am start -n "com.afwsamples.testdpc/.PolicyManagementActivity"
```
