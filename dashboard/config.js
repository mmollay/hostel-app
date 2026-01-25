const CONFIG = {
  // App Version
  VERSION: "v0.5.2",

  // API Proxy URL (Cloudflare Worker - hält Auth-Key sicher)
  API_PROXY_URL: "https://hostel-app-api.office-509.workers.dev",

  // Für lokale Entwicklung: Direkte Cloud API Verbindung
  // ACHTUNG: Diese Werte NICHT committen wenn das Repo public ist!
  SHELLY_CLOUD_SERVER: "https://shelly-237-eu.shelly.cloud",
  SHELLY_AUTH_KEY: "", // Lokal setzen oder Worker nutzen
  SHELLY_DEVICE_ID: "", // Lokal setzen oder Worker nutzen

  // Fallback: Lokale IP (wenn im selben Netzwerk)
  SHELLY_IP: "192.168.1.107",

  // Strompreis in €/kWh (Österreich Durchschnitt ~0.25-0.35)
  PRICE_PER_KWH: 0.3,

  // Aktualisierungsintervall in Millisekunden (30s wegen Shelly Cloud Rate Limit)
  UPDATE_INTERVAL: 30000,

  // Anzeige-Einstellungen
  CURRENCY: "€",
  DECIMALS_POWER: 0,
  DECIMALS_ENERGY: 2,
  DECIMALS_COST: 2,

  // Google Maps API Key (für Empfehlungen in der Umgebung)
  // Kostenlos erstellen: https://console.cloud.google.com/
  // APIs aktivieren: Places API (New) + Maps JavaScript API
  GOOGLE_MAPS_API_KEY: "AIzaSyD96KZTjSABxmBHZGwmSLZdJI94Za0lHtA",

  // OpenWeatherMap API Key (für Wettervorhersage)
  // Kostenlos: https://openweathermap.org/api (1000 calls/Tag gratis)
  OPENWEATHER_API_KEY: "00e7bb28c3877b28d2bbd88dfed06278",
};
