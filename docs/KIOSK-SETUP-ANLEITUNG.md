# Android Kiosk-Modus Setup Anleitung

Diese Anleitung beschreibt, wie ein Android-Gerät (getestet mit Samsung Galaxy M32, Android 13) als dediziertes Kiosk-Gerät für die Shelly Smart Control App konfiguriert wird.

## Voraussetzungen

### Auf dem Computer
- ADB (Android Debug Bridge) installiert
- Working Directory: Ordner mit `adb` Binary (z.B. `platform-tools`)

### Auf dem Android-Gerät
- **Entwickleroptionen aktiviert**
  - Einstellungen → Über das Telefon → 7x auf "Buildnummer" tippen
- **USB-Debugging aktiviert**
  - Einstellungen → Entwickleroptionen → USB-Debugging → Ein
- **Gerät per USB verbunden**

### Benötigte Dateien
- `TestDPC.apk` - Download: https://github.com/googlesamples/android-testdpc/releases
- `Shelly Smart Control` XAPK - Download von APKPure oder ähnlich

---

## Schritt 1: Gerät vorbereiten

```bash
# In den platform-tools Ordner wechseln
cd /path/to/platform-tools

# Prüfen ob Gerät erkannt wird
./adb devices

# Erwartete Ausgabe:
# List of devices attached
# RF8R70SRPZH    device
```

Falls "unauthorized" erscheint: USB-Debugging-Berechtigung auf dem Gerät bestätigen.

---

## Schritt 2: Factory Reset (empfohlen für neue Kiosk-Geräte)

```bash
# Gerät komplett zurücksetzen
./adb shell am broadcast -a android.intent.action.FACTORY_RESET
```

Alternativ: Manuell über Einstellungen → Allgemeine Verwaltung → Zurücksetzen

**Nach dem Reset:** Gerät neu einrichten, aber KEIN Google-Konto hinzufügen (wichtig für Device Owner Setup).

---

## Schritt 3: TestDPC als Device Owner einrichten

### 3.1 TestDPC installieren

```bash
./adb install TestDPC.apk
```

### 3.2 TestDPC als Device Owner setzen

**WICHTIG:** Dies funktioniert nur wenn:
- Kein Google-Konto auf dem Gerät eingerichtet ist
- Oder das Gerät gerade erst zurückgesetzt wurde

```bash
./adb shell dpm set-device-owner com.afwsamples.testdpc/.DeviceAdminReceiver
```

Erwartete Ausgabe:
```
Success: Device owner set to package com.afwsamples.testdpc
Active admin set to component {com.afwsamples.testdpc/com.afwsamples.testdpc.DeviceAdminReceiver}
```

### 3.3 Device Owner Status prüfen

```bash
./adb shell dpm list-owners
```

Erwartete Ausgabe:
```
Device Owner: com.afwsamples.testdpc/.DeviceAdminReceiver
```

---

## Schritt 4: Shelly App installieren

### 4.1 Bei XAPK-Datei (Split APKs)

```bash
# XAPK entpacken
unzip "Shelly Smart Control.xapk" -d shelly_extracted

# In den Ordner wechseln und APKs auflisten
cd shelly_extracted
ls *.apk

# Alle APKs installieren
./adb install-multiple *.apk
```

### 4.2 Bei normaler APK

```bash
./adb install shelly-smart-control.apk
```

### 4.3 Installation prüfen

```bash
./adb shell pm list packages | grep shelly
# Erwartete Ausgabe: package:cloud.shelly.smartcontrol
```

---

## Schritt 5: Shelly zur Lock Task Whitelist hinzufügen

### 5.1 TestDPC öffnen

```bash
./adb shell am start -n "com.afwsamples.testdpc/.PolicyManagementActivity"
```

### 5.2 Via UI navigieren

1. Scrollen zu **"Lock task"** Sektion
2. **"Manage lock task list"** antippen
3. **"cloud.shelly.smartcontrol"** eingeben
4. **"Add"** antippen
5. **"OK"** bestätigen

### 5.3 Whitelist prüfen (optional)

```bash
./adb shell dumpsys device_policy | grep -A20 "Lock task packages"
```

---

## Schritt 6: Lock Task Features konfigurieren

### 6.1 In TestDPC navigieren

1. TestDPC öffnen (falls nicht offen):
   ```bash
   ./adb shell am start -n "com.afwsamples.testdpc/.PolicyManagementActivity"
   ```

2. Zu **"Lock task"** Sektion scrollen
3. **"Set lock task features"** antippen

### 6.2 Features konfigurieren

Für maximale Sicherheit alle Switches **AUS** lassen:

| Feature | Empfehlung | Beschreibung |
|---------|------------|--------------|
| System info | AUS | Keine Systeminfo in Statusbar |
| Notifications | (deaktiviert) | Keine Benachrichtigungen |
| Home | AUS | Home-Button blockiert |
| Overview | (deaktiviert) | Recents blockiert |
| Global actions | **AUS** | Power-Button-Menü blockiert |
| Keyguard | AUS | Kein Sperrbildschirm |

---

## Schritt 7: Kiosk-Modus starten

### 7.1 In TestDPC navigieren

1. Scrollen zu **"Single-use devices"** Sektion
2. **"Start kiosk mode"** antippen

### 7.2 Shelly auswählen

1. In der App-Liste zu **"Shelly Smart Control"** scrollen
2. Checkbox aktivieren
3. **"OK"** antippen

### 7.3 Kiosk-Modus verifizieren

```bash
./adb shell dumpsys activity activities | grep "mLockTaskModeState"
# Erwartete Ausgabe: mLockTaskModeState=LOCKED
```

---

## Schritt 8: Shelly App starten

Nach dem Aktivieren des Kiosk-Modus erscheint die Kiosk-Auswahl. Shelly antippen um die App zu starten.

Oder via ADB:
```bash
./adb shell am start -n cloud.shelly.smartcontrol/.activities.MainActivity
```

---

## Schritt 9: Neustart testen

```bash
# Gerät neustarten
./adb reboot

# Warten (ca. 60 Sekunden)
sleep 60

# Status prüfen
./adb shell dumpsys activity activities | grep "mLockTaskModeState"
# Erwartete Ausgabe: mLockTaskModeState=LOCKED
```

Nach dem Neustart sollte automatisch die Kiosk-Auswahl erscheinen.

---

## Zusätzliche Konfiguration (Optional)

### Bildschirm immer an lassen

```bash
# Bildschirm-Timeout auf Maximum
./adb shell settings put system screen_off_timeout 2147483647

# Bildschirm an lassen wenn Ladekabel angeschlossen
./adb shell svc power stayon true
```

### WLAN konfigurieren

```bash
# WLAN aktivieren
./adb shell svc wifi enable

# Verbindung manuell auf Gerät einrichten oder:
./adb shell cmd wifi connect-network "SSID" wpa2 "PASSWORD"
```

---

## Kiosk-Modus beenden (Admin)

### Methode 1: Über UI
1. Home-Button drücken → Kiosk-Auswahl erscheint
2. **"Stop kiosk mode"** antippen

### Methode 2: Über ADB

```bash
# TestDPC Policy Management öffnen
./adb shell am start -n "com.afwsamples.testdpc/.PolicyManagementActivity"

# Dann in UI: Lock task → Stop lock task mode
```

### Methode 3: Device Owner entfernen (Vorsicht!)

```bash
# Entfernt alle Kiosk-Einstellungen
./adb shell dpm remove-active-admin com.afwsamples.testdpc/.DeviceAdminReceiver
```

---

## Fehlerbehebung

### "Device owner already set" Fehler

```bash
# Aktuellen Owner prüfen
./adb shell dpm list-owners

# Falls nötig, Factory Reset durchführen
```

### "Not allowed to set device owner" Fehler

Das Gerät hat bereits ein Google-Konto. Lösungen:
1. Alle Konten entfernen (Einstellungen → Konten)
2. Oder Factory Reset durchführen

### Lock Task Mode nicht persistent

Stellen Sie sicher, dass:
1. TestDPC als **Device Owner** (nicht nur Device Admin) eingerichtet ist
2. **"Start kiosk mode"** verwendet wird (nicht "Self-start lock task mode")
3. Der Status `LOCKED` ist (nicht nur `PINNED`)

### Shelly startet nicht automatisch nach Reboot

Das ist normales Verhalten. Nach dem Reboot erscheint die Kiosk-Auswahl, von der Shelly gestartet werden muss. Um Shelly direkt zu starten:

```bash
./adb shell am start -n cloud.shelly.smartcontrol/.activities.MainActivity
```

---

## Quick Reference - Wichtige Befehle

```bash
# Gerät verbinden und prüfen
./adb devices

# TestDPC als Device Owner setzen
./adb shell dpm set-device-owner com.afwsamples.testdpc/.DeviceAdminReceiver

# Device Owner Status prüfen
./adb shell dpm list-owners

# TestDPC öffnen
./adb shell am start -n "com.afwsamples.testdpc/.PolicyManagementActivity"

# Shelly starten
./adb shell am start -n cloud.shelly.smartcontrol/.activities.MainActivity

# Lock Task Status prüfen
./adb shell dumpsys activity activities | grep "mLockTaskModeState"

# Aktuelle App prüfen
./adb shell dumpsys activity activities | grep "topResumedActivity"

# Gerät neustarten
./adb reboot
```

---

## Geräte-Informationen (Referenz)

| Feld | Wert |
|------|------|
| Gerät | Samsung Galaxy M32 |
| Android Version | 13 |
| One UI Version | 5.x |
| TestDPC Package | com.afwsamples.testdpc |
| Shelly Package | cloud.shelly.smartcontrol |
| Shelly MainActivity | cloud.shelly.smartcontrol/.activities.MainActivity |

---

## Changelog

- **2025-01-23**: Initiale Version erstellt
  - Kompletter Kiosk-Setup-Prozess dokumentiert
  - Getestet mit Samsung Galaxy M32, Android 13
  - Shelly Smart Control als Kiosk-App
