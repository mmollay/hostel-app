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
    const shellyUrl = `http://${CONFIG.SHELLY_IP}`;

    // Auth Header falls nötig
    const headers = {};
    if (CONFIG.SHELLY_USER && CONFIG.SHELLY_PASSWORD) {
      headers["Authorization"] =
        "Basic " + btoa(`${CONFIG.SHELLY_USER}:${CONFIG.SHELLY_PASSWORD}`);
    }

    // Aktuelle Leistung abrufen (EM.GetStatus)
    const statusResponse = await fetch(`${shellyUrl}/rpc/EM.GetStatus?id=0`, {
      headers,
    });
    const statusData = await statusResponse.json();

    // Energie-Daten abrufen (EMData.GetStatus)
    const energyResponse = await fetch(
      `${shellyUrl}/rpc/EMData.GetStatus?id=0`,
      { headers },
    );
    const emData = await energyResponse.json();

    // UI aktualisieren
    updateUI(statusData, emData);
    showConnected();
  } catch (error) {
    console.error("Fehler beim Abrufen der Daten:", error);
    showError();
  }
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
