#!/bin/bash

# ============================================
# Energy Kiosk - Deploy Dashboard to Android
# ============================================

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Pfade
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DASHBOARD_DIR="$PROJECT_DIR/dashboard"
ADB_PATH="/Users/martinmollay/Downloads/platform-tools/adb"
ANDROID_PATH="/sdcard/energy-dashboard"

echo "=========================================="
echo "  Energy Kiosk - Dashboard Deployment"
echo "=========================================="
echo ""

# ADB prüfen
if [ ! -f "$ADB_PATH" ]; then
    echo -e "${RED}❌ ADB nicht gefunden: $ADB_PATH${NC}"
    exit 1
fi

# Gerät prüfen
echo "🔍 Suche nach verbundenem Gerät..."
DEVICE=$($ADB_PATH devices | grep -v "List" | grep "device$" | head -1 | cut -f1)

if [ -z "$DEVICE" ]; then
    echo -e "${RED}❌ Kein Gerät verbunden!${NC}"
    echo ""
    echo "Bitte prüfen:"
    echo "  1. USB-Kabel verbunden?"
    echo "  2. USB-Debugging aktiviert?"
    echo "  3. Verbindung auf Gerät bestätigt?"
    exit 1
fi

echo -e "${GREEN}✅ Gerät gefunden: $DEVICE${NC}"
echo ""

# Ordner erstellen
echo "📁 Erstelle Ordner auf Android..."
$ADB_PATH shell mkdir -p $ANDROID_PATH

# Dashboard-Dateien prüfen
if [ ! -f "$DASHBOARD_DIR/index.html" ]; then
    echo -e "${RED}❌ Dashboard-Dateien nicht gefunden in: $DASHBOARD_DIR${NC}"
    exit 1
fi

# Dateien kopieren
echo "📤 Kopiere Dashboard-Dateien..."
echo ""

for file in index.html config.js app.js; do
    if [ -f "$DASHBOARD_DIR/$file" ]; then
        echo -n "   $file ... "
        $ADB_PATH push "$DASHBOARD_DIR/$file" "$ANDROID_PATH/" > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC}"
        else
            echo -e "${RED}✗${NC}"
        fi
    fi
done

echo ""

# Verifizieren
echo "🔍 Verifiziere Installation..."
FILES=$($ADB_PATH shell ls $ANDROID_PATH/ 2>/dev/null)

if echo "$FILES" | grep -q "index.html"; then
    echo -e "${GREEN}✅ Dashboard erfolgreich installiert!${NC}"
else
    echo -e "${RED}❌ Installation fehlgeschlagen${NC}"
    exit 1
fi

echo ""
echo "=========================================="
echo "  Nächste Schritte:"
echo "=========================================="
echo ""
echo "  1. Fully Kiosk Browser öffnen"
echo "  2. URL setzen: file://$ANDROID_PATH/index.html"
echo "  3. Oder Gerät neustarten"
echo ""
echo -e "${YELLOW}💡 Tipp: Config anpassen in dashboard/config.js${NC}"
echo ""
