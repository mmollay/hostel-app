/**
 * Shelly Pro 3EM Dashboard - Konfiguration
 * =========================================
 *
 * Hier die Einstellungen für dein Shelly Pro 3EM anpassen:
 */

const CONFIG = {
  // ============================================
  // SHELLY PRO 3EM - IP-ADRESSE
  // ============================================
  // Die IP-Adresse deines Shelly Pro 3EM im lokalen Netzwerk
  // Beispiel: "192.168.1.100"
  //
  // So findest du die IP:
  // 1. Shelly App öffnen → Gerät auswählen → Einstellungen → Geräteinfo
  // 2. Oder im Router unter verbundene Geräte nachschauen
  //
  SHELLY_IP: "192.168.1.XXX", // <-- HIER ANPASSEN!

  // ============================================
  // STROMPREIS
  // ============================================
  // Preis pro kWh in Euro (Cent als Dezimalzahl)
  // Beispiel: 0.30 = 30 Cent pro kWh
  //
  PRICE_PER_KWH: 0.3, // <-- HIER ANPASSEN!

  // ============================================
  // AKTUALISIERUNGSINTERVALL
  // ============================================
  // Wie oft die Daten aktualisiert werden (in Millisekunden)
  // 2000 = alle 2 Sekunden
  // 5000 = alle 5 Sekunden
  //
  UPDATE_INTERVAL: 2000,

  // ============================================
  // AUTHENTIFIZIERUNG (optional)
  // ============================================
  // Falls dein Shelly passwortgeschützt ist
  // Leer lassen wenn kein Passwort gesetzt
  //
  SHELLY_USER: "", // Benutzername (meist "admin")
  SHELLY_PASSWORD: "", // Passwort

  // ============================================
  // WÄHRUNG
  // ============================================
  CURRENCY: "€",

  // ============================================
  // DEZIMALSTELLEN
  // ============================================
  DECIMALS_POWER: 0, // Aktuelle Leistung (Watt)
  DECIMALS_ENERGY: 2, // Energie (kWh)
  DECIMALS_COST: 2, // Kosten (Euro)
};
