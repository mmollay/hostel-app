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

// Förmlichkeitsform (wird von API geladen)
let formalAddress = "du"; // "du" oder "sie"

// Text-Mapping für Du/Sie-Form
const TEXT_VARIANTS = {
  welcome: {
    du: "Willkommen an diesem magischen Ort. Bitte melde dich an, um deine persönliche Reise zu beginnen.",
    sie: "Willkommen an diesem magischen Ort. Bitte melden Sie sich an, um Ihre persönliche Reise zu beginnen.",
  },
  enjoy: {
    du: "Genieße jeden Moment!",
    sie: "Genießen Sie jeden Moment!",
  },
  daysRemaining: {
    du: (days) =>
      `Noch ${days} Tag${days > 1 ? "e" : ""} bis zum Abschied. Lass dich verzaubern!`,
    sie: (days) =>
      `Noch ${days} Tag${days > 1 ? "e" : ""} bis zum Abschied. Lassen Sie sich verzaubern!`,
  },
  lastDay: {
    du: "Morgen beginnt ein neuer Weg. Wir hoffen, dieser Ort hat dich berührt.",
    sie: "Morgen beginnt ein neuer Weg. Wir hoffen, dieser Ort hat Sie berührt.",
  },
  stay: {
    du: "Möge dieser Ort Kraft geben und Ruhe schenken.",
    sie: "Möge dieser Ort Kraft geben und Ruhe schenken.",
  },
  amenitiesSubtitle: {
    du: "Für deinen Komfort",
    sie: "Für Ihren Komfort",
  },
  contactSubtitle: {
    du: "Wir sind für dich da",
    sie: "Wir sind für Sie da",
  },
  transparencySubtitle: {
    du: "Für deine Unterlagen",
    sie: "Für Ihre Unterlagen",
  },
  transparencyText: {
    du: "Im Rahmen deines Aufenthalts können Kurtaxe und Energiekosten anfallen. Für deine Unterlagen und vollständige Transparenz findest du hier die Kontodaten:",
    sie: "Im Rahmen Ihres Aufenthalts können Kurtaxe und Energiekosten anfallen. Für Ihre Unterlagen und vollständige Transparenz finden Sie hier die Kontodaten:",
  },
  qrCodeInstruction: {
    du: "Scanne den QR-Code mit deiner Kamera, um dich automatisch zu verbinden.",
    sie: "Scannen Sie den QR-Code mit Ihrer Kamera, um sich automatisch zu verbinden.",
  },
  saunaComingSoonText: {
    du: "Tiefe Entspannung und Reinigung für Körper und Seele. Bald kannst du hier zur Ruhe kommen.",
    sie: "Tiefe Entspannung und Reinigung für Körper und Seele. Bald können Sie hier zur Ruhe kommen.",
  },
  loginInstruction: {
    du: "Gib deine Zugangsdaten ein, die du bei der Buchung erhalten hast.",
    sie: "Geben Sie Ihre Zugangsdaten ein, die Sie bei der Buchung erhalten haben.",
  },
};

// LocalStorage Keys
const STORAGE_KEY = "shelly_energy_data";
const GUEST_TOKEN_KEY = "hostel_guest_token";
const GUEST_DATA_KEY = "hostel_guest_data";
const NIGHT_MODE_KEY = "hostel_night_mode";
const CATEGORY_KEY = "hostel_recommendations_category";

// Location wird dynamisch aus Adresse geocoded (Default: Hollenthon)
let LOCATION = {
  lat: 47.5833,
  lon: 16.1667,
  name: "Hollenthon",
};

/**
 * Initialisierung
 */
async function init() {
  loadGuestSession();
  applyNightMode();
  
  // UI sofort initialisieren (kein Warten auf API)
  initGuestUI();
  updateGuestUI(); // CRITICAL: Hide guest-only cards on page load
  updateGreeting();
  updateFormalAddressTexts(); // Du/Sie-Texte initialisieren
  initRecommendations();
  
  // API-Calls PARALLEL starten für schnelleres Laden
  const apiPromises = [
    loadEnergyFromDB(),      // Energie-Daten aus D1
    fetchData(),             // Shelly-Daten
    loadHostelInfo(),        // Hostel-Info (Kontakt, Bankdaten)
    loadAmenities(),         // Annehmlichkeiten
  ];
  
  // Wetter nur für eingeloggte Gäste
  if (guestToken) {
    apiPromises.push(fetchWeather());
  }
  
  // Alle API-Calls parallel ausführen
  await Promise.allSettled(apiPromises);
  
  // Nach dem Laden: UI nochmal aktualisieren (damit gestern/monat angezeigt werden)
  // fetchData hat updateUI aufgerufen, aber loadEnergyFromDB war evtl. noch nicht fertig
  updateHistoricalEnergyUI();
  
  // Aufenthalts-Energie laden (für eingeloggte Gäste)
  if (guestToken && guestData) {
    await loadStayEnergy();
  }
  
  // Intervals nach dem initialen Load starten
  setInterval(fetchData, CONFIG.UPDATE_INTERVAL);
  setInterval(updateGreeting, 60000);
  if (guestToken) {
    setInterval(fetchWeather, 600000); // Alle 10 Minuten
  }
  
  scheduleDailyReset();
  startAutoRefresh();
  
  // i18n: Bei Sprachwechsel Daten neu laden
  if (typeof I18N !== 'undefined') {
    I18N.onChange(() => {
      loadAmenities();
      updateGreeting();
      loadHostelInfo();  // Tagline neu laden (DE/EN)
    });
  }
}

/**
 * Energie-Daten aus D1 Database laden
 */
async function loadEnergyFromDB() {
  try {
    // WICHTIG: cache: 'no-store' = IMMER frische Daten vom Server!
    const fetchOptions = {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    };

    // Heutige Daten
    const todayRes = await fetch(
      `${CONFIG.API_PROXY_URL}/energy/today`,
      fetchOptions,
    );
    const todayData = await todayRes.json();
    if (todayData.success) {
      energyData.todayEnergy = todayData.data.energy_kwh || 0;
      energyData.peakPower = todayData.data.peak_power || 0;
      energyData.todayStart = todayData.data.shelly_total_start;
    }

    // Gestrige Daten
    const yesterdayRes = await fetch(
      `${CONFIG.API_PROXY_URL}/energy/yesterday`,
      fetchOptions,
    );
    const yesterdayData = await yesterdayRes.json();
    if (yesterdayData.success) {
      energyData.yesterdayEnergy = yesterdayData.data.energy_kwh || 0;
    }

    // Monatsdaten
    const monthRes = await fetch(
      `${CONFIG.API_PROXY_URL}/energy/month`,
      fetchOptions,
    );
    const monthData = await monthRes.json();
    if (monthData.success) {
      // Sicherstellen dass es eine Zahl ist, nicht null/undefined
      energyData.monthEnergy = parseFloat(monthData.data.energy_kwh) || 0;
    }

    energyData.lastReset = new Date().toDateString();
  } catch (e) {
    console.error("Fehler beim Laden aus DB:", e);
  }
}

/**
 * Historische Energie-Daten in UI aktualisieren (gestern, monat)
 */
function updateHistoricalEnergyUI() {
  const pricePerKwh = settings.pricePerKwh || CONFIG.PRICE_PER_KWH;
  
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

  // Monat (DB-Wert + heutiger Wert)
  const monthTotal =
    (energyData.monthEnergy || 0) + (energyData.todayEnergy || 0);
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
}

// ==========================================
// AUFENTHALTS-ENERGIE (GAST-FOKUS)
// ==========================================

// Speicher für Aufenthalts-Daten
let stayEnergyData = {
  days: [],
  totalEnergy: 0,
  totalCost: 0,
  avgPerDay: 0,
  stayDays: 0,
};

/**
 * Energie-Daten für den Gast-Aufenthalt laden
 */
async function loadStayEnergy() {
  // Nur für eingeloggte Gäste
  if (!guestToken || !guestData) return;
  
  const checkIn = guestData.checkIn;
  const checkOut = guestData.checkOut;
  
  if (!checkIn || !checkOut) {
    console.warn("Keine Check-in/Check-out Daten verfügbar");
    return;
  }
  
  // Heute als Endpunkt, falls Check-out in der Zukunft liegt
  const today = getDateString(new Date());
  const effectiveEnd = checkOut < today ? checkOut : today;
  
  try {
    const response = await fetch(
      `${CONFIG.API_PROXY_URL}/energy/range?from=${checkIn}&to=${effectiveEnd}`,
      {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
    
    const data = await response.json();
    
    if (data.success && data.data) {
      // Aufenthaltsdauer berechnen
      const checkInDate = new Date(checkIn);
      const todayDate = new Date();
      const stayDays = Math.ceil((todayDate - checkInDate) / (1000 * 60 * 60 * 24)) + 1;
      
      // Daten speichern
      stayEnergyData = {
        days: data.data.days || [],
        totalEnergy: data.data.totalEnergy || 0,
        totalCost: data.data.totalCost || 0,
        stayDays: stayDays,
        avgPerDay: stayDays > 0 ? (data.data.totalEnergy || 0) / stayDays : 0,
      };
      
      // Heute hinzufügen wenn noch nicht in DB (aktueller Verbrauch aus Live-Daten)
      const todayInDays = stayEnergyData.days.find(d => d.date === today);
      if (!todayInDays && energyData.todayEnergy > 0) {
        // Heutigen Verbrauch zum Total addieren
        stayEnergyData.totalEnergy += energyData.todayEnergy;
        stayEnergyData.totalCost += energyData.todayEnergy * (settings.pricePerKwh || 0.29);
        stayEnergyData.avgPerDay = stayEnergyData.stayDays > 0 
          ? stayEnergyData.totalEnergy / stayEnergyData.stayDays 
          : 0;
      }
      
      // UI aktualisieren
      updateStayEnergyUI();
    }
  } catch (error) {
    console.error("Fehler beim Laden der Aufenthalts-Energie:", error);
  }
}

/**
 * Aufenthalts-Energie UI aktualisieren
 */
function updateStayEnergyUI() {
  const pricePerKwh = settings.pricePerKwh || CONFIG.PRICE_PER_KWH;
  
  // Gesamtverbrauch
  const totalEnergyEl = document.getElementById("stayTotalEnergy");
  if (totalEnergyEl) {
    totalEnergyEl.textContent = formatNumber(stayEnergyData.totalEnergy, 2);
  }
  
  // Gesamtkosten
  const totalCostEl = document.getElementById("stayTotalCost");
  if (totalCostEl) {
    totalCostEl.textContent = formatNumber(stayEnergyData.totalCost, 2);
  }
  
  // Aufenthaltsdauer
  const durationEl = document.getElementById("stayDuration");
  if (durationEl) {
    durationEl.textContent = stayEnergyData.stayDays;
  }
  
  // Durchschnitt pro Tag
  const avgEl = document.getElementById("stayAvgEnergy");
  if (avgEl) {
    avgEl.textContent = formatNumber(stayEnergyData.avgPerDay, 2);
  }
  
  // Tages-Liste vorbereiten
  displayStayDays();
}

/**
 * Tages-Liste für Aufenthalt anzeigen
 */
function displayStayDays() {
  const listEl = document.getElementById("stayDaysList");
  if (!listEl) return;
  
  const pricePerKwh = settings.pricePerKwh || CONFIG.PRICE_PER_KWH;
  const today = getDateString(new Date());
  
  // Alle Tage vom Check-in bis heute generieren
  if (!guestData || !guestData.checkIn) {
    listEl.innerHTML = '<div class="stay-day-no-data">Keine Daten verfügbar</div>';
    return;
  }
  
  const checkInDate = new Date(guestData.checkIn);
  const todayDate = new Date();
  const allDays = [];
  
  // Tage vom Check-in bis heute durchlaufen
  const currentDate = new Date(checkInDate);
  while (currentDate <= todayDate) {
    const dateStr = getDateString(currentDate);
    const dayData = stayEnergyData.days.find(d => d.date === dateStr);
    
    allDays.push({
      date: dateStr,
      energy: dayData ? dayData.energy_kwh : (dateStr === today ? energyData.todayEnergy : 0),
      cost: dayData ? dayData.cost : (dateStr === today ? energyData.todayEnergy * pricePerKwh : 0),
      hasData: !!dayData || dateStr === today,
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Umgekehrte Reihenfolge (neueste zuerst)
  allDays.reverse();
  
  if (allDays.length === 0) {
    listEl.innerHTML = '<div class="stay-day-no-data" data-i18n="energy.noData">Noch keine Verbrauchsdaten</div>';
    return;
  }
  
  // Lokale Formatierung für Datum
  const locale = (typeof I18N !== 'undefined' && I18N.currentLang === 'en') ? 'en-GB' : 'de-DE';
  
  listEl.innerHTML = allDays.map(day => {
    const date = new Date(day.date);
    const formattedDate = date.toLocaleDateString(locale, {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    });
    
    const isToday = day.date === today;
    const todayLabel = isToday ? (typeof I18N !== 'undefined' && I18N.currentLang === 'en' ? ' (today)' : ' (heute)') : '';
    
    return `
      <div class="stay-day-item${isToday ? ' today' : ''}">
        <span class="stay-day-date">${formattedDate}${todayLabel}</span>
        <span class="stay-day-energy">${formatNumber(day.energy, 2)} kWh</span>
        <span class="stay-day-cost">${formatNumber(day.cost, 2)} €</span>
      </div>
    `;
  }).join('');
}

/**
 * Details aufklappen/zuklappen
 */
function toggleStayDetails() {
  const detailsEl = document.getElementById("stayEnergyDetails");
  const toggleBtn = document.getElementById("stayDetailsToggle");
  const iconEl = document.getElementById("stayDetailsIcon");
  
  if (!detailsEl || !toggleBtn) return;
  
  const isOpen = detailsEl.style.display !== "none";
  
  detailsEl.style.display = isOpen ? "none" : "block";
  toggleBtn.classList.toggle("open", !isOpen);
  
  // Button-Text aktualisieren
  const textSpan = toggleBtn.querySelector("span");
  if (textSpan) {
    if (isOpen) {
      textSpan.textContent = typeof I18N !== 'undefined' && I18N.currentLang === 'en' 
        ? 'Show daily details' 
        : 'Tagesdetails anzeigen';
    } else {
      textSpan.textContent = typeof I18N !== 'undefined' && I18N.currentLang === 'en' 
        ? 'Hide daily details' 
        : 'Tagesdetails ausblenden';
    }
  }
  
  // Icons neu initialisieren
  lucide.createIcons();
}

// Global verfügbar machen
window.toggleStayDetails = toggleStayDetails;

/**
 * Auto-Refresh: Daten alle 5 Minuten neu laden
 */
function startAutoRefresh() {
  // Alle 5 Minuten (300000ms) Daten neu laden
  setInterval(async () => {
    console.log("[Auto-Refresh] Lade Energiedaten neu...");

    try {
      // Hauptdaten neu laden
      await fetchData();

      // DB-Daten neu laden (Heute, Gestern, Monat)
      await loadEnergyFromDB();

      console.log("[Auto-Refresh] Daten erfolgreich aktualisiert");
    } catch (error) {
      console.error("[Auto-Refresh] Fehler beim Aktualisieren:", error);
    }
  }, 300000); // 5 Minuten = 300000ms

  console.log("[Auto-Refresh] Aktiviert (alle 5 Minuten)");
}

/**
 * Guest-Session laden
 */
function loadGuestSession() {
  try {
    // Prüfe localStorage zuerst (persistent), dann sessionStorage (temporär)
    guestToken = localStorage.getItem(GUEST_TOKEN_KEY) || sessionStorage.getItem(GUEST_TOKEN_KEY);
    const storedData = localStorage.getItem(GUEST_DATA_KEY) || sessionStorage.getItem(GUEST_DATA_KEY);
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
 * Daten in D1 Database speichern
 */
async function saveData() {
  try {
    const today = getDateString(new Date());
    const pricePerKwh = settings.pricePerKwh;

    await fetch(`${CONFIG.API_PROXY_URL}/energy/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: today,
        energy_kwh: energyData.todayEnergy,
        cost: energyData.todayEnergy * pricePerKwh,
        peak_power: energyData.peakPower,
        shelly_total_start: energyData.todayStart,
      }),
    });
  } catch (e) {
    console.error("Fehler beim Speichern in DB:", e);
  }
}

/**
 * Datum als String YYYY-MM-DD
 */
function getDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Prüfen ob ein neuer Tag begonnen hat
 */
async function checkDayReset() {
  const today = new Date().toDateString();

  if (energyData.lastReset !== today) {
    // Daten aus DB neu laden (neuer Tag)
    await loadEnergyFromDB();
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

  setTimeout(async () => {
    await checkDayReset();
    scheduleDailyReset();
  }, msUntilMidnight);
}

/**
 * Daten vom API abrufen
 */
async function fetchData() {
  try {
    // WICHTIG: Immer frische Daten vom Server (kein Cache!)
    const response = await fetch(CONFIG.API_PROXY_URL, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });

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
  // Shelly Pro 3EM liefert bereits kWh, NICHT Wh!
  const totalEnergy = status.total_act_energy || 0;

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
  const monthTotal =
    (energyData.monthEnergy || 0) + (energyData.todayEnergy || 0);
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
    const locale = (typeof I18N !== 'undefined' && I18N.currentLang === 'en') ? 'en-GB' : 'de-DE';
    lastUpdateEl.textContent = new Date().toLocaleTimeString(locale);
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
  const statusHeaderEl = document.getElementById("statusIndicatorHeader");

  if (errorEl) errorEl.style.display = "none";
  if (dashboardEl) dashboardEl.style.display = "block";
  if (statusEl) statusEl.classList.remove("error");
  if (statusHeaderEl) statusHeaderEl.classList.remove("offline");
}

/**
 * Verbindungsstatus: Fehler
 */
function showError() {
  const errorEl = document.getElementById("errorMessage");
  const statusEl = document.getElementById("statusIndicator");
  const statusHeaderEl = document.getElementById("statusIndicatorHeader");

  if (errorEl) errorEl.style.display = "block";
  if (statusEl) statusEl.classList.add("error");
  if (statusHeaderEl) statusHeaderEl.classList.add("offline");
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
  const usernameInput = document.getElementById("guestUsername");
  const passwordInput = document.getElementById("guestPassword");
  const errorEl = document.getElementById("loginError");
  const loginBtn = document.getElementById("loginBtn");
  
  const username = usernameInput?.value?.trim();
  const password = passwordInput?.value;

  // Validierung
  if (!username || !password) {
    if (errorEl) {
      errorEl.textContent = "Bitte Zugangscode und Passwort eingeben";
      errorEl.style.display = "block";
    }
    return;
  }

  // Loading-State
  if (loginBtn) {
    loginBtn.disabled = true;
    loginBtn.textContent = "Wird geprüft...";
  }
  if (errorEl) {
    errorEl.style.display = "none";
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s Timeout

    const response = await fetch(`${CONFIG.API_PROXY_URL}/guest/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // HTTP-Fehler abfangen
    if (!response.ok) {
      throw new Error(`Server-Fehler: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      guestToken = result.token;
      guestData = result.guest;
      
      // "Angemeldet bleiben" Checkbox prüfen
      const rememberMe = document.getElementById("guestRememberMe")?.checked ?? true;
      const storage = rememberMe ? localStorage : sessionStorage;
      
      // Bei "Angemeldet bleiben" in localStorage, sonst sessionStorage
      // Zuerst beide clearen um Inkonsistenzen zu vermeiden
      localStorage.removeItem(GUEST_TOKEN_KEY);
      localStorage.removeItem(GUEST_DATA_KEY);
      sessionStorage.removeItem(GUEST_TOKEN_KEY);
      sessionStorage.removeItem(GUEST_DATA_KEY);
      
      // In gewähltem Storage speichern
      storage.setItem(GUEST_TOKEN_KEY, guestToken);
      storage.setItem(GUEST_DATA_KEY, JSON.stringify(guestData));

      closeGuestLoginModal();
      updateGuestUI();
      updateGreeting();
      fetchWeather();
      
      // Aufenthalts-Energie laden
      loadStayEnergy();

      // Willkommens-Nachricht
      showWelcomeMessage();
    } else {
      if (errorEl) {
        // Benutzerfreundliche Fehlermeldungen
        let errorMessage = result.error || "Anmeldung fehlgeschlagen";
        if (result.error?.includes("Invalid") || result.error?.includes("invalid")) {
          errorMessage = "Zugangscode oder Passwort falsch";
        } else if (result.error?.includes("not found")) {
          errorMessage = "Zugangscode nicht gefunden";
        }
        errorEl.textContent = errorMessage;
        errorEl.style.display = "block";
      }
    }
  } catch (error) {
    console.error("Login error:", error);
    if (errorEl) {
      let errorMessage = "Verbindungsfehler - bitte erneut versuchen";
      if (error.name === "AbortError") {
        errorMessage = "Zeitüberschreitung - Server nicht erreichbar";
      } else if (error.message?.includes("Failed to fetch")) {
        errorMessage = "Keine Internetverbindung";
      } else if (error.message?.includes("Server-Fehler")) {
        errorMessage = error.message;
      }
      errorEl.textContent = errorMessage;
      errorEl.style.display = "block";
    }
  } finally {
    // Loading-State zurücksetzen
    if (loginBtn) {
      loginBtn.disabled = false;
      // Use i18n if available
      const buttonText = (typeof I18N !== 'undefined' && I18N.t) ? I18N.t('login.submit') : 'Anmelden';
      loginBtn.textContent = buttonText;
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
  
  // Beide Storage-Typen löschen
  localStorage.removeItem(GUEST_TOKEN_KEY);
  localStorage.removeItem(GUEST_DATA_KEY);
  sessionStorage.removeItem(GUEST_TOKEN_KEY);
  sessionStorage.removeItem(GUEST_DATA_KEY);

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
  const quickNav = document.getElementById("quickNav");
  const mobileBottomNav = document.getElementById("mobileBottomNav");
  const wifiInfoName = document.getElementById("wifiInfoName");
  const wifiInfoPassword = document.getElementById("wifiInfoPassword");

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

  // WiFi-Infos in "Wichtige Infos" nur für eingeloggte Gäste anzeigen
  if (wifiInfoName) wifiInfoName.style.display = guestToken ? "block" : "none";
  if (wifiInfoPassword)
    wifiInfoPassword.style.display = guestToken ? "block" : "none";

  // Quick Navigation nur für eingeloggte Gäste anzeigen
  if (quickNav) quickNav.style.display = guestToken ? "flex" : "none";
  
  // Mobile Bottom Navigation nur für eingeloggte Gäste anzeigen
  if (mobileBottomNav) mobileBottomNav.style.display = guestToken ? "flex" : "none";
}

/**
 * Personalisierte Begrüßung aktualisieren
 */
function updateGreeting() {
  const greetingEl = document.getElementById("greeting");
  const messageEl = document.getElementById("welcomeMessage");

  if (!greetingEl || !messageEl) return;

  const hour = new Date().getHours();
  let timeGreeting, greetingIcon;

  // Use i18n if available, otherwise fallback to German
  const useI18n = typeof I18N !== 'undefined' && I18N.translations?.welcome?.greeting;

  if (hour >= 5 && hour < 12) {
    timeGreeting = useI18n ? I18N.t('welcome.greeting.morning') : "Guten Morgen";
    greetingIcon = "sunrise";
  } else if (hour >= 12 && hour < 18) {
    timeGreeting = useI18n ? I18N.t('welcome.greeting.day') : "Guten Tag";
    greetingIcon = "sun";
  } else if (hour >= 18 && hour < 22) {
    timeGreeting = useI18n ? I18N.t('welcome.greeting.evening') : "Guten Abend";
    greetingIcon = "sunset";
  } else {
    timeGreeting = useI18n ? I18N.t('welcome.greeting.night') : "Gute Nacht";
    greetingIcon = "moon";
  }

  if (guestToken && guestData) {
    // Personalisierte Anrede mit Titel und Gender
    let salutation = "";
    if (guestData.gender === "weiblich") {
      salutation = "liebe";
    } else if (guestData.gender === "männlich") {
      salutation = "lieber";
    }

    const title = guestData.title ? `${guestData.title} ` : "";
    const name = `${title}${guestData.name}`;
    const greeting = salutation
      ? `${timeGreeting}, ${salutation} ${name}`
      : `${timeGreeting}, ${name}`;

    // Sicher: Icon via DOM, Text via textContent
    greetingEl.innerHTML = "";
    const icon = document.createElement("i");
    icon.setAttribute("data-lucide", greetingIcon);
    icon.style.verticalAlign = "middle";
    icon.style.marginRight = "12px";
    greetingEl.appendChild(icon);
    const textNode = document.createTextNode(`${greeting}!`);
    greetingEl.appendChild(textNode);
    lucide.createIcons();

    // Aufenthaltsdauer berechnen
    const checkOut = new Date(guestData.checkOut);
    const today = new Date();
    const daysRemaining = Math.ceil((checkOut - today) / (1000 * 60 * 60 * 24));

    let stayMessage = TEXT_VARIANTS.stay[formalAddress];
    if (daysRemaining === 1) {
      stayMessage = TEXT_VARIANTS.lastDay[formalAddress];
    } else if (daysRemaining > 1) {
      stayMessage = TEXT_VARIANTS.daysRemaining[formalAddress](daysRemaining);
    }

    // Use i18n for stay messages if available
    if (useI18n) {
      if (daysRemaining === 1) {
        stayMessage = I18N.t('welcome.lastDay');
      } else if (daysRemaining > 1) {
        stayMessage = I18N.t('welcome.daysRemaining', { days: daysRemaining });
      } else {
        stayMessage = I18N.t('welcome.stay');
      }
    }
    messageEl.textContent = stayMessage;
  } else {
    // Nicht eingeloggt
    greetingEl.innerHTML = "";
    const icon = document.createElement("i");
    icon.setAttribute("data-lucide", greetingIcon);
    icon.style.verticalAlign = "middle";
    icon.style.marginRight = "12px";
    greetingEl.appendChild(icon);
    const textNode = document.createTextNode(`${timeGreeting}!`);
    greetingEl.appendChild(textNode);
    lucide.createIcons();
    
    // Use i18n for welcome message if available
    const welcomeMessage = useI18n ? I18N.t('welcome.message') : TEXT_VARIANTS.welcome[formalAddress];
    messageEl.textContent = welcomeMessage;
  }
}

/**
 * Aktualisiert alle Du/Sie-Texte basierend auf formalAddress
 * Uses i18n when available, otherwise falls back to TEXT_VARIANTS
 */
function updateFormalAddressTexts() {
  const elements = {
    amenitiesSubtitle: document.getElementById("amenitiesSubtitle"),
    contactSubtitle: document.getElementById("contactSubtitle"),
    transparencySubtitle: document.getElementById("transparencySubtitle"),
    transparencyText: document.getElementById("transparencyText"),
    qrCodeInstruction: document.getElementById("qrCodeInstruction"),
    saunaComingSoonText: document.getElementById("saunaComingSoonText"),
    loginInstruction: document.getElementById("loginInstruction"),
  };

  // If i18n is available and loaded, let it handle the translations
  // Only use TEXT_VARIANTS as fallback for German or when i18n is not available
  const useI18n = typeof I18N !== 'undefined' && I18N.translations && Object.keys(I18N.translations).length > 0;
  
  if (useI18n) {
    // i18n handles these via data-i18n attributes, so just trigger a re-apply
    I18N.applyTranslations();
    return;
  }

  // Fallback: Aktualisiere alle Texte basierend auf formalAddress
  Object.keys(elements).forEach((key) => {
    if (elements[key] && TEXT_VARIANTS[key]) {
      elements[key].textContent = TEXT_VARIANTS[key][formalAddress];
    }
  });
}

/**
 * Willkommens-Nachricht anzeigen
 */
function showWelcomeMessage() {
  // Kleine Animation oder Toast-Nachricht
  console.log(`Willkommen, ${guestData.name}!`);
}

/**
 * Wetter abrufen (OpenWeatherMap)
 */
async function fetchWeather() {
  const apiKey = CONFIG.OPENWEATHER_API_KEY;

  if (!apiKey) {
    console.log("OpenWeatherMap API Key fehlt");
    return;
  }

  try {
    // Aktuelles Wetter + 5-Tage-Vorhersage
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${LOCATION.lat}&lon=${LOCATION.lon}&units=metric&lang=de&appid=${apiKey}`;

    const response = await fetch(forecastUrl);
    const data = await response.json();

    if (data.list && data.list.length > 0) {
      // Aktuelles Wetter (erste Eintrag)
      const current = data.list[0];
      updateWeatherDisplay(current);

      // 5-Tage-Vorhersage
      updateWeatherForecast(data.list);

      // Empfehlungen basierend auf Wetter anpassen
      updateRecommendationsByWeather(current);
    }
  } catch (error) {
    console.error("Wetter-Fehler:", error);
  }
}

/**
 * Wetter-Anzeige aktualisieren (OpenWeatherMap Format)
 */
function updateWeatherDisplay(current) {
  const tempEl = document.getElementById("weatherTemp");
  const conditionEl = document.getElementById("weatherCondition");
  const humidityEl = document.getElementById("weatherHumidity");
  const windEl = document.getElementById("weatherWind");
  const iconEl = document.getElementById("weatherIcon");

  if (tempEl) tempEl.textContent = Math.round(current.main.temp);
  if (humidityEl) humidityEl.textContent = current.main.humidity;
  if (windEl) windEl.textContent = Math.round(current.wind.speed * 3.6); // m/s → km/h

  // Wetter-Beschreibung (bereits auf Deutsch)
  if (conditionEl && current.weather[0]) {
    conditionEl.textContent =
      current.weather[0].description.charAt(0).toUpperCase() +
      current.weather[0].description.slice(1);
  }

  // Icon anpassen
  if (iconEl && current.weather[0]) {
    const iconName = getWeatherIconFromOpenWeather(current.weather[0].icon);
    iconEl.setAttribute("data-lucide", iconName);
    lucide.createIcons();
  }
}

/**
 * 5-Tage-Wettervorhersage anzeigen
 */
function updateWeatherForecast(forecastList) {
  const forecastEl = document.getElementById("weatherForecast");
  if (!forecastEl) return;

  // Tägliche Vorhersagen gruppieren (Mittags 12:00)
  const dailyForecasts = [];
  const seenDates = new Set();

  forecastList.forEach((item) => {
    const date = new Date(item.dt * 1000);
    const dateStr = date.toDateString();
    const hour = date.getHours();

    // Nur ein Eintrag pro Tag, bevorzugt 12:00
    if (!seenDates.has(dateStr) && (hour === 12 || dailyForecasts.length < 5)) {
      dailyForecasts.push(item);
      seenDates.add(dateStr);
    }
  });

  // Ersten 5 Tage anzeigen
  forecastEl.innerHTML = dailyForecasts
    .slice(0, 5)
    .map((day) => {
      const date = new Date(day.dt * 1000);
      const dayName = date.toLocaleDateString("de-DE", { weekday: "short" });
      const temp = Math.round(day.main.temp);
      const icon = getWeatherIconFromOpenWeather(day.weather[0].icon);

      return `
      <div class="forecast-day">
        <div class="forecast-day-name">${dayName}</div>
        <i data-lucide="${icon}" style="width: 24px; height: 24px; color: var(--sage);"></i>
        <div class="forecast-temp">${temp}°</div>
      </div>
    `;
    })
    .join("");

  lucide.createIcons();
}

/**
 * OpenWeatherMap Icon zu Lucide Icon
 */
function getWeatherIconFromOpenWeather(iconCode) {
  // OpenWeatherMap Icons: https://openweathermap.org/weather-conditions
  const code = iconCode.slice(0, 2); // z.B. "01d" → "01"

  const iconMap = {
    "01": "sun", // Clear sky
    "02": "cloud-sun", // Few clouds
    "03": "cloud", // Scattered clouds
    "04": "cloud", // Broken clouds
    "09": "cloud-rain", // Shower rain
    10: "cloud-rain", // Rain
    11: "cloud-lightning", // Thunderstorm
    13: "cloud-snow", // Snow
    50: "cloud-fog", // Mist
  };

  return iconMap[code] || "cloud";
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
 * Empfehlungen basierend auf Wetter anpassen
 */
function updateRecommendationsByWeather(currentWeather) {
  if (
    !currentWeather ||
    !currentWeather.weather ||
    !currentWeather.weather[0]
  ) {
    return;
  }

  const weatherId = currentWeather.weather[0].id;
  const temp = currentWeather.main.temp;

  // Wetter-Bedingungen kategorisieren
  const isBadWeather = weatherId >= 200 && weatherId < 600; // Thunderstorm, Drizzle, Rain
  const isSnow = weatherId >= 600 && weatherId < 700;
  const isCold = temp < 10;

  // Kategorie basierend auf Wetter anpassen
  if (isBadWeather || isSnow || isCold) {
    // Schlechtes/Kaltes Wetter → Indoor-Aktivitäten
    currentCategory = "spa"; // Thermen bevorzugen
    console.log(
      "☔ Schlechtes Wetter erkannt → Thermen & Indoor-Aktivitäten empfehlen",
    );
  } else if (temp >= 20) {
    // Gutes Wetter → Outdoor-Aktivitäten
    currentCategory = "tourist_attraction"; // Sehenswürdigkeiten bevorzugen
    console.log("☀️ Gutes Wetter erkannt → Outdoor-Aktivitäten empfehlen");
  }

  // Empfehlungen neu laden mit angepasster Kategorie
  if (guestToken && CONFIG.GOOGLE_MAPS_API_KEY) {
    fetchNearbyPlaces();
  }
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

// ==========================================
// GOOGLE MAPS PLACES INTEGRATION
// ==========================================

let currentRadius = 40000; // 40km default (in meters)
let currentCategory = "all";
const GOOGLE_MAPS_API_KEY = CONFIG.GOOGLE_MAPS_API_KEY || "";

// Simple in-memory cache für Places (5 Minuten TTL)
const placesCache = {
  data: {},
  timestamp: {},
  TTL: 5 * 60 * 1000, // 5 Minuten
  
  get(key) {
    if (this.data[key] && (Date.now() - this.timestamp[key]) < this.TTL) {
      console.log(`[Cache HIT] ${key}`);
      return this.data[key];
    }
    return null;
  },
  
  set(key, value) {
    this.data[key] = value;
    this.timestamp[key] = Date.now();
  }
};

/**
 * Empfehlungen initialisieren
 */
function initRecommendations() {
  // Gespeicherte Kategorie aus localStorage laden
  const savedCategory = localStorage.getItem(CATEGORY_KEY);
  if (savedCategory) {
    currentCategory = savedCategory;
  }

  // Radius-Slider
  const radiusSlider = document.getElementById("radiusSlider");
  const radiusValue = document.getElementById("radiusValue");

  if (radiusSlider) {
    radiusSlider.addEventListener("input", (e) => {
      const value = e.target.value;
      currentRadius = value * 1000; // km to meters
      if (radiusValue) radiusValue.textContent = value;
      fetchNearbyPlaces();
    });
  }

  // Kategorie-Buttons
  const categoryBtns = document.querySelectorAll(".category-btn");
  
  // Gespeicherte Kategorie visuell aktivieren
  categoryBtns.forEach((btn) => {
    if (btn.dataset.category === currentCategory) {
      categoryBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    }
  });

  categoryBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      categoryBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.dataset.category;
      // Kategorie in localStorage speichern
      localStorage.setItem(CATEGORY_KEY, currentCategory);
      fetchNearbyPlaces();
    });
  });

  // Initial laden
  if (guestToken && GOOGLE_MAPS_API_KEY) {
    fetchNearbyPlaces();
  }
}

/**
 * Hilfsfunktion: Holt ALLE Seiten für einen Place-Type (nicht nur die ersten 20)
 * Google Places API gibt max 60 Ergebnisse zurück (3 Seiten à 20)
 */
async function fetchAllPagesForType(type) {
  const allResults = [];
  let nextPageToken = null;
  let pageCount = 0;
  const maxPages = 3; // Google limitiert auf 3 Seiten

  do {
    let url;
    if (nextPageToken) {
      // Nachfolge-Seite mit pagetoken
      url = `${CONFIG.API_PROXY_URL}/places/nearby?pagetoken=${nextPageToken}`;
      // WICHTIG: Google braucht ~2 Sekunden Wartezeit zwischen Requests!
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } else {
      // Erste Seite mit location/type/rankby
      // WICHTIG: rankby=distance gibt die NÄCHSTEN 60 Orte (nicht die "wichtigsten")
      // Bei rankby=distance darf KEIN radius-Parameter verwendet werden!
      url = `${CONFIG.API_PROXY_URL}/places/nearby?lat=${LOCATION.lat}&lon=${LOCATION.lon}&type=${type}&rankby=distance`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      allResults.push(...data.results);
    }

    nextPageToken = data.next_page_token || null;
    pageCount++;
  } while (nextPageToken && pageCount < maxPages);

  console.log(`${type}: ${allResults.length} Ergebnisse (${pageCount} Seiten)`);
  return allResults;
}

/**
 * Google Places Nearby Search
 */
async function fetchNearbyPlaces() {
  if (!GOOGLE_MAPS_API_KEY) {
    showRecommendationsError(
      "Google Maps API Key fehlt. Bitte in .env hinzufügen.",
    );
    return;
  }

  const listEl = document.getElementById("recommendationsList");
  if (!listEl) return;

  // Cache-Key basierend auf Kategorie und Radius
  const cacheKey = `${currentCategory}_${currentRadius}`;
  
  // Prüfe ob gecachte Daten vorhanden
  const cachedPlaces = placesCache.get(cacheKey);
  if (cachedPlaces) {
    displayRecommendations(cachedPlaces);
    return;
  }

  // Skeleton Loading anzeigen (sieht aus wie echte Items)
  listEl.innerHTML = Array(5).fill(`
    <div class="skeleton-item">
      <div class="skeleton skeleton-icon"></div>
      <div class="skeleton-content">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-meta"></div>
        <div class="skeleton skeleton-actions"></div>
      </div>
    </div>
  `).join('');

  try {
    // Google Places API (New) - Nearby Search mit Pagination
    let types;
    if (currentCategory === "all") {
      types = ["tourist_attraction", "restaurant", "spa", "museum", "park", "bar"];
    } else if (currentCategory === "heuriger") {
      // Heurige sind als bar/restaurant gelistet
      types = ["bar", "restaurant"];
    } else {
      types = [currentCategory];
    }

    // Für jeden Type ALLE Seiten holen (nicht nur erste 20!)
    const placesPromises = types.map((type) => fetchAllPagesForType(type));
    const results = await Promise.all(placesPromises);

    // Alle Results zusammenführen
    const allPlaces = results.flat();

    // Nur gute Bewertungen filtern (oder Orte ohne Rating behalten)
    let filteredPlaces = allPlaces.filter((p) => !p.rating || p.rating >= 3.5);

    // SPEZIALFILTER für Thermen: NUR echte Thermal-Bäder mit Heilwasser!
    if (currentCategory === "spa") {
      const thermalKeywords = [
        "therme", // Therme Linsberg, Therme Wien, etc.
        "thermal", // Thermal Resort, Thermalbad
        "thermalbad", // explizit Thermalbad
        "heilbad", // Bad mit Heilwasser
        "kurbad", // Kurbad
      ];

      // Hotels mit "Therme" oder "Thermal" oder "Spa" im Namen
      const hotelThermalPattern = /(hotel|grandhotel).*(therme|thermal|spa)/;

      filteredPlaces = filteredPlaces.filter((p) => {
        const name = p.name.toLowerCase();
        // NUR: Therme/Thermal Keywords ODER Hotel mit Therme/Thermal/Spa
        return (
          thermalKeywords.some((keyword) => name.includes(keyword)) ||
          hotelThermalPattern.test(name)
        );
      });
    }

    // SPEZIALFILTER für Heurige: Typisch österreichische Weinschenken
    if (currentCategory === "heuriger") {
      const heurigenKeywords = [
        "heurig",     // Heuriger, Heurigen
        "buschenschank", // Buschenschank
        "weingut",    // Weingut mit Ausschank
        "weinbau",    // Weinbau
        "winzer",     // Winzer
        "kellerstöckl", // Kellerstöckl
        "weinstube",  // Weinstube
        "weinschenke", // Weinschenke
        "mostheurig", // Mostheuriger
      ];

      filteredPlaces = filteredPlaces.filter((p) => {
        const name = p.name.toLowerCase();
        return heurigenKeywords.some((keyword) => name.includes(keyword));
      });
    }

    if (filteredPlaces.length === 0) {
      showRecommendationsError(
        "Keine Empfehlungen mit guter Bewertung gefunden. Versuche einen größeren Umkreis.",
      );
      return;
    }

    // Tatsächliche Fahrstrecke mit Distance Matrix API berechnen
    await enrichPlacesWithDrivingDistance(filteredPlaces);

    // Nach tatsächlicher Fahrstrecke sortieren und auf definierten Umkreis begrenzen
    const maxDistanceKm = currentRadius / 1000; // meters to km
    const sortedPlaces = filteredPlaces
      .filter((p) => p.drivingDistance && p.drivingDistance <= maxDistanceKm) // Umkreis-Filter
      .sort((a, b) => a.drivingDistance - b.drivingDistance)
      .slice(0, 10); // Top 10 nächstgelegene

    if (sortedPlaces.length === 0) {
      showRecommendationsError(
        "Keine Empfehlungen gefunden. Versuche einen größeren Umkreis.",
      );
      return;
    }

    // Ergebnisse cachen für schnelleren Zugriff
    placesCache.set(cacheKey, sortedPlaces);
    
    displayRecommendations(sortedPlaces);
  } catch (error) {
    console.error("Places API Error:", error);
    showRecommendationsError(
      "Fehler beim Laden der Empfehlungen. Bitte versuche es später erneut.",
    );
  }
}

/**
 * Places mit tatsächlicher Fahrstrecke anreichern (Distance Matrix API)
 */
async function enrichPlacesWithDrivingDistance(places) {
  if (places.length === 0) return;

  // Hostel-Position als Origin
  const origin = `${LOCATION.lat},${LOCATION.lon}`;

  // Alle Place-Positionen als Destinations (max 25 pro Request)
  const destinations = places
    .map((p) => `${p.geometry.location.lat},${p.geometry.location.lng}`)
    .join("|");

  try {
    const response = await fetch(
      `${CONFIG.API_PROXY_URL}/places/distance?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destinations)}`,
    );
    const data = await response.json();

    if (data.status === "OK" && data.rows && data.rows[0]) {
      const elements = data.rows[0].elements;

      elements.forEach((element, index) => {
        if (element.status === "OK" && element.distance) {
          // Fahrstrecke in km speichern
          places[index].drivingDistance = element.distance.value / 1000; // meters to km
          places[index].drivingDistanceText = element.distance.text;
          places[index].drivingDuration = element.duration.text;
        }
      });
    } else {
      // API nicht aktiviert oder Fehler → Fallback auf Luftlinie
      places.forEach((place) => {
        place.drivingDistance = calculateDistance(
          LOCATION.lat,
          LOCATION.lon,
          place.geometry.location.lat,
          place.geometry.location.lng,
        );
      });
    }
  } catch (error) {
    console.error("Distance Matrix Error:", error);
    // Fallback: Luftlinie verwenden
    places.forEach((place) => {
      if (!place.drivingDistance) {
        place.drivingDistance = calculateDistance(
          LOCATION.lat,
          LOCATION.lon,
          place.geometry.location.lat,
          place.geometry.location.lng,
        );
      }
    });
  }
}

/**
 * Empfehlungen anzeigen
 */
function displayRecommendations(places) {
  const listEl = document.getElementById("recommendationsList");
  if (!listEl) return;

  listEl.innerHTML = "";

  places.forEach((place) => {
    const item = document.createElement("div");
    item.className = "recommendation-item";

    // Icon basierend auf Typ und Namen (für Heurige etc.)
    const icon = getPlaceIcon(place.types, place.name);

    // Fahrstrecke verwenden (falls vorhanden), sonst Luftlinie
    const distance =
      place.drivingDistance ||
      calculateDistance(
        LOCATION.lat,
        LOCATION.lon,
        place.geometry.location.lat,
        place.geometry.location.lng,
      );

    // Öffnungsstatus
    const openNow = place.opening_hours?.open_now;
    const openStatus =
      openNow !== undefined
        ? openNow
          ? '<span class="open-status open">Offen</span>'
          : '<span class="open-status closed">Zu</span>'
        : "";

    // Google Maps Navigations-Link
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${LOCATION.lat},${LOCATION.lon}&destination=${place.geometry.location.lat},${place.geometry.location.lng}&travelmode=driving`;

    // Kompakte Darstellung
    item.innerHTML = `
      <div class="recommendation-icon">
        <i data-lucide="${icon}"></i>
      </div>
      <div class="recommendation-content">
        <h4>${place.name}</h4>
        <div class="recommendation-meta">
          <div class="rating">
            <i data-lucide="star" style="width: 12px; height: 12px; fill: currentColor;"></i>
            ${place.rating || "—"}${place.user_ratings_total ? ` (${place.user_ratings_total})` : ""}
          </div>
          <div class="recommendation-distance">
            <i data-lucide="navigation" style="width: 12px; height: 12px;"></i>
            ${distance.toFixed(1)} km
          </div>
          ${openStatus}
        </div>
        <div class="recommendation-actions">
          <a href="${mapsUrl}" target="_blank" class="btn-maps">
            <i data-lucide="map" style="width: 14px; height: 14px;"></i>
            Route
          </a>
          ${
            place.formatted_phone_number
              ? `
            <a href="tel:${place.formatted_phone_number}" class="btn-phone">
              <i data-lucide="phone" style="width: 14px; height: 14px;"></i>
              ${place.formatted_phone_number}
            </a>
          `
              : ""
          }
        </div>
      </div>
    `;

    listEl.appendChild(item);
  });

  lucide.createIcons();
}

/**
 * Icon für Typ ermitteln
 */
function getPlaceIcon(types, placeName = "") {
  // Spezial-Icons basierend auf Namen (für Heurige etc.)
  const name = placeName.toLowerCase();
  if (name.includes("heurig") || name.includes("buschenschank") || 
      name.includes("weingut") || name.includes("winzer") ||
      name.includes("weinbau") || name.includes("weinstube")) {
    return "wine"; // Weinglas-Icon für Heurige
  }
  
  if (types.includes("spa")) return "bath";
  if (types.includes("restaurant")) return "utensils";
  if (types.includes("bar")) return "wine";
  if (types.includes("cafe")) return "coffee";
  if (types.includes("museum")) return "landmark";
  if (types.includes("park")) return "trees";
  if (types.includes("tourist_attraction")) return "castle";
  if (types.includes("shopping_mall")) return "shopping-bag";
  return "map-pin";
}

/**
 * Entfernung berechnen (Haversine)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Fehler anzeigen
 */
function showRecommendationsError(message) {
  const listEl = document.getElementById("recommendationsList");
  if (!listEl) return;

  listEl.innerHTML = `
    <div class="loading-state">
      <i data-lucide="alert-circle" style="color: var(--rose);"></i>
      <p>${message}</p>
    </div>
  `;
  lucide.createIcons();
}

/**
 * Geocode address to lat/lon coordinates
 */
async function geocodeAddress(address) {
  if (!address || !GOOGLE_MAPS_API_KEY) return;

  try {
    const response = await fetch(
      `${CONFIG.API_PROXY_URL}/geocode?address=${encodeURIComponent(address)}`,
    );
    const data = await response.json();

    if (data.status === "OK" && data.results && data.results[0]) {
      const location = data.results[0].geometry.location;
      LOCATION.lat = location.lat;
      LOCATION.lon = location.lng;
      console.log(`Geocoded "${address}" to ${LOCATION.lat}, ${LOCATION.lon}`);

      // Refresh weather with new coordinates
      fetchWeather();
    } else {
      // Geocoding disabled - API key needs configuration
    // console.warn(`Geocoding failed for "${address}":`, data.status);
    }
  } catch (error) {
    console.error("Geocoding error:", error);
  }
}

// ============================================
// ANNEHMLICHKEITEN (AMENITIES)
// ============================================

/**
 * Annehmlichkeiten von API laden
 */
async function loadAmenities() {
  try {
    // i18n: Sprache an API übergeben
    const lang = (typeof I18N !== 'undefined' && I18N.currentLang) ? I18N.currentLang : 'de';
    const response = await fetch(`${CONFIG.API_PROXY_URL}/amenities?lang=${lang}`);
    const data = await response.json();

    if (data.success && data.amenities) {
      displayAmenities(data.amenities);
    } else {
      console.warn("Keine Annehmlichkeiten gefunden");
    }
  } catch (error) {
    console.error("Fehler beim Laden der Annehmlichkeiten:", error);
  }
}

/**
 * Annehmlichkeiten darstellen
 */
function displayAmenities(amenities) {
  const gridEl = document.querySelector(".amenities-grid");
  if (!gridEl) return;

  if (amenities.length === 0) {
    gridEl.innerHTML = `
      <p style="text-align: center; color: var(--text-muted); padding: 32px; grid-column: 1 / -1;">
        Keine Annehmlichkeiten verfügbar
      </p>
    `;
    return;
  }

  gridEl.innerHTML = amenities
    .map(
      (amenity) => `
    <div class="amenity">
      <div class="amenity-icon"><i data-lucide="${amenity.icon}"></i></div>
      <div class="amenity-text">
        <h4>${amenity.title}</h4>
        <p>${amenity.description}</p>
      </div>
    </div>
  `,
    )
    .join("");

  // Icons neu initialisieren
  lucide.createIcons();
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
              url('header-bg.jpg');
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

// ==========================================
// HOSTEL INFO & BANKDATEN
// ==========================================

/**
 * Hostel-Info laden (Kontakt, Bankdaten)
 */
async function loadHostelInfo() {
  try {
    // Check for apartment URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const apartmentSlug = urlParams.get("apt");

    let url = `${CONFIG.API_PROXY_URL}/hostel/info`;

    // Wenn kein Apartment-Parameter, prüfe Anzahl der Apartments
    if (!apartmentSlug) {
      const apartmentsResponse = await fetch(
        `${CONFIG.API_PROXY_URL}/apartments/public/list`,
      );
      const apartmentsData = await apartmentsResponse.json();

      if (apartmentsData.success && apartmentsData.apartments) {
        const apartments = apartmentsData.apartments;

        if (apartments.length === 1) {
          // Nur 1 Apartment → Automatisch laden
          url = `${CONFIG.API_PROXY_URL}/apartments/${apartments[0].slug}/info`;
        } else if (apartments.length > 1) {
          // Mehrere Apartments → Übersichtsseite anzeigen
          showApartmentOverview(apartments);
          return;
        }
        // Wenn 0 Apartments, nutze Standard hostel/info
      }
    } else {
      // Load apartment-specific info
      url = `${CONFIG.API_PROXY_URL}/apartments/${apartmentSlug}/info`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.success && data.info) {
      const info = data.info;

      // Website/Domain im Title anzeigen
      if (info.website) {
        const titleEl = document.getElementById("mainTitle");
        if (titleEl) titleEl.textContent = info.website;
      }

      // Tagline/Subtitle anzeigen (i18n-aware)
      const currentLang = (typeof I18N !== 'undefined' && I18N.currentLang) || 'de';
      const tagline = currentLang === 'en' && info.tagline_en ? info.tagline_en : info.tagline;
      if (tagline) {
        const subtitleEl = document.querySelector(".subtitle");
        if (subtitleEl) {
          // Format: "Tagline • Name"
          const locationPart = info.name || 'Hollenthon';
          subtitleEl.textContent = `${tagline} • ${locationPart}`;
        }
      }

      // Förmlichkeitsform laden
      if (info.formalAddress) {
        formalAddress = info.formalAddress;
        // Begrüßung neu generieren mit korrekter Anrede
        updateGreeting();
        // Alle Du/Sie-Texte aktualisieren
        updateFormalAddressTexts();
      }

      // Gastgeber-Name
      if (info.hostName) {
        const hostEl = document.getElementById("hostelHost");
        if (hostEl) hostEl.textContent = info.hostName;
      }

      // Kontaktdaten aktualisieren
      if (info.phone) {
        const phoneEl = document.getElementById("hostelPhoneDisplay");
        if (phoneEl) phoneEl.textContent = info.phone;
      }

      if (info.email) {
        const emailEl = document.getElementById("hostelEmailDisplay");
        if (emailEl) emailEl.textContent = info.email;
      }

      if (info.address) {
        const addressEl = document.getElementById("hostelAddressDisplay");
        if (addressEl) addressEl.textContent = info.address;

        // Geocode address to update LOCATION coordinates
        await geocodeAddress(info.address);
      }

      // Bankdaten anzeigen (nur wenn vorhanden)
      if (info.iban || info.bic || info.accountHolder) {
        const paymentCard = document.getElementById("paymentInfoCard");
        if (paymentCard) {
          if (info.iban) {
            const ibanEl = document.getElementById("displayIban");
            if (ibanEl) ibanEl.textContent = info.iban;
          }
          if (info.bic) {
            const bicEl = document.getElementById("displayBic");
            if (bicEl) bicEl.textContent = info.bic;
          }
          if (info.accountHolder) {
            const holderEl = document.getElementById("displayAccountHolder");
            if (holderEl) holderEl.textContent = info.accountHolder;
          }
          paymentCard.style.display = "block";
        }
      }
    }
  } catch (error) {
    console.error("Fehler beim Laden der Hostel-Info:", error);
  }
}

/**
 * Bankdaten kopieren
 */
function copyBankDetail(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const text = element.textContent;

  // Copy to clipboard
  navigator.clipboard
    .writeText(text)
    .then(() => {
      // Visual feedback
      const button = element.nextElementSibling;
      if (button && button.classList.contains("copy-btn-inline")) {
        const originalHTML = button.innerHTML;
        button.innerHTML =
          '<i data-lucide="check" style="width: 14px; height: 14px;"></i>';
        lucide.createIcons();
        setTimeout(() => {
          button.innerHTML = originalHTML;
          lucide.createIcons();
        }, 1500);
      }
    })
    .catch((err) => {
      console.error("Fehler beim Kopieren:", err);
    });
}

/**
 * Apartment-Übersichtsseite anzeigen (wenn mehrere Apartments vorhanden)
 */
function showApartmentOverview(apartments) {
  // Verstecke normalen Content
  const mainContent = document.querySelector("main");
  if (mainContent) mainContent.style.display = "none";

  const header = document.querySelector(".header");
  if (header) header.style.display = "none";

  // Erstelle Übersichtsseite
  const overviewContainer = document.createElement("div");
  overviewContainer.id = "apartmentOverview";
  overviewContainer.innerHTML = `
    <style>
      #apartmentOverview {
        min-height: 100vh;
        background: var(--cream);
        padding: 60px 24px;
      }
      .overview-header {
        text-align: center;
        margin-bottom: 60px;
      }
      .overview-header h1 {
        font-size: 2.5rem;
        color: var(--forest);
        margin-bottom: 16px;
      }
      .overview-header p {
        font-size: 1.1rem;
        color: var(--text-light);
      }
      .apartments-grid {
        max-width: 1000px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 24px;
      }
      .apartment-card {
        background: white;
        border-radius: 24px;
        padding: 32px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        transition: transform 0.3s, box-shadow 0.3s;
        cursor: pointer;
        text-decoration: none;
        color: inherit;
        display: block;
      }
      .apartment-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 30px rgba(0,0,0,0.12);
      }
      .apartment-name {
        font-size: 1.8rem;
        font-weight: 600;
        color: var(--forest);
        margin-bottom: 12px;
      }
      .apartment-location {
        font-size: 1rem;
        color: var(--text-light);
        display: flex;
        align-items: center;
        gap: 8px;
      }
    </style>

    <div class="overview-header">
      <h1>Wähle deine Unterkunft</h1>
      <p>Mehrere Apartments verfügbar</p>
    </div>

    <div class="apartments-grid">
      ${apartments
        .map(
          (apt) => `
        <a href="?apt=${apt.slug}" class="apartment-card">
          <div class="apartment-name">${apt.name}</div>
          <div class="apartment-location">
            <i data-lucide="map-pin" style="width: 16px; height: 16px;"></i>
            <span>${apt.location || "Standort nicht angegeben"}</span>
          </div>
        </a>
      `,
        )
        .join("")}
    </div>
  `;

  document.body.appendChild(overviewContainer);
  lucide.createIcons();
}

/**
 * Scroll zu einer Sektion
 */
function scrollToSection(sectionId) {
  const element = document.getElementById(sectionId);
  if (!element) {
    console.warn(`Element mit ID "${sectionId}" nicht gefunden`);
    return;
  }

  element.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

// Funktion global verfügbar machen
window.scrollToSection = scrollToSection;

// App starten
document.addEventListener("DOMContentLoaded", init);
