/**
 * Shelly Pro 3EM Dashboard - App Logic
 * =====================================
 */

// Speicher für Energiedaten
let energyData = {
  todayStart: null,
  todayEnergy: 0,
  yesterdayEnergy: 0,
  monthEnergy: 0,
  lastReset: null,
};

// LocalStorage Key
const STORAGE_KEY = "shelly_energy_data";

/**
 * Initialisierung
 */
function init() {
  loadStoredData();
  checkDayReset();
  fetchData();
  setInterval(fetchData, CONFIG.UPDATE_INTERVAL);

  // Täglich um Mitternacht zurücksetzen
  scheduleDailyReset();
}

/**
 * Gespeicherte Daten laden
 */
function loadStoredData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      energyData = { ...energyData, ...data };
    }
  } catch (e) {
    console.error("Fehler beim Laden der Daten:", e);
  }
}

/**
 * Daten speichern
 */
function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(energyData));
  } catch (e) {
    console.error("Fehler beim Speichern:", e);
  }
}

/**
 * Prüfen ob ein neuer Tag begonnen hat
 */
function checkDayReset() {
  const today = new Date().toDateString();

  if (energyData.lastReset !== today) {
    // Gestern speichern
    if (energyData.lastReset) {
      energyData.yesterdayEnergy = energyData.todayEnergy;
    }

    // Neuen Monat prüfen
    const lastDate = energyData.lastReset
      ? new Date(energyData.lastReset)
      : null;
    const now = new Date();

    if (!lastDate || lastDate.getMonth() !== now.getMonth()) {
      energyData.monthEnergy = 0;
    }

    // Heute zurücksetzen
    energyData.todayStart = null;
    energyData.todayEnergy = 0;
    energyData.lastReset = today;
    saveData();
  }
}

/**
 * Täglichen Reset planen
 */
function scheduleDailyReset() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 5, 0); // 00:00:05

  const msUntilMidnight = tomorrow - now;

  setTimeout(() => {
    checkDayReset();
    scheduleDailyReset();
  }, msUntilMidnight);
}

/**
 * Daten vom Shelly Pro 3EM abrufen
 */
async function fetchData() {
  try {
    // Cloud API nutzen wenn API_PROXY_URL oder SHELLY_AUTH_KEY gesetzt
    if (CONFIG.API_PROXY_URL || CONFIG.SHELLY_AUTH_KEY) {
      await fetchFromCloud();
    } else {
      await fetchFromLocal();
    }
  } catch (error) {
    console.error("Fehler beim Abrufen der Daten:", error);
    showError();
  }
}

/**
 * Daten über Shelly Cloud API abrufen
 * Nutzt API_PROXY_URL wenn gesetzt, sonst direkte Cloud API
 */
async function fetchFromCloud() {
  let response;

  if (CONFIG.API_PROXY_URL) {
    // Produktion: Über Cloudflare Worker Proxy (Auth-Key sicher auf Server)
    response = await fetch(CONFIG.API_PROXY_URL);
  } else {
    // Lokal: Direkte Cloud API Verbindung
    const url = `${CONFIG.SHELLY_CLOUD_SERVER}/device/status`;
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `auth_key=${encodeURIComponent(CONFIG.SHELLY_AUTH_KEY)}&id=${encodeURIComponent(CONFIG.SHELLY_DEVICE_ID)}`,
    });
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.isok) {
    const errorMsg = Array.isArray(result.errors)
      ? result.errors.join(", ")
      : typeof result.errors === "string"
        ? result.errors
        : "Cloud API Fehler";
    throw new Error(errorMsg);
  }

  const data = result.data.device_status;

  // Cloud API liefert em:0 für EM-Daten
  const emData = data["em:0"] || {};
  const emDataEnergy = data["emdata:0"] || {};

  // Konvertiere Cloud-Format zu lokalem Format
  const statusData = {
    a_act_power: emData.a_act_power || 0,
    b_act_power: emData.b_act_power || 0,
    c_act_power: emData.c_act_power || 0,
    total_act_energy: (emDataEnergy.total_act || 0) * 1000, // kWh to Wh
  };

  updateUI(statusData, {});
  showConnected();
}

/**
 * Daten über lokale IP abrufen (Fallback)
 */
async function fetchFromLocal() {
  const shellyUrl = `http://${CONFIG.SHELLY_IP}`;

  const headers = {};
  if (CONFIG.SHELLY_USER && CONFIG.SHELLY_PASSWORD) {
    headers["Authorization"] =
      "Basic " + btoa(`${CONFIG.SHELLY_USER}:${CONFIG.SHELLY_PASSWORD}`);
  }

  const statusResponse = await fetch(`${shellyUrl}/rpc/EM.GetStatus?id=0`, {
    headers,
  });
  const statusData = await statusResponse.json();

  const energyResponse = await fetch(`${shellyUrl}/rpc/EMData.GetStatus?id=0`, {
    headers,
  });
  const emData = await energyResponse.json();

  updateUI(statusData, emData);
  showConnected();
}

/**
 * UI aktualisieren
 */
function updateUI(status, emData) {
  // Aktuelle Leistung (Summe aller 3 Phasen)
  const currentPower = Math.abs(
    (status.a_act_power || 0) +
      (status.b_act_power || 0) +
      (status.c_act_power || 0),
  );

  document.getElementById("currentPower").textContent = formatNumber(
    currentPower,
    CONFIG.DECIMALS_POWER,
  );

  // Gesamtenergie vom Gerät (in Wh, umrechnen in kWh)
  const totalEnergy = (status.total_act_energy || 0) / 1000;

  // Tagesenergie berechnen
  if (energyData.todayStart === null) {
    energyData.todayStart = totalEnergy;
  }

  energyData.todayEnergy = Math.max(0, totalEnergy - energyData.todayStart);

  // Monatsenergie akkumulieren
  // (Bei echtem Einsatz sollte dies präziser über die Shelly Cloud oder EMData erfolgen)

  // UI Updates
  document.getElementById("todayEnergy").textContent = formatNumber(
    energyData.todayEnergy,
    CONFIG.DECIMALS_ENERGY,
  );
  document.getElementById("todayCost").textContent = formatNumber(
    energyData.todayEnergy * CONFIG.PRICE_PER_KWH,
    CONFIG.DECIMALS_COST,
  );

  document.getElementById("yesterdayEnergy").textContent = formatNumber(
    energyData.yesterdayEnergy,
    CONFIG.DECIMALS_ENERGY,
  );
  document.getElementById("yesterdayCost").textContent = formatNumber(
    energyData.yesterdayEnergy * CONFIG.PRICE_PER_KWH,
    CONFIG.DECIMALS_COST,
  );

  // Monatsenergie: Heute + gespeicherte vorherige Tage
  const monthTotal = energyData.monthEnergy + energyData.todayEnergy;
  document.getElementById("monthEnergy").textContent = formatNumber(
    monthTotal,
    CONFIG.DECIMALS_ENERGY,
  );
  document.getElementById("monthCost").textContent = formatNumber(
    monthTotal * CONFIG.PRICE_PER_KWH,
    CONFIG.DECIMALS_COST,
  );

  // Letzte Aktualisierung
  document.getElementById("lastUpdate").textContent =
    new Date().toLocaleTimeString("de-DE");

  // Daten speichern
  saveData();
}

/**
 * Zahl formatieren
 */
function formatNumber(num, decimals) {
  return num.toLocaleString("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Verbindungsstatus: OK
 */
function showConnected() {
  document.getElementById("errorMessage").style.display = "none";
  document.getElementById("dashboard").style.display = "block";
  document.getElementById("statusIndicator").classList.remove("error");
}

/**
 * Verbindungsstatus: Fehler
 */
function showError() {
  document.getElementById("errorMessage").style.display = "block";
  document.getElementById("statusIndicator").classList.add("error");
}

// App starten
document.addEventListener("DOMContentLoaded", init);
