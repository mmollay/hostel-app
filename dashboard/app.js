/**
 * Hostel-App Dashboard - Guest Portal
 * ==========================================
 * - Guest login system
 * - Personalized greetings
 * - Energy monitoring (for logged-in guests)
 * - Weather widget
 * - Local recommendations
 * - Night mode
 * - Easter eggs
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

// Guest-Session
let guestToken = null;
let guestData = null;

// LocalStorage Keys
const STORAGE_KEY = "shelly_energy_data";
const GUEST_TOKEN_KEY = "hostel_guest_token";
const GUEST_DATA_KEY = "hostel_guest_data";
const NIGHT_MODE_KEY = "hostel_night_mode";

// Hollenthon Koordinaten für Wetter
const LOCATION = {
  lat: 47.5833,
  lon: 16.1667,
  name: "Hollenthon",
};

/**
 * Initialisierung
 */
function init() {
  loadStoredData();
  loadGuestSession();
  applyNightMode();
  checkDayReset();
  fetchData();
  setInterval(fetchData, CONFIG.UPDATE_INTERVAL);
  scheduleDailyReset();
  initGuestUI();
  updateGreeting();
  setInterval(updateGreeting, 60000); // Aktualisiere Begrüßung jede Minute

  // Wetter laden
  if (guestToken) {
    fetchWeather();
    setInterval(fetchWeather, 600000); // Alle 10 Minuten
  }
}

/**
 * Gespeicherte Daten laden
 */
function loadStoredData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      // Reset wenn Werte unrealistisch hoch (alter Bug mit *1000)
      if (data.todayEnergy > 100 || data.monthEnergy > 1000) {
        console.log("Alte fehlerhafte Daten erkannt, wird zurückgesetzt");
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      energyData = { ...energyData, ...data };
    }
  } catch (e) {
    console.error("Fehler beim Laden der Daten:", e);
  }
}

/**
 * Guest-Session laden
 */
function loadGuestSession() {
  try {
    guestToken = localStorage.getItem(GUEST_TOKEN_KEY);
    const storedData = localStorage.getItem(GUEST_DATA_KEY);
    if (guestToken && storedData) {
      guestData = JSON.parse(storedData);
      updateGuestUI();
    }
  } catch (e) {
    guestToken = null;
    guestData = null;
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
      total_act_energy: emDataEnergy.total_act || 0, // Shelly liefert Wh
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
  if (powerEl) {
    powerEl.textContent = formatNumber(displayPower, 0);
    powerEl.className = `value ${isFeeding ? "feeding" : "consuming"}`;
  }

  // Einspeisung-Indikator
  const feedIndicator = document.getElementById("feedIndicator");
  if (feedIndicator) {
    feedIndicator.classList.toggle("active", isFeeding);
  }

  // Label anpassen
  const statusEl = document.getElementById("energyStatus");
  if (statusEl) {
    statusEl.textContent = isFeeding
      ? "Aktuelle Einspeisung"
      : "Aktueller Verbrauch";
  }

  // Phasen anzeigen
  updatePhase("phaseA", status.a_act_power);
  updatePhase("phaseB", status.b_act_power);
  updatePhase("phaseC", status.c_act_power);

  // Peak Power tracken (nur bei Verbrauch)
  if (!isFeeding && displayPower > energyData.peakPower) {
    energyData.peakPower = displayPower;
  }
  const peakEl = document.getElementById("peakPower");
  if (peakEl) {
    peakEl.textContent = formatNumber(energyData.peakPower, 0);
  }

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
  const co2El = document.getElementById("co2Today");
  if (co2El) {
    co2El.textContent = formatNumber(co2Today, 2);
  }

  // Heute
  const todayEnergyEl = document.getElementById("todayEnergy");
  if (todayEnergyEl) {
    todayEnergyEl.textContent = formatNumber(
      energyData.todayEnergy,
      CONFIG.DECIMALS_ENERGY,
    );
  }
  const todayCostEl = document.getElementById("todayCost");
  if (todayCostEl) {
    todayCostEl.textContent = formatNumber(
      energyData.todayEnergy * pricePerKwh,
      CONFIG.DECIMALS_COST,
    );
  }

  // Gestern
  const yesterdayEnergyEl = document.getElementById("yesterdayEnergy");
  if (yesterdayEnergyEl) {
    yesterdayEnergyEl.textContent = formatNumber(
      energyData.yesterdayEnergy,
      CONFIG.DECIMALS_ENERGY,
    );
  }
  const yesterdayCostEl = document.getElementById("yesterdayCost");
  if (yesterdayCostEl) {
    yesterdayCostEl.textContent = formatNumber(
      energyData.yesterdayEnergy * pricePerKwh,
      CONFIG.DECIMALS_COST,
    );
  }

  // Monat
  const monthTotal = energyData.monthEnergy + energyData.todayEnergy;
  const monthEnergyEl = document.getElementById("monthEnergy");
  if (monthEnergyEl) {
    monthEnergyEl.textContent = formatNumber(
      monthTotal,
      CONFIG.DECIMALS_ENERGY,
    );
  }
  const monthCostEl = document.getElementById("monthCost");
  if (monthCostEl) {
    monthCostEl.textContent = formatNumber(
      monthTotal * pricePerKwh,
      CONFIG.DECIMALS_COST,
    );
  }

  // Letzte Aktualisierung
  const lastUpdateEl = document.getElementById("lastUpdate");
  if (lastUpdateEl) {
    lastUpdateEl.textContent = new Date().toLocaleTimeString("de-DE");
  }

  saveData();
}

/**
 * Phase-Wert aktualisieren
 */
function updatePhase(elementId, power) {
  const el = document.getElementById(elementId);
  if (!el) return;

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
  const priceEl = document.getElementById("priceDisplay");
  if (priceEl) {
    priceEl.textContent = cents;
  }
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
  const errorEl = document.getElementById("errorMessage");
  const dashboardEl = document.getElementById("dashboard");
  const statusEl = document.getElementById("statusIndicator");

  if (errorEl) errorEl.style.display = "none";
  if (dashboardEl) dashboardEl.style.display = "block";
  if (statusEl) statusEl.classList.remove("error");
}

/**
 * Verbindungsstatus: Fehler
 */
function showError() {
  const errorEl = document.getElementById("errorMessage");
  const statusEl = document.getElementById("statusIndicator");

  if (errorEl) errorEl.style.display = "block";
  if (statusEl) statusEl.classList.add("error");
}

// ==========================================
// GUEST FUNKTIONEN
// ==========================================

/**
 * Guest UI initialisieren
 */
function initGuestUI() {
  // Guest Login Button
  const guestBtn = document.getElementById("guestLoginBtn");
  if (guestBtn) {
    guestBtn.addEventListener("click", () => {
      if (guestToken) {
        openGuestMenu();
      } else {
        openGuestLoginModal();
      }
    });
  }

  // Login Modal
  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    loginBtn.addEventListener("click", handleGuestLogin);
  }

  const closeLoginBtn = document.getElementById("closeLoginBtn");
  if (closeLoginBtn) {
    closeLoginBtn.addEventListener("click", closeGuestLoginModal);
  }

  const usernameInput = document.getElementById("guestUsername");
  const passwordInput = document.getElementById("guestPassword");
  if (usernameInput) {
    usernameInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleGuestLogin();
    });
  }
  if (passwordInput) {
    passwordInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleGuestLogin();
    });
  }

  // Guest Menu
  const logoutBtn = document.getElementById("guestLogoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleGuestLogout);
  }

  const closeMenuBtn = document.getElementById("closeGuestMenuBtn");
  if (closeMenuBtn) {
    closeMenuBtn.addEventListener("click", closeGuestMenu);
  }

  // Night Mode Toggle
  const nightModeToggle = document.getElementById("nightModeToggle");
  if (nightModeToggle) {
    nightModeToggle.addEventListener("click", toggleNightMode);
  }

  // Modal schließen bei Klick außerhalb
  const loginModal = document.getElementById("guestLoginModal");
  if (loginModal) {
    loginModal.addEventListener("click", (e) => {
      if (e.target.id === "guestLoginModal") closeGuestLoginModal();
    });
  }

  const guestMenu = document.getElementById("guestMenu");
  if (guestMenu) {
    guestMenu.addEventListener("click", (e) => {
      if (e.target.id === "guestMenu") closeGuestMenu();
    });
  }

  // Easter Egg: Konami Code
  initEasterEggs();
}

/**
 * Guest Login Modal öffnen
 */
function openGuestLoginModal() {
  const modal = document.getElementById("guestLoginModal");
  const usernameInput = document.getElementById("guestUsername");
  const passwordInput = document.getElementById("guestPassword");
  const errorEl = document.getElementById("loginError");

  if (modal) modal.classList.add("active");
  if (usernameInput) usernameInput.value = "";
  if (passwordInput) passwordInput.value = "";
  if (errorEl) errorEl.style.display = "none";
  if (usernameInput) usernameInput.focus();
}

/**
 * Guest Login Modal schließen
 */
function closeGuestLoginModal() {
  const modal = document.getElementById("guestLoginModal");
  if (modal) modal.classList.remove("active");
}

/**
 * Guest Login durchführen
 */
async function handleGuestLogin() {
  const username = document.getElementById("guestUsername").value;
  const password = document.getElementById("guestPassword").value;

  if (!username || !password) return;

  try {
    const response = await fetch(`${CONFIG.API_PROXY_URL}/guest/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const result = await response.json();

    if (result.success) {
      guestToken = result.token;
      guestData = result.guest;
      localStorage.setItem(GUEST_TOKEN_KEY, guestToken);
      localStorage.setItem(GUEST_DATA_KEY, JSON.stringify(guestData));

      closeGuestLoginModal();
      updateGuestUI();
      updateGreeting();
      fetchWeather();

      // Willkommens-Nachricht
      showWelcomeMessage();
    } else {
      const errorEl = document.getElementById("loginError");
      if (errorEl) {
        errorEl.textContent = result.error || "Anmeldung fehlgeschlagen";
        errorEl.style.display = "block";
      }
    }
  } catch (error) {
    console.error("Login error:", error);
    const errorEl = document.getElementById("loginError");
    if (errorEl) {
      errorEl.textContent = "Verbindungsfehler";
      errorEl.style.display = "block";
    }
  }
}

/**
 * Guest Menu öffnen
 */
function openGuestMenu() {
  const menu = document.getElementById("guestMenu");
  if (menu) menu.classList.add("active");
}

/**
 * Guest Menu schließen
 */
function closeGuestMenu() {
  const menu = document.getElementById("guestMenu");
  if (menu) menu.classList.remove("active");
}

/**
 * Guest Logout
 */
function handleGuestLogout() {
  guestToken = null;
  guestData = null;
  localStorage.removeItem(GUEST_TOKEN_KEY);
  localStorage.removeItem(GUEST_DATA_KEY);

  updateGuestUI();
  updateGreeting();
  closeGuestMenu();
}

/**
 * Guest UI Status aktualisieren
 */
function updateGuestUI() {
  const btn = document.getElementById("guestLoginBtn");
  const energyCard = document.getElementById("energyCard");
  const weatherCard = document.getElementById("weatherCard");
  const recommendationsCard = document.getElementById("recommendationsCard");
  const wifiCard = document.getElementById("wifiCard");

  if (btn) {
    btn.classList.toggle("logged-in", !!guestToken);
    const btnText = btn.querySelector("span");
    if (btnText) {
      btnText.textContent = guestToken ? guestData.name : "Anmelden";
    }
  }

  // Karten nur für eingeloggte Gäste anzeigen
  if (energyCard) energyCard.style.display = guestToken ? "block" : "none";
  if (weatherCard) weatherCard.style.display = guestToken ? "block" : "none";
  if (recommendationsCard)
    recommendationsCard.style.display = guestToken ? "block" : "none";
  if (wifiCard) wifiCard.style.display = guestToken ? "block" : "none";
}

/**
 * Personalisierte Begrüßung aktualisieren
 */
function updateGreeting() {
  const greetingEl = document.getElementById("greeting");
  const messageEl = document.getElementById("welcomeMessage");

  if (!greetingEl || !messageEl) return;

  const hour = new Date().getHours();
  let timeGreeting = "Guten Tag";

  if (hour >= 5 && hour < 12) {
    timeGreeting = "Guten Morgen";
  } else if (hour >= 12 && hour < 18) {
    timeGreeting = "Guten Tag";
  } else if (hour >= 18 && hour < 22) {
    timeGreeting = "Guten Abend";
  } else {
    timeGreeting = "Gute Nacht";
  }

  if (guestToken && guestData) {
    greetingEl.textContent = `${timeGreeting}, ${guestData.name}!`;

    // Aufenthaltsdauer berechnen
    const checkIn = new Date(guestData.checkIn);
    const checkOut = new Date(guestData.checkOut);
    const today = new Date();
    const daysRemaining = Math.ceil((checkOut - today) / (1000 * 60 * 60 * 24));

    let stayMessage =
      "Wir wünschen Ihnen einen wunderschönen Aufenthalt in Hollenthon.";
    if (daysRemaining === 1) {
      stayMessage =
        "Morgen ist Ihr letzter Tag. Wir hoffen, Sie hatten eine schöne Zeit!";
    } else if (daysRemaining > 1) {
      stayMessage = `Noch ${daysRemaining} Tage bis zum Check-out. Genießen Sie Ihren Aufenthalt!`;
    }

    messageEl.textContent = stayMessage;
  } else {
    greetingEl.textContent = `${timeGreeting}!`;
    messageEl.textContent =
      "Willkommen in Hollenthon. Bitte melden Sie sich an, um Ihren persönlichen Bereich zu sehen.";
  }
}

/**
 * Willkommens-Nachricht anzeigen
 */
function showWelcomeMessage() {
  // Kleine Animation oder Toast-Nachricht
  console.log(`Willkommen, ${guestData.name}!`);
}

/**
 * Wetter abrufen
 */
async function fetchWeather() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LOCATION.lat}&longitude=${LOCATION.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Europe/Vienna`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.current) {
      updateWeatherDisplay(data.current);
    }
  } catch (error) {
    console.error("Wetter-Fehler:", error);
  }
}

/**
 * Wetter-Anzeige aktualisieren
 */
function updateWeatherDisplay(current) {
  const tempEl = document.getElementById("weatherTemp");
  const conditionEl = document.getElementById("weatherCondition");
  const humidityEl = document.getElementById("weatherHumidity");
  const windEl = document.getElementById("weatherWind");
  const iconEl = document.getElementById("weatherIcon");

  if (tempEl) tempEl.textContent = Math.round(current.temperature_2m);
  if (humidityEl) humidityEl.textContent = current.relative_humidity_2m;
  if (windEl) windEl.textContent = Math.round(current.wind_speed_10m);

  // Wetter-Bedingung übersetzen
  const condition = getWeatherCondition(current.weather_code);
  if (conditionEl) conditionEl.textContent = condition;

  // Icon anpassen (wenn gewünscht)
  if (iconEl) {
    iconEl.setAttribute(
      "data-lucide",
      getWeatherIconName(current.weather_code),
    );
    lucide.createIcons();
  }
}

/**
 * Wetter-Code zu Text
 */
function getWeatherCondition(code) {
  const conditions = {
    0: "Klar",
    1: "Heiter",
    2: "Teilweise bewölkt",
    3: "Bewölkt",
    45: "Neblig",
    48: "Neblig",
    51: "Leichter Nieselregen",
    53: "Nieselregen",
    55: "Starker Nieselregen",
    61: "Leichter Regen",
    63: "Regen",
    65: "Starker Regen",
    71: "Leichter Schneefall",
    73: "Schneefall",
    75: "Starker Schneefall",
    95: "Gewitter",
  };
  return conditions[code] || "Unbekannt";
}

/**
 * Wetter-Icon Name
 */
function getWeatherIconName(code) {
  if (code === 0 || code === 1) return "sun";
  if (code === 2) return "cloud-sun";
  if (code === 3) return "cloud";
  if (code >= 45 && code <= 48) return "cloud-fog";
  if (code >= 51 && code <= 65) return "cloud-rain";
  if (code >= 71 && code <= 75) return "cloud-snow";
  if (code >= 95) return "cloud-lightning";
  return "cloud";
}

/**
 * Night Mode anwenden
 */
function applyNightMode() {
  const isNightMode = localStorage.getItem(NIGHT_MODE_KEY) === "true";
  document.body.classList.toggle("night-mode", isNightMode);

  const toggleBtn = document.getElementById("nightModeToggle");
  if (toggleBtn) {
    const icon = toggleBtn.querySelector("i");
    if (icon) {
      icon.setAttribute("data-lucide", isNightMode ? "sun" : "moon");
      lucide.createIcons();
    }
  }
}

/**
 * Night Mode umschalten
 */
function toggleNightMode() {
  const isNightMode = document.body.classList.toggle("night-mode");
  localStorage.setItem(NIGHT_MODE_KEY, isNightMode);

  const toggleBtn = document.getElementById("nightModeToggle");
  if (toggleBtn) {
    const icon = toggleBtn.querySelector("i");
    if (icon) {
      icon.setAttribute("data-lucide", isNightMode ? "sun" : "moon");
      lucide.createIcons();
    }
  }
}

/**
 * Easter Eggs initialisieren
 */
function initEasterEggs() {
  // Konami Code: ↑ ↑ ↓ ↓ ← → ← → B A
  const konamiCode = [
    "ArrowUp",
    "ArrowUp",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
    "b",
    "a",
  ];
  let konamiIndex = 0;

  document.addEventListener("keydown", (e) => {
    if (e.key === konamiCode[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === konamiCode.length) {
        activateEasterEgg();
        konamiIndex = 0;
      }
    } else {
      konamiIndex = 0;
    }
  });

  // Geheime Uhrzeit-Message (23:23 Uhr)
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 23 && now.getMinutes() === 23) {
      showSecretMessage();
    }
  }, 60000);
}

/**
 * Easter Egg aktivieren
 */
function activateEasterEgg() {
  // Regenbogen-Animation
  document.body.style.animation = "rainbow 3s ease-in-out";

  setTimeout(() => {
    document.body.style.animation = "";
    alert(
      "🎉 Glückwunsch! Sie haben das Easter Egg gefunden! 🎉\n\nVielen Dank, dass Sie hier sind. Wir wünschen Ihnen einen wunderschönen Aufenthalt!",
    );
  }, 3000);
}

/**
 * Geheime Nachricht anzeigen
 */
function showSecretMessage() {
  if (!document.getElementById("secretMessage")) {
    const msg = document.createElement("div");
    msg.id = "secretMessage";
    msg.style.cssText =
      "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--sage); color: white; padding: 30px; border-radius: 20px; box-shadow: 0 10px 50px rgba(0,0,0,0.3); z-index: 9999; text-align: center; font-size: 1.2rem;";

    const line1 = document.createElement("div");
    line1.textContent = "✨ 23:23 Uhr ✨";
    msg.appendChild(line1);

    const line2 = document.createElement("div");
    line2.textContent = "Zeit für Ruhe und Entspannung.";
    msg.appendChild(line2);

    const line3 = document.createElement("div");
    line3.textContent = "Gute Nacht!";
    msg.appendChild(line3);

    document.body.appendChild(msg);

    setTimeout(() => {
      msg.remove();
    }, 5000);
  }
}

// CSS für Rainbow Animation und Night Mode
const style = document.createElement("style");
style.textContent = `
@keyframes rainbow {
  0% { filter: hue-rotate(0deg); }
  100% { filter: hue-rotate(360deg); }
}

body.night-mode {
  --cream: #1a1a1a;
  --warm-white: #2a2a2a;
  --sand: #3a3a3a;
  --text: #e0e0e0;
  --text-light: #b0b0b0;
  --text-muted: #808080;
}

body.night-mode .header {
  background: linear-gradient(135deg, rgba(20, 30, 25, 0.9) 0%, rgba(40, 50, 45, 0.8) 100%),
              url('header-bg.png');
}

body.night-mode .card {
  background: var(--warm-white);
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
}

body.night-mode .energy-card {
  background: linear-gradient(135deg, var(--warm-white) 0%, #353535 100%);
}
`;
document.head.appendChild(style);

// App starten
document.addEventListener("DOMContentLoaded", init);
