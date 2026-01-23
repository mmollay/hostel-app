/**
 * Energy Kiosk Dashboard - Extended Version
 * ==========================================
 * - Phase monitoring
 * - Feed-in detection
 * - CO2 tracking
 * - Peak power
 * - Admin settings
 */

// Energie-Daten Speicher
let energyData = {
  todayStart: null,
  todayEnergy: 0,
  yesterdayEnergy: 0,
  monthEnergy: 0,
  lastReset: null,
  peakPower: 0,
  peakPowerDate: null,
};

// Server-Einstellungen (werden von API geladen)
let settings = {
  pricePerKwh: 0.29,
  currency: "€",
  co2PerKwh: 0.2,
};

// Admin-Session
let adminToken = null;

// LocalStorage Keys
const STORAGE_KEY = "shelly_energy_data";
const ADMIN_TOKEN_KEY = "energy_kiosk_admin";

/**
 * Initialisierung
 */
function init() {
  loadStoredData();
  loadAdminSession();
  checkDayReset();
  fetchData();
  setInterval(fetchData, CONFIG.UPDATE_INTERVAL);
  scheduleDailyReset();
  initAdminUI();
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
 * Admin-Session laden
 */
function loadAdminSession() {
  try {
    adminToken = localStorage.getItem(ADMIN_TOKEN_KEY);
    updateAdminButton();
  } catch (e) {
    adminToken = null;
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
      // Monatsenergie akkumulieren
      energyData.monthEnergy += energyData.todayEnergy;
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
    energyData.peakPower = 0;
    energyData.peakPowerDate = today;
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
  tomorrow.setHours(0, 0, 5, 0);

  const msUntilMidnight = tomorrow - now;

  setTimeout(() => {
    checkDayReset();
    scheduleDailyReset();
  }, msUntilMidnight);
}

/**
 * Daten vom API abrufen
 */
async function fetchData() {
  try {
    const response = await fetch(CONFIG.API_PROXY_URL);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.isok) {
      const errorMsg = Array.isArray(result.errors)
        ? result.errors.join(", ")
        : typeof result.errors === "string"
          ? result.errors
          : "API Fehler";
      throw new Error(errorMsg);
    }

    // Einstellungen vom Server übernehmen
    if (result.settings) {
      settings = { ...settings, ...result.settings };
      updatePriceDisplay();
    }

    const data = result.data.device_status;
    const emData = data["em:0"] || {};
    const emDataEnergy = data["emdata:0"] || {};

    // Daten für UI aufbereiten
    const statusData = {
      a_act_power: emData.a_act_power || 0,
      b_act_power: emData.b_act_power || 0,
      c_act_power: emData.c_act_power || 0,
      total_act_power: emData.total_act_power || 0,
      total_act_energy: (emDataEnergy.total_act || 0) * 1000, // kWh to Wh
    };

    updateUI(statusData);
    showConnected();
  } catch (error) {
    console.error("Fehler beim Abrufen der Daten:", error);
    showError();
  }
}

/**
 * UI aktualisieren
 */
function updateUI(status) {
  // Aktuelle Leistung (kann negativ sein = Einspeisung)
  const totalPower = status.total_act_power || 0;
  const displayPower = Math.abs(Math.round(totalPower));
  const isFeeding = totalPower < 0;

  // Hauptanzeige
  const powerEl = document.getElementById("currentPower");
  powerEl.textContent = formatNumber(displayPower, 0);
  powerEl.className = `value ${isFeeding ? "feeding" : "consuming"}`;

  // Einspeisung-Indikator
  const feedIndicator = document.getElementById("feedIndicator");
  feedIndicator.classList.toggle("active", isFeeding);

  // Label anpassen
  document.querySelector(".current-power .label").textContent = isFeeding
    ? "Aktuelle Einspeisung"
    : "Aktueller Verbrauch";

  // Phasen anzeigen
  updatePhase("phaseA", status.a_act_power);
  updatePhase("phaseB", status.b_act_power);
  updatePhase("phaseC", status.c_act_power);

  // Peak Power tracken (nur bei Verbrauch)
  if (!isFeeding && displayPower > energyData.peakPower) {
    energyData.peakPower = displayPower;
  }
  document.getElementById("peakPower").textContent = formatNumber(
    energyData.peakPower,
    0,
  );

  // Gesamtenergie vom Gerät
  const totalEnergy = (status.total_act_energy || 0) / 1000;

  // Tagesenergie berechnen
  if (energyData.todayStart === null) {
    energyData.todayStart = totalEnergy;
  }

  energyData.todayEnergy = Math.max(0, totalEnergy - energyData.todayStart);

  // Kosten berechnen mit Server-Preis
  const pricePerKwh = settings.pricePerKwh;

  // CO2 berechnen
  const co2Today = energyData.todayEnergy * settings.co2PerKwh;
  document.getElementById("co2Today").textContent = formatNumber(co2Today, 2);

  // Heute
  document.getElementById("todayEnergy").textContent = formatNumber(
    energyData.todayEnergy,
    CONFIG.DECIMALS_ENERGY,
  );
  document.getElementById("todayCost").textContent = formatNumber(
    energyData.todayEnergy * pricePerKwh,
    CONFIG.DECIMALS_COST,
  );

  // Gestern
  document.getElementById("yesterdayEnergy").textContent = formatNumber(
    energyData.yesterdayEnergy,
    CONFIG.DECIMALS_ENERGY,
  );
  document.getElementById("yesterdayCost").textContent = formatNumber(
    energyData.yesterdayEnergy * pricePerKwh,
    CONFIG.DECIMALS_COST,
  );

  // Monat
  const monthTotal = energyData.monthEnergy + energyData.todayEnergy;
  document.getElementById("monthEnergy").textContent = formatNumber(
    monthTotal,
    CONFIG.DECIMALS_ENERGY,
  );
  document.getElementById("monthCost").textContent = formatNumber(
    monthTotal * pricePerKwh,
    CONFIG.DECIMALS_COST,
  );

  // Letzte Aktualisierung
  document.getElementById("lastUpdate").textContent =
    new Date().toLocaleTimeString("de-DE");

  saveData();
}

/**
 * Phase-Wert aktualisieren
 */
function updatePhase(elementId, power) {
  const el = document.getElementById(elementId);
  const value = Math.round(power || 0);
  el.textContent = formatNumber(Math.abs(value), 0);

  el.className = "phase-value";
  if (value > 5) {
    el.classList.add("positive");
  } else if (value < -5) {
    el.classList.add("negative");
  } else {
    el.classList.add("neutral");
  }
}

/**
 * Preis-Anzeige aktualisieren
 */
function updatePriceDisplay() {
  const cents = Math.round(settings.pricePerKwh * 100);
  document.getElementById("priceDisplay").textContent = cents;
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

// ==========================================
// ADMIN FUNKTIONEN
// ==========================================

/**
 * Admin UI initialisieren
 */
function initAdminUI() {
  // Admin Button
  document.getElementById("adminBtn").addEventListener("click", () => {
    if (adminToken) {
      openSettingsModal();
    } else {
      openLoginModal();
    }
  });

  // Login Modal
  document.getElementById("loginBtn").addEventListener("click", handleLogin);
  document
    .getElementById("closeLoginBtn")
    .addEventListener("click", closeLoginModal);
  document.getElementById("loginPassword").addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleLogin();
  });

  // Settings Modal
  document
    .getElementById("saveSettingsBtn")
    .addEventListener("click", handleSaveSettings);
  document
    .getElementById("closeSettingsBtn")
    .addEventListener("click", closeSettingsModal);
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);

  // Modal schließen bei Klick außerhalb
  document.getElementById("loginModal").addEventListener("click", (e) => {
    if (e.target.id === "loginModal") closeLoginModal();
  });
  document.getElementById("settingsModal").addEventListener("click", (e) => {
    if (e.target.id === "settingsModal") closeSettingsModal();
  });
}

/**
 * Login Modal öffnen
 */
function openLoginModal() {
  document.getElementById("loginModal").classList.add("active");
  document.getElementById("loginPassword").value = "";
  document.getElementById("loginError").style.display = "none";
  document.getElementById("loginPassword").focus();
}

/**
 * Login Modal schließen
 */
function closeLoginModal() {
  document.getElementById("loginModal").classList.remove("active");
}

/**
 * Login durchführen
 */
async function handleLogin() {
  const password = document.getElementById("loginPassword").value;

  if (!password) return;

  try {
    const response = await fetch(`${CONFIG.API_PROXY_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const result = await response.json();

    if (result.success) {
      adminToken = result.token;
      localStorage.setItem(ADMIN_TOKEN_KEY, adminToken);
      updateAdminButton();
      closeLoginModal();
      openSettingsModal();
    } else {
      document.getElementById("loginError").style.display = "block";
    }
  } catch (error) {
    console.error("Login error:", error);
    document.getElementById("loginError").style.display = "block";
  }
}

/**
 * Settings Modal öffnen
 */
function openSettingsModal() {
  document.getElementById("settingsModal").classList.add("active");
  document.getElementById("settingsPrice").value = Math.round(
    settings.pricePerKwh * 100,
  );
  document.getElementById("settingsCO2").value = settings.co2PerKwh;
  document.getElementById("settingsError").style.display = "none";
  document.getElementById("settingsSuccess").style.display = "none";
}

/**
 * Settings Modal schließen
 */
function closeSettingsModal() {
  document.getElementById("settingsModal").classList.remove("active");
}

/**
 * Einstellungen speichern
 */
async function handleSaveSettings() {
  const priceCents = parseFloat(document.getElementById("settingsPrice").value);
  const co2 = parseFloat(document.getElementById("settingsCO2").value);

  if (isNaN(priceCents) || priceCents < 0) {
    document.getElementById("settingsError").textContent = "Ungültiger Preis";
    document.getElementById("settingsError").style.display = "block";
    return;
  }

  try {
    const response = await fetch(`${CONFIG.API_PROXY_URL}/settings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        pricePerKwh: priceCents / 100,
        co2PerKwh: co2 || 0.2,
      }),
    });

    const result = await response.json();

    if (result.success) {
      settings = { ...settings, ...result.settings };
      updatePriceDisplay();
      document.getElementById("settingsSuccess").style.display = "block";
      document.getElementById("settingsError").style.display = "none";

      // Nach 2 Sekunden schließen
      setTimeout(closeSettingsModal, 1500);
    } else {
      throw new Error(result.error || "Speichern fehlgeschlagen");
    }
  } catch (error) {
    console.error("Save settings error:", error);
    document.getElementById("settingsError").textContent = error.message;
    document.getElementById("settingsError").style.display = "block";

    // Bei Auth-Fehler ausloggen
    if (
      error.message.includes("Unauthorized") ||
      error.message.includes("Invalid")
    ) {
      handleLogout();
    }
  }
}

/**
 * Logout
 */
function handleLogout() {
  adminToken = null;
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  updateAdminButton();
  closeSettingsModal();
}

/**
 * Admin Button Status aktualisieren
 */
function updateAdminButton() {
  const btn = document.getElementById("adminBtn");
  btn.classList.toggle("logged-in", !!adminToken);
  btn.title = adminToken ? "Einstellungen" : "Admin Login";
}

// App starten
document.addEventListener("DOMContentLoaded", init);
