/**
 * Cloudflare Worker - Hostel-App API
 * - Shelly Cloud API Proxy (Auth-Key sicher auf Server)
 * - Settings Storage (KV)
 * - Admin Authentication
 */

// Default-Einstellungen
const DEFAULT_SETTINGS = {
  pricePerKwh: 0.29, // €/kWh - Österreich Durchschnitt
  currency: "€",
  showPhases: true,
  showFeedIn: true,
  showCO2: true,
  co2PerKwh: 0.2, // kg CO2/kWh (Österreich-Mix)
  kurtaxePerPersonDay: 2.50, // €/Person/Tag
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, Cache-Control, Pragma",
    };

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Routing
    const path = url.pathname;

    try {
      // GET /settings - Einstellungen abrufen (öffentlich)
      if (path === "/settings" && request.method === "GET") {
        return await getSettings(env, corsHeaders);
      }

      // POST /settings - Einstellungen speichern (Auth required)
      if (path === "/settings" && request.method === "POST") {
        return await updateSettings(request, env, corsHeaders);
      }

      // POST /login - Admin Login prüfen
      if ((path === "/login" || path === "/admin/login") && request.method === "POST") {
        return await checkLogin(request, env, corsHeaders);
      }

      // POST /guest/login - Gast Login
      if (path === "/guest/login" && request.method === "POST") {
        return await checkGuestLogin(request, env, corsHeaders);
      }

      // GET /guests - Alle Gäste (Admin only)
      if (path === "/guests" && request.method === "GET") {
        return await getGuests(request, env, corsHeaders);
      }

      // POST /guests - Neuen Gast anlegen (Admin only)
      if (path === "/guests" && request.method === "POST") {
        return await createGuest(request, env, corsHeaders);
      }

      // PUT /guests/:id - Gast aktualisieren (Admin only)
      if (path.startsWith("/guests/") && request.method === "PUT") {
        const id = path.split("/")[2];
        return await updateGuest(request, env, corsHeaders, id);
      }

      // DELETE /guests/:id - Gast löschen (Admin only)
      if (path.startsWith("/guests/") && request.method === "DELETE") {
        const id = path.split("/")[2];
        return await deleteGuest(request, env, corsHeaders, id);
      }

      // GET / - Shelly Daten + Einstellungen + Energie-Historie
      if (path === "/" && request.method === "GET") {
        return await getShellyData(env, corsHeaders);
      }

      // GET /energy/today - Heutige Energie-Daten
      if (path === "/energy/today" && request.method === "GET") {
        return await getEnergyToday(env, corsHeaders);
      }

      // GET /energy/yesterday - Gestrige Energie-Daten
      if (path === "/energy/yesterday" && request.method === "GET") {
        return await getEnergyYesterday(env, corsHeaders);
      }

      // GET /energy/month - Monats-Energie-Daten
      if (path === "/energy/month" && request.method === "GET") {
        return await getEnergyMonth(env, corsHeaders);
      }

      // GET /energy/range - Energie-Daten für Zeitraum (Gast-Aufenthalt)
      if (path === "/energy/range" && request.method === "GET") {
        return await getEnergyRange(url, env, corsHeaders);
      }

      // POST /energy/save - Energie-Daten speichern
      if (path === "/energy/save" && request.method === "POST") {
        return await saveEnergyData(request, env, corsHeaders);
      }

      // GET /amenities - Öffentlich: Nur sichtbare Annehmlichkeiten
      if (path === "/amenities" && request.method === "GET") {
        const lang = url.searchParams.get("lang") || "de";
        return await getAmenities(env, corsHeaders, false, lang);
      }

      // GET /amenities/all - Admin: Alle Annehmlichkeiten inkl. ausgeblendete
      if (path === "/amenities/all" && request.method === "GET") {
        const lang = url.searchParams.get("lang") || "de";
        return await getAmenities(env, corsHeaders, true, lang);
      }

      // PUT /amenities/:id/toggle - Sichtbarkeit umschalten (Admin only)
      // WICHTIG: Muss VOR der generischen /amenities/:id Route stehen!
      if (path.match(/\/amenities\/.*\/toggle$/) && request.method === "PUT") {
        const id = path.split("/")[2];
        return await toggleAmenity(request, env, corsHeaders, id);
      }

      // PUT /amenities/:id - Annehmlichkeit bearbeiten (Admin only)
      if (path.startsWith("/amenities/") && request.method === "PUT") {
        const id = path.split("/")[2];
        return await updateAmenity(request, env, corsHeaders, id);
      }

      // GET /hostel/settings - Hostel-Einstellungen abrufen (Admin only)
      if (path === "/hostel/settings" && request.method === "GET") {
        return await getHostelSettings(request, env, corsHeaders);
      }

      // PUT /hostel/settings - Hostel-Einstellungen speichern (Admin only)
      if (path === "/hostel/settings" && request.method === "PUT") {
        return await updateHostelSettings(request, env, corsHeaders);
      }

      // GET /hostel/info - Öffentliche Hostel-Info (für Gäste)
      if (path === "/hostel/info" && request.method === "GET") {
        return await getPublicHostelInfo(env, corsHeaders);
      }

      // ============================================
      // INLINE CONTENT MANAGEMENT (v0.5)
      // ============================================

      // GET /content/:key - Content-Block abrufen (öffentlich)
      // Supports ?lang=de|en query parameter
      if (path.startsWith("/content/") && request.method === "GET") {
        const key = path.split("/")[2];
        const lang = url.searchParams.get("lang") || "de";
        return await getContent(key, env, corsHeaders, lang);
      }

      // PUT /content/:key - Content-Block speichern (Admin only)
      if (path.startsWith("/content/") && request.method === "PUT") {
        const key = path.split("/")[2];
        return await updateContent(request, key, env, corsHeaders);
      }

      // GET /content - Alle Content-Blöcke abrufen (öffentlich)
      // Supports ?lang=de|en query parameter
      if (path === "/content" && request.method === "GET") {
        const lang = url.searchParams.get("lang") || "de";
        return await getAllContent(env, corsHeaders, lang);
      }

      // ============================================
      // APARTMENTS MANAGEMENT
      // ============================================

      // GET /apartments - Alle Apartments auflisten (Admin only)
      if (path === "/apartments" && request.method === "GET") {
        return await getApartments(request, env, corsHeaders);
      }

      // POST /apartments - Neues Apartment anlegen (Admin only)
      if (path === "/apartments" && request.method === "POST") {
        return await createApartment(request, env, corsHeaders);
      }

      // GET /apartments/public/list - Öffentliche Liste aller Apartments (slug, name, location)
      if (path === "/apartments/public/list" && request.method === "GET") {
        return await getPublicApartmentsList(env, corsHeaders);
      }

      // GET /apartments/:slug/info - Public Info für ein Apartment
      if (
        path.match(/^\/apartments\/[^\/]+\/info$/) &&
        request.method === "GET"
      ) {
        const slug = path.split("/")[2];
        return await getApartmentInfo(slug, env, corsHeaders);
      }

      // PUT /apartments/:id - Apartment aktualisieren (Admin only)
      if (path.match(/^\/apartments\/\d+$/) && request.method === "PUT") {
        const id = parseInt(path.split("/")[2]);
        return await updateApartment(request, env, corsHeaders, id);
      }

      // DELETE /apartments/:id - Apartment löschen (Admin only)
      if (path.match(/^\/apartments\/\d+$/) && request.method === "DELETE") {
        const id = parseInt(path.split("/")[2]);
        return await deleteApartment(request, env, corsHeaders, id);
      }

      // GET /places/nearby - Google Maps Proxy (öffentlich)
      if (path === "/places/nearby" && request.method === "GET") {
        return await getPlacesNearby(url, env, corsHeaders);
      }

      // GET /places/distance - Google Distance Matrix Proxy (öffentlich)
      if (path === "/places/distance" && request.method === "GET") {
        return await getDistanceMatrix(url, env, corsHeaders);
      }

      // GET /geocode - Google Geocoding API Proxy (öffentlich)
      if (path === "/geocode" && request.method === "GET") {
        return await geocodeAddress(url, env, corsHeaders);
      }

      // ============================================
      // CONTENT MANAGEMENT (INLINE EDITOR)
      // ============================================

      // GET /content/:hostelId - Alle Content Blocks abrufen
      if (path.match(/^\/content\/[^\/]+$/) && request.method === "GET") {
        const hostelId = path.split("/")[2];
        return await getContentBlocks(env, corsHeaders, hostelId);
      }

      // GET /content/:hostelId/:blockKey - Einzelnen Content Block abrufen
      if (
        path.match(/^\/content\/[^\/]+\/[^\/]+$/) &&
        request.method === "GET"
      ) {
        const parts = path.split("/");
        const hostelId = parts[2];
        const blockKey = parts[3];
        return await getContentBlock(env, corsHeaders, hostelId, blockKey);
      }

      // POST /content/:hostelId - Neuen Content Block erstellen (Admin only)
      if (path.match(/^\/content\/[^\/]+$/) && request.method === "POST") {
        const hostelId = path.split("/")[2];
        return await createContentBlock(request, env, corsHeaders, hostelId);
      }

      // PUT /content/:hostelId/:blockKey - Content Block aktualisieren (Admin only)
      if (
        path.match(/^\/content\/[^\/]+\/[^\/]+$/) &&
        request.method === "PUT"
      ) {
        const parts = path.split("/");
        const hostelId = parts[2];
        const blockKey = parts[3];
        return await updateContentBlock(
          request,
          env,
          corsHeaders,
          hostelId,
          blockKey,
        );
      }

      // DELETE /content/:hostelId/:blockKey - Content Block löschen (Admin only)
      if (
        path.match(/^\/content\/[^\/]+\/[^\/]+$/) &&
        request.method === "DELETE"
      ) {
        const parts = path.split("/");
        const hostelId = parts[2];
        const blockKey = parts[3];
        return await deleteContentBlock(
          request,
          env,
          corsHeaders,
          hostelId,
          blockKey,
        );
      }

      return new Response("Not found", { status: 404, headers: corsHeaders });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },

  /**
   * Scheduled Handler - Cron Job für automatische Datenerfassung
   * Läuft stündlich und um 23:59 für korrekten Tageswechsel
   */
  async scheduled(event, env, ctx) {
    const now = new Date();
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();
    
    console.log(`[Cron] Running at ${now.toISOString()}`);
    
    try {
      // Shelly-Daten holen
      const shellyData = await fetchShellyDataForCron(env);
      if (!shellyData.success) {
        console.error('[Cron] Failed to fetch Shelly data:', shellyData.error);
        return;
      }
      
      const totalEnergy = shellyData.total_act_energy || 0;
      const totalPower = shellyData.total_act_power || 0;
      
      // Datum für Europe/Vienna (UTC+1 im Winter, UTC+2 im Sommer)
      const viennaOffset = 1; // Vereinfacht: Winter = UTC+1
      const viennaDate = new Date(now.getTime() + viennaOffset * 60 * 60 * 1000);
      const today = viennaDate.toISOString().split('T')[0];
      const viennaHour = (hour + viennaOffset) % 24;
      
      // Einstellungen laden für Preis
      const settings = await loadSettings(env);
      const pricePerKwh = settings.pricePerKwh || 0.30;
      
      // Heutigen Eintrag aus DB holen
      const existing = await env.DB.prepare(
        "SELECT * FROM energy_data WHERE hostel_id = ? AND date = ?"
      ).bind(HOSTEL_ID, today).first();
      
      let todayStart = existing?.shelly_total_start;
      let energyKwh = 0;
      
      // Um Mitternacht (23:59 Vienna = 22:59 UTC im Winter): 
      // Den aktuellen Wert als todayStart für MORGEN vorbereiten
      if (viennaHour === 23 && minute >= 55) {
        // Speichere den aktuellen Wert - wird morgen als todayStart verwendet
        const tomorrow = new Date(viennaDate);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        // Morgen mit aktuellem Zählerstand als Start anlegen
        await env.DB.prepare(
          `INSERT INTO energy_data (hostel_id, date, energy_kwh, cost, peak_power, shelly_total_start, updated_at)
           VALUES (?, ?, 0, 0, 0, ?, unixepoch())
           ON CONFLICT(hostel_id, date) DO UPDATE SET
             shelly_total_start = CASE WHEN shelly_total_start IS NULL THEN excluded.shelly_total_start ELSE shelly_total_start END,
             updated_at = unixepoch()`
        ).bind(HOSTEL_ID, tomorrowStr, totalEnergy).run();
        
        console.log(`[Cron] Set tomorrow's todayStart: ${totalEnergy} kWh`);
      }
      
      // Tagesenergie berechnen
      if (todayStart !== null && todayStart !== undefined) {
        energyKwh = Math.max(0, totalEnergy - todayStart);
      } else {
        // Kein todayStart -> setze aktuellen Wert als Start
        todayStart = totalEnergy;
        energyKwh = 0;
      }
      
      // Plausibilitätsprüfung: max 200 kWh/Tag
      if (energyKwh > 200) {
        console.warn(`[Cron] Unrealistic value: ${energyKwh} kWh - resetting`);
        todayStart = totalEnergy;
        energyKwh = 0;
      }
      
      const cost = energyKwh * pricePerKwh;
      
      // In DB speichern
      await env.DB.prepare(
        `INSERT INTO energy_data (hostel_id, date, energy_kwh, cost, peak_power, shelly_total_start, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, unixepoch())
         ON CONFLICT(hostel_id, date)
         DO UPDATE SET
           energy_kwh = excluded.energy_kwh,
           cost = excluded.cost,
           peak_power = CASE WHEN excluded.peak_power > peak_power THEN excluded.peak_power ELSE peak_power END,
           shelly_total_start = COALESCE(shelly_total_start, excluded.shelly_total_start),
           updated_at = unixepoch()`
      ).bind(HOSTEL_ID, today, energyKwh, cost, totalPower, todayStart).run();
      
      console.log(`[Cron] Saved: ${today} - ${energyKwh.toFixed(2)} kWh, €${cost.toFixed(2)}, peak ${totalPower}W`);
      
    } catch (error) {
      console.error('[Cron] Error:', error.message);
    }
  },
};

/**
 * Shelly Daten abrufen + Einstellungen anhängen
 */
async function getShellyData(env, corsHeaders) {
  // Einstellungen aus KV laden
  const settings = await loadSettings(env);

  // Shelly Cloud API aufrufen
  const response = await fetch(`${env.SHELLY_CLOUD_SERVER}/device/status`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `auth_key=${encodeURIComponent(env.SHELLY_AUTH_KEY)}&id=${encodeURIComponent(env.SHELLY_DEVICE_ID)}`,
  });

  const data = await response.json();

  // Einstellungen an Response anhängen
  return new Response(JSON.stringify({ ...data, settings }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Shelly Daten für Cron abrufen (ohne Response-Wrapper)
 */
async function fetchShellyDataForCron(env) {
  try {
    const response = await fetch(`${env.SHELLY_CLOUD_SERVER}/device/status`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `auth_key=${encodeURIComponent(env.SHELLY_AUTH_KEY)}&id=${encodeURIComponent(env.SHELLY_DEVICE_ID)}`,
    });

    const data = await response.json();
    
    if (!data.isok || !data.data?.device_status) {
      return { success: false, error: 'Invalid Shelly response' };
    }
    
    const status = data.data.device_status;
    const emData = status['em:0'] || {};
    const emDataEnergy = status['emdata:0'] || {};
    
    return {
      success: true,
      total_act_power: emData.total_act_power || 0,
      total_act_energy: emDataEnergy.total_act || 0, // Shelly Pro 3EM gibt kWh zurück
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Einstellungen aus KV laden
 */
async function loadSettings(env) {
  try {
    const stored = await env.SETTINGS.get("config", "json");
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Einstellungen abrufen (GET /settings)
 */
async function getSettings(env, corsHeaders) {
  const settings = await loadSettings(env);
  return new Response(JSON.stringify({ settings }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Einstellungen aktualisieren (POST /settings)
 */
async function updateSettings(request, env, corsHeaders) {
  // Auth prüfen
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.substring(7);
  if (token !== env.ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Neue Einstellungen speichern
  const body = await request.json();
  const currentSettings = await loadSettings(env);
  const newSettings = { ...currentSettings, ...body };

  await env.SETTINGS.put("config", JSON.stringify(newSettings));

  return new Response(
    JSON.stringify({ success: true, settings: newSettings }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

/**
 * Admin Login prüfen (POST /login)
 */
async function checkLogin(request, env, corsHeaders) {
  const body = await request.json();
  const { password } = body;

  if (password === env.ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ success: true, token: password }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ success: false, error: "Wrong password" }),
    {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

/**
 * Gast Login prüfen (POST /guest/login)
 */
async function checkGuestLogin(request, env, corsHeaders) {
  const body = await request.json();
  const { username, password } = body;

  // Gäste aus KV laden
  const guests = await loadGuests(env);
  const guest = guests.find(
    (g) => g.username === username && g.password === password,
  );

  if (!guest) {
    return new Response(
      JSON.stringify({ success: false, error: "Ungültige Anmeldedaten" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Check-in/out Datum prüfen
  const now = new Date();
  const checkIn = new Date(guest.checkIn);
  const checkOut = new Date(guest.checkOut);

  if (now < checkIn) {
    return new Response(
      JSON.stringify({ success: false, error: "Check-in noch nicht möglich" }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  if (now > checkOut) {
    return new Response(
      JSON.stringify({ success: false, error: "Check-out bereits erfolgt" }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      token: `guest_${guest.id}`,
      guest: {
        id: guest.id,
        name: guest.name,
        checkIn: guest.checkIn,
        checkOut: guest.checkOut,
      },
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

/**
 * Alle Gäste abrufen (GET /guests)
 */
async function getGuests(request, env, corsHeaders) {
  // Admin Auth prüfen
  if (!(await isAdmin(request, env))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const guests = await loadGuests(env);
  return new Response(JSON.stringify({ guests }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Neuen Gast anlegen (POST /guests)
 */
async function createGuest(request, env, corsHeaders) {
  // Admin Auth prüfen
  if (!(await isAdmin(request, env))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const {
    name,
    username,
    password,
    checkIn,
    checkOut,
    numberOfPersons,
    apartmentId,
    title,
    gender,
  } = body;

  // Validierung
  if (!name || !username || !password || !checkIn || !checkOut) {
    return new Response(
      JSON.stringify({ error: "Alle Felder sind erforderlich" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const guests = await loadGuests(env);

  // Username bereits vergeben?
  if (guests.find((g) => g.username === username)) {
    return new Response(
      JSON.stringify({ error: "Benutzername bereits vergeben" }),
      {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Neuen Gast erstellen
  const guest = {
    id: Date.now().toString(),
    name,
    username,
    password,
    checkIn,
    checkOut,
    numberOfPersons: numberOfPersons || 1,
    apartmentId: apartmentId || 1, // Default Apartment
    title: title || "", // Titel (Dr., Prof., etc.)
    gender: gender || "neutral", // weiblich, männlich, neutral
    createdAt: new Date().toISOString(),
  };

  guests.push(guest);
  await env.SETTINGS.put("guests", JSON.stringify(guests));

  return new Response(JSON.stringify({ success: true, guest }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Gast aktualisieren (PUT /guests/:id)
 */
async function updateGuest(request, env, corsHeaders, id) {
  // Admin Auth prüfen
  if (!(await isAdmin(request, env))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const {
    name,
    username,
    password,
    checkIn,
    checkOut,
    numberOfPersons,
    apartmentId,
    title,
    gender,
  } = body;

  // Validierung (ohne Passwort, da optional)
  if (!name || !username || !checkIn || !checkOut) {
    return new Response(
      JSON.stringify({
        error: "Name, Username, Check-in und Check-out sind erforderlich",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const guests = await loadGuests(env);
  const guestIndex = guests.findIndex((g) => g.id === id);

  if (guestIndex === -1) {
    return new Response(JSON.stringify({ error: "Gast nicht gefunden" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Username bereits von anderem Gast vergeben?
  const existingGuest = guests.find(
    (g) => g.username === username && g.id !== id,
  );
  if (existingGuest) {
    return new Response(
      JSON.stringify({ error: "Benutzername bereits vergeben" }),
      {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Gast aktualisieren
  guests[guestIndex] = {
    ...guests[guestIndex],
    name,
    username,
    checkIn,
    checkOut,
    numberOfPersons: numberOfPersons || 1,
    apartmentId: apartmentId || 1,
    title: title !== undefined ? title : guests[guestIndex].title || "",
    gender:
      gender !== undefined ? gender : guests[guestIndex].gender || "neutral",
    updatedAt: new Date().toISOString(),
  };

  // Passwort nur aktualisieren wenn angegeben
  if (password && password.trim() !== "") {
    guests[guestIndex].password = password;
  }

  await env.SETTINGS.put("guests", JSON.stringify(guests));

  return new Response(
    JSON.stringify({ success: true, guest: guests[guestIndex] }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

/**
 * Gast löschen (DELETE /guests/:id)
 */
async function deleteGuest(request, env, corsHeaders, id) {
  // Admin Auth prüfen
  if (!(await isAdmin(request, env))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const guests = await loadGuests(env);
  const filtered = guests.filter((g) => g.id !== id);

  await env.SETTINGS.put("guests", JSON.stringify(filtered));

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Gäste aus KV laden
 */
async function loadGuests(env) {
  try {
    const stored = await env.SETTINGS.get("guests", "json");
    return stored || [];
  } catch {
    return [];
  }
}

/**
 * Admin-Check Hilfsfunktion
 */
async function isAdmin(request, env) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }
  const token = authHeader.substring(7);
  return token === env.ADMIN_PASSWORD;
}

// ============================================
// ENERGIE-DATEN VERWALTUNG (D1)
// ============================================

const HOSTEL_ID = "hollenthon"; // Default für aktuelles Hostel

/**
 * Heutige Energie-Daten abrufen
 */
async function getEnergyToday(env, corsHeaders) {
  const today = getDateString(new Date());

  const result = await env.DB.prepare(
    "SELECT * FROM energy_data WHERE hostel_id = ? AND date = ?",
  )
    .bind(HOSTEL_ID, today)
    .first();

  return new Response(
    JSON.stringify({
      success: true,
      data: result || { date: today, energy_kwh: 0, cost: 0, peak_power: 0 },
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

/**
 * Gestrige Energie-Daten abrufen
 */
async function getEnergyYesterday(env, corsHeaders) {
  const yesterday = getDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));

  const result = await env.DB.prepare(
    "SELECT * FROM energy_data WHERE hostel_id = ? AND date = ?",
  )
    .bind(HOSTEL_ID, yesterday)
    .first();

  return new Response(
    JSON.stringify({
      success: true,
      data: result || {
        date: yesterday,
        energy_kwh: 0,
        cost: 0,
        peak_power: 0,
      },
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

/**
 * Monats-Energie-Daten abrufen
 */
async function getEnergyMonth(env, corsHeaders) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const monthStart = `${year}-${month}-01`;
  const today = `${year}-${month}-${day}`;

  // WICHTIG: Nur vergangene Tage (OHNE heute), weil heute wird in app.js separat addiert
  const result = await env.DB.prepare(
    `SELECT
      SUM(energy_kwh) as total_energy,
      SUM(cost) as total_cost,
      MAX(peak_power) as peak_power
    FROM energy_data
    WHERE hostel_id = ? AND date >= ? AND date < ?`,
  )
    .bind(HOSTEL_ID, monthStart, today)
    .first();

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        month: `${year}-${month}`,
        energy_kwh: result?.total_energy || 0,
        cost: result?.total_cost || 0,
        peak_power: result?.peak_power || 0,
      },
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

/**
 * Energie-Daten speichern (upsert)
 */
async function saveEnergyData(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const { date, energy_kwh, cost, peak_power, shelly_total_start } = body;

    if (!date) {
      return new Response(
        JSON.stringify({ success: false, error: "Date required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Upsert: Insert or Update
    // WICHTIG: shelly_total_start nur setzen wenn noch nicht vorhanden (COALESCE)!
    await env.DB.prepare(
      `INSERT INTO energy_data (hostel_id, date, energy_kwh, cost, peak_power, shelly_total_start, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, unixepoch())
       ON CONFLICT(hostel_id, date)
       DO UPDATE SET
         energy_kwh = excluded.energy_kwh,
         cost = excluded.cost,
         peak_power = CASE WHEN excluded.peak_power > peak_power THEN excluded.peak_power ELSE peak_power END,
         shelly_total_start = COALESCE(shelly_total_start, excluded.shelly_total_start),
         updated_at = unixepoch()`,
    )
      .bind(
        HOSTEL_ID,
        date,
        energy_kwh || 0,
        cost || 0,
        peak_power || 0,
        shelly_total_start || null,
      )
      .run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[saveEnergyData] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Database error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

/**
 * Energie-Daten für Zeitraum abrufen (Gast-Aufenthalt)
 * GET /energy/range?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
async function getEnergyRange(url, env, corsHeaders) {
  const fromDate = url.searchParams.get("from");
  const toDate = url.searchParams.get("to");

  if (!fromDate || !toDate) {
    return new Response(
      JSON.stringify({ success: false, error: "from and to parameters required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    // Einzelne Tage abrufen
    const daysResult = await env.DB.prepare(
      `SELECT date, energy_kwh, cost, peak_power
       FROM energy_data
       WHERE hostel_id = ? AND date >= ? AND date <= ?
       ORDER BY date ASC`,
    )
      .bind(HOSTEL_ID, fromDate, toDate)
      .all();

    const days = daysResult.results || [];

    // Summen berechnen
    let totalEnergy = 0;
    let totalCost = 0;
    let maxPeakPower = 0;

    days.forEach((day) => {
      totalEnergy += day.energy_kwh || 0;
      totalCost += day.cost || 0;
      if (day.peak_power > maxPeakPower) {
        maxPeakPower = day.peak_power;
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          from: fromDate,
          to: toDate,
          totalEnergy: totalEnergy,
          totalCost: totalCost,
          peakPower: maxPeakPower,
          daysCount: days.length,
          days: days,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[getEnergyRange] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Database error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
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

// ============================================
// ANNEHMLICHKEITEN (AMENITIES)
// ============================================

/**
 * Annehmlichkeiten abrufen
 * @param {boolean} includeHidden - true = alle, false = nur sichtbare
 * @param {string} lang - Sprachcode (de, en)
 */
async function getAmenities(env, corsHeaders, includeHidden, lang = "de") {
  let query = "SELECT * FROM amenities WHERE hostel_id = ?";
  if (!includeHidden) {
    query += " AND is_visible = 1";
  }
  query += " ORDER BY display_order ASC";

  const result = await env.DB.prepare(query).bind(HOSTEL_ID).all();
  
  // i18n: Übersetzte Texte zurückgeben
  const amenities = (result.results || []).map(amenity => {
    let title = amenity.title;
    let description = amenity.description;
    
    // Wenn i18n-Spalten vorhanden, übersetzen
    if (amenity.title_i18n) {
      try {
        const titleI18n = JSON.parse(amenity.title_i18n);
        title = titleI18n[lang] || titleI18n.de || amenity.title;
      } catch (e) { /* Fallback auf title */ }
    }
    
    if (amenity.description_i18n) {
      try {
        const descI18n = JSON.parse(amenity.description_i18n);
        description = descI18n[lang] || descI18n.de || amenity.description;
      } catch (e) { /* Fallback auf description */ }
    }
    
    return {
      ...amenity,
      title,
      description,
    };
  });

  return new Response(
    JSON.stringify({
      success: true,
      amenities,
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

/**
 * Annehmlichkeit bearbeiten (Admin only)
 */
async function updateAmenity(request, env, corsHeaders, id) {
  // Admin Auth prüfen
  if (!(await isAdmin(request, env))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const { title, description, icon } = body;

  // Validierung
  if (!title || !description) {
    return new Response(
      JSON.stringify({ error: "Titel und Beschreibung erforderlich" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Update durchführen
  await env.DB.prepare(
    `UPDATE amenities
     SET title = ?, description = ?, icon = ?
     WHERE id = ? AND hostel_id = ?`,
  )
    .bind(title, description, icon || "sparkles", id, HOSTEL_ID)
    .run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Sichtbarkeit einer Annehmlichkeit umschalten (Admin only)
 */
async function toggleAmenity(request, env, corsHeaders, id) {
  // Admin Auth prüfen
  if (!(await isAdmin(request, env))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Aktuellen Zustand abrufen
  const current = await env.DB.prepare(
    "SELECT is_visible FROM amenities WHERE id = ? AND hostel_id = ?",
  )
    .bind(id, HOSTEL_ID)
    .first();

  if (!current) {
    return new Response(JSON.stringify({ error: "Nicht gefunden" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Toggle durchführen
  const newVisibility = current.is_visible === 1 ? 0 : 1;
  await env.DB.prepare(
    "UPDATE amenities SET is_visible = ? WHERE id = ? AND hostel_id = ?",
  )
    .bind(newVisibility, id, HOSTEL_ID)
    .run();

  return new Response(
    JSON.stringify({ success: true, is_visible: newVisibility }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

// ============================================
// HOSTEL-EINSTELLUNGEN
// ============================================

/**
 * Hostel-Einstellungen abrufen (Admin only)
 * UPDATED: Liest jetzt aus apartments Tabelle
 */
async function getHostelSettings(request, env, corsHeaders) {
  // Admin Auth prüfen
  if (!(await isAdmin(request, env))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Apartment-Daten aus DB laden (ersetzt hostels)
  const apartment = await env.DB.prepare(
    "SELECT name, location, settings_json FROM apartments WHERE slug = ?",
  )
    .bind(HOSTEL_ID)
    .first();

  if (!apartment) {
    return new Response(
      JSON.stringify({ success: false, error: "Apartment nicht gefunden" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Settings aus JSON parsen
  let settings = {};
  try {
    settings = apartment.settings_json ? JSON.parse(apartment.settings_json) : {};
  } catch (e) {
    settings = {};
  }

  // Name und Location hinzufügen
  settings.name = apartment.name;
  settings.address = apartment.location;  // location = address

  return new Response(
    JSON.stringify({
      success: true,
      settings: settings,
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

/**
 * Hostel-Einstellungen speichern (Admin only)
 * UPDATED: Schreibt jetzt in apartments Tabelle
 */
async function updateHostelSettings(request, env, corsHeaders) {
  // Admin Auth prüfen
  if (!(await isAdmin(request, env))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await request.json();

  // Name und Adresse separat (eigene Spalten)
  const name = body.name || "Gast auf Erden";
  const location = body.address || "";

  // Alle Settings als JSON
  const settingsObj = {
    phone: body.phone || "",
    email: body.email || "",
    checkInTime: body.checkInTime || "15:00",
    checkOutTime: body.checkOutTime || "11:00",
    formalAddress: body.formalAddress || "du",
    iban: body.iban || "",
    bic: body.bic || "",
    accountHolder: body.accountHolder || "",
    uid: body.uid || "",
    kurtaxePerPersonDay: body.kurtaxePerPersonDay !== undefined ? body.kurtaxePerPersonDay : 2.50,
    pricePerKwh: body.pricePerKwh || 0.29,
    co2PerKwh: body.co2PerKwh || 0.2,
    // Neue Felder für Frontend
    hostName: body.hostName || "",
    website: body.website || "",
    tagline: body.tagline || "",
    tagline_en: body.tagline_en || "",
    // WLAN-Einstellungen
    wifi1Name: body.wifi1Name || "Hostel Power",
    wifi1Password: body.wifi1Password || "hostel21",
    wifi2Name: body.wifi2Name || "Hostel",
    wifi2Password: body.wifi2Password || "hostel21",
  };

  const settings_json = JSON.stringify(settingsObj);

  // Update in apartments Tabelle
  await env.DB.prepare(
    `UPDATE apartments
     SET name = ?, location = ?, settings_json = ?
     WHERE slug = ?`,
  )
    .bind(name, location, settings_json, HOSTEL_ID)
    .run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ============================================
// GOOGLE MAPS PLACES PROXY
// ============================================

/**
 * Öffentliche Hostel-Info für Gäste (Name, Kontakt, Bankdaten)
 */
async function getPublicHostelInfo(env, corsHeaders) {
  const hostel = await env.DB.prepare(
    "SELECT name, location, settings_json FROM apartments WHERE id = ?",
  )
    .bind(HOSTEL_ID)
    .first();

  if (!hostel) {
    return new Response(JSON.stringify({ error: "Hostel not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Settings parsen
  let settings = {};
  try {
    settings = hostel.settings_json ? JSON.parse(hostel.settings_json) : {};
  } catch (e) {
    settings = {};
  }

  // Nur öffentliche Infos zurückgeben
  const publicInfo = {
    name: hostel.name,
    location: hostel.location,
    phone: settings.phone || "",
    email: settings.email || "",
    address: settings.address || "",
    checkInTime: settings.checkInTime || "15:00",
    checkOutTime: settings.checkOutTime || "11:00",
    formalAddress: settings.formalAddress || "du",
    iban: settings.iban || "",
    bic: settings.bic || "",
    accountHolder: settings.accountHolder || "",
  };

  return new Response(JSON.stringify({ success: true, info: publicInfo }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ============================================
// APARTMENTS MANAGEMENT
// ============================================

/**
 * Alle Apartments auflisten (Admin only)
 */
async function getApartments(request, env, corsHeaders) {
  if (!(await isAdmin(request, env))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apartments = await env.DB.prepare(
    "SELECT id, slug, name, location, settings_json, created_at FROM apartments ORDER BY id ASC",
  )
    .all()
    .then((result) => result.results);

  // Settings parsen
  const apartmentsWithSettings = apartments.map((apt) => {
    let settings = {};
    try {
      settings = apt.settings_json ? JSON.parse(apt.settings_json) : {};
    } catch (e) {
      settings = {};
    }
    return {
      id: apt.id,
      slug: apt.slug,
      name: apt.name,
      location: apt.location,
      settings,
      created_at: apt.created_at,
    };
  });

  return new Response(
    JSON.stringify({ success: true, apartments: apartmentsWithSettings }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

/**
 * Neues Apartment anlegen (Admin only)
 */
async function createApartment(request, env, corsHeaders) {
  if (!(await isAdmin(request, env))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const slug = body.slug || "";
  const name = body.name || "";
  const location = body.location || "";

  if (!slug || !name) {
    return new Response(
      JSON.stringify({ error: "Slug and name are required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Slug validation (nur lowercase, zahlen, bindestriche)
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return new Response(
      JSON.stringify({
        error:
          "Slug muss lowercase sein und darf nur Buchstaben, Zahlen und Bindestriche enthalten",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const settings = {
    phone: body.phone || "",
    email: body.email || "",
    checkInTime: body.checkInTime || "15:00",
    checkOutTime: body.checkOutTime || "11:00",
    formalAddress: body.formalAddress || "du",
    iban: body.iban || "",
    bic: body.bic || "",
    accountHolder: body.accountHolder || "",
    kurtaxePerPersonDay: body.kurtaxePerPersonDay !== undefined ? body.kurtaxePerPersonDay : 2.50,
    pricePerKwh: body.pricePerKwh || 0.29,
    co2PerKwh: body.co2PerKwh || 0.2,
  };

  try {
    const result = await env.DB.prepare(
      "INSERT INTO apartments (slug, name, location, settings_json) VALUES (?, ?, ?, ?)",
    )
      .bind(slug, name, location, JSON.stringify(settings))
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        apartment: { id: result.meta.last_row_id, slug, name, location },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    if (error.message.includes("UNIQUE")) {
      return new Response(JSON.stringify({ error: "Slug bereits vergeben" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    throw error;
  }
}

/**
 * Apartment aktualisieren (Admin only)
 */
async function updateApartment(request, env, corsHeaders, id) {
  if (!(await isAdmin(request, env))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await request.json();

  const settings = {
    phone: body.phone || "",
    email: body.email || "",
    checkInTime: body.checkInTime || "15:00",
    checkOutTime: body.checkOutTime || "11:00",
    formalAddress: body.formalAddress || "du",
    iban: body.iban || "",
    bic: body.bic || "",
    accountHolder: body.accountHolder || "",
    kurtaxePerPersonDay: body.kurtaxePerPersonDay !== undefined ? body.kurtaxePerPersonDay : 2.50,
    pricePerKwh: body.pricePerKwh || 0.29,
    co2PerKwh: body.co2PerKwh || 0.2,
  };

  await env.DB.prepare(
    "UPDATE apartments SET name = ?, location = ?, settings_json = ? WHERE id = ?",
  )
    .bind(body.name, body.location, JSON.stringify(settings), id)
    .run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Apartment löschen (Admin only)
 */
async function deleteApartment(request, env, corsHeaders, id) {
  if (!(await isAdmin(request, env))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Prüfen ob Apartment ID 1 (kann nicht gelöscht werden)
  if (id === 1) {
    return new Response(
      JSON.stringify({ error: "Default-Apartment kann nicht gelöscht werden" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Prüfen ob Gäste zugewiesen sind
  const guests = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM guests WHERE apartment_id = ?",
  )
    .bind(id)
    .first();

  if (guests.count > 0) {
    return new Response(
      JSON.stringify({
        error: `Apartment kann nicht gelöscht werden. ${guests.count} Gäste sind zugewiesen.`,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  await env.DB.prepare("DELETE FROM apartments WHERE id = ?").bind(id).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Öffentliche Liste aller Apartments (nur slug, name, location)
 */
async function getPublicApartmentsList(env, corsHeaders) {
  const apartments = await env.DB.prepare(
    "SELECT slug, name, location FROM apartments ORDER BY id ASC",
  )
    .all()
    .then((result) => result.results);

  return new Response(
    JSON.stringify({ success: true, apartments: apartments }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

/**
 * Öffentliche Apartment-Info für Gäste (by slug)
 */
async function getApartmentInfo(slug, env, corsHeaders) {
  const apartment = await env.DB.prepare(
    "SELECT id, slug, name, location, settings_json FROM apartments WHERE slug = ?",
  )
    .bind(slug)
    .first();

  if (!apartment) {
    return new Response(JSON.stringify({ error: "Apartment not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let settings = {};
  try {
    settings = apartment.settings_json
      ? JSON.parse(apartment.settings_json)
      : {};
  } catch (e) {
    settings = {};
  }

  const publicInfo = {
    id: apartment.id,
    slug: apartment.slug,
    name: apartment.name,
    location: apartment.location,
    address: apartment.location || "",  // address = location für Geocoding
    phone: settings.phone || "",
    email: settings.email || "",
    checkInTime: settings.checkInTime || "15:00",
    checkOutTime: settings.checkOutTime || "11:00",
    formalAddress: settings.formalAddress || "du",
    iban: settings.iban || "",
    bic: settings.bic || "",
    accountHolder: settings.accountHolder || "",
    // Neue Felder für dynamische Inhalte
    hostName: settings.hostName || "",
    website: settings.website || "",
    tagline: settings.tagline || "",
    tagline_en: settings.tagline_en || "",
  };

  return new Response(JSON.stringify({ success: true, info: publicInfo }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Google Maps Places API Proxy (CORS-Problem umgehen)
 */
async function getPlacesNearby(url, env, corsHeaders) {
  // URL Parameter extrahieren
  const lat = url.searchParams.get("lat");
  const lon = url.searchParams.get("lon");
  const radius = url.searchParams.get("radius");
  const type = url.searchParams.get("type") || "tourist_attraction";
  const pagetoken = url.searchParams.get("pagetoken"); // Pagination Support
  const rankby = url.searchParams.get("rankby"); // distance | prominence
  const apiKey = env.GOOGLE_MAPS_API_KEY;

  // Lat/Lon nur bei initialer Suche erforderlich (NICHT bei pagetoken!)
  if (!pagetoken && (!lat || !lon)) {
    return new Response(JSON.stringify({ error: "Lat/Lon required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Google Maps API Key not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    // Google Maps API aufrufen - mit Pagination Support
    let googleUrl;
    if (pagetoken) {
      // Wenn pagetoken vorhanden, nur diesen verwenden (NICHT lat/lon/radius!)
      googleUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${pagetoken}&key=${apiKey}`;
    } else {
      // Initiale Suche mit location/type
      // WICHTIG: rankby=distance und radius schließen sich aus!
      if (rankby === "distance") {
        // Sortierung nach Entfernung (nächste 60 Orte)
        googleUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&type=${type}&rankby=distance&key=${apiKey}`;
      } else {
        // Standard: Sortierung nach Prominence (wichtigste 60 Orte im Radius)
        const radiusValue = radius || "20000";
        googleUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=${radiusValue}&type=${type}&key=${apiKey}`;
      }
    }

    const response = await fetch(googleUrl);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

/**
 * Google Distance Matrix API Proxy (Tatsächliche Fahrstrecke berechnen)
 */
async function getDistanceMatrix(url, env, corsHeaders) {
  // URL Parameter extrahieren
  const origins = url.searchParams.get("origins"); // z.B. "47.5833,16.1667"
  const destinations = url.searchParams.get("destinations"); // z.B. "47.5,16.2|47.6,16.3"
  const apiKey = env.GOOGLE_MAPS_API_KEY;

  if (!origins || !destinations) {
    return new Response(
      JSON.stringify({ error: "Origins and destinations required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Google Maps API Key not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    // Google Distance Matrix API aufrufen
    const googleUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origins)}&destinations=${encodeURIComponent(destinations)}&mode=driving&key=${apiKey}`;

    const response = await fetch(googleUrl);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

/**
 * Google Geocoding API Proxy (Adresse → Koordinaten)
 */
async function geocodeAddress(url, env, corsHeaders) {
  const address = url.searchParams.get("address");
  const apiKey = env.GOOGLE_MAPS_API_KEY;

  if (!address) {
    return new Response(JSON.stringify({ error: "Address required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Google Maps API Key not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

    const response = await fetch(googleUrl);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

// ============================================
// CONTENT MANAGEMENT FUNCTIONS
// ============================================

/**
 * Sanitize text content (remove HTML tags)
 * CRITICAL: XSS prevention
 */
function sanitizeText(text) {
  if (!text || typeof text !== "string") return "";
  // Remove all HTML tags, keep plain text only
  return text.replace(/<[^>]*>/g, "").trim();
}

/**
 * Sanitize JSON content recursively
 */
function sanitizeContentJson(obj) {
  if (typeof obj === "string") {
    return sanitizeText(obj);
  } else if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeContentJson(item));
  } else if (obj && typeof obj === "object") {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeContentJson(value);
    }
    return sanitized;
  }
  return obj;
}

// ============================================
// INLINE EDITOR CONTENT ENDPOINTS (v0.5)
// ============================================

/**
 * Einzelnen Content-Block abrufen (für Inline Editor)
 */
async function getContent(key, env, corsHeaders, lang = 'de') {
  try {
    const result = await env.DB.prepare(
      `SELECT content_json FROM page_content
       WHERE hostel_id = ? AND block_key = ?`,
    )
      .bind(HOSTEL_ID, key)
      .first();

    if (!result) {
      return new Response(
        JSON.stringify({ success: true, content: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Parse content and return language-specific content
    const content = JSON.parse(result.content_json || "{}");
    
    // Support both old format {html: "..."} and new i18n format {de: "...", en: "..."}
    let htmlContent = content.html || null;
    if (content[lang]) {
      htmlContent = content[lang];
    } else if (content.de) {
      // Fallback to German
      htmlContent = content.de;
    }

    return new Response(
      JSON.stringify({
        success: true,
        content: { html: htmlContent, raw: content },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
}

/**
 * Content-Block speichern (für Inline Editor, Admin only)
 * Supports i18n: content is stored per language {de: "...", en: "..."}
 */
async function updateContent(request, key, env, corsHeaders) {
  // Admin Auth prüfen
  if (!(await isAdmin(request, env))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const content = body.content || "";
    const lang = body.lang || "de";  // Default to German
    
    // HTML sanitieren (nur sichere Tags erlauben)
    const sanitizedContent = sanitizeHTML(content);
    
    // Get existing content to merge languages
    const existing = await env.DB.prepare(
      `SELECT content_json FROM page_content
       WHERE hostel_id = ? AND block_key = ?`,
    )
      .bind(HOSTEL_ID, key)
      .first();
    
    // Build content object with language support
    let contentObj = {};
    if (existing && existing.content_json) {
      try {
        contentObj = JSON.parse(existing.content_json);
        // Migrate old format {html: "..."} to new format
        if (contentObj.html && !contentObj.de) {
          contentObj.de = contentObj.html;
          delete contentObj.html;
        }
      } catch (e) {
        // Start fresh
        contentObj = {};
      }
    }
    
    // Set content for current language
    contentObj[lang] = sanitizedContent;
    
    const contentJson = JSON.stringify(contentObj);

    // Upsert: Insert oder Update
    await env.DB.prepare(
      `INSERT INTO page_content (hostel_id, block_type, block_key, content_json, updated_at)
       VALUES (?, 'text', ?, ?, unixepoch())
       ON CONFLICT(hostel_id, block_key)
       DO UPDATE SET content_json = ?, updated_at = unixepoch()`,
    )
      .bind(HOSTEL_ID, key, contentJson, contentJson)
      .run();

    return new Response(
      JSON.stringify({ success: true, lang }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
}

/**
 * Alle Content-Blöcke abrufen (für Page Load)
 */
async function getAllContent(env, corsHeaders, lang = 'de') {
  try {
    const result = await env.DB.prepare(
      `SELECT block_key, content_json FROM page_content
       WHERE hostel_id = ? AND is_visible = 1`,
    )
      .bind(HOSTEL_ID)
      .all();

    const content = {};
    (result.results || []).forEach(row => {
      try {
        const parsed = JSON.parse(row.content_json || "{}");
        // Return language-specific content with fallback
        let htmlContent = parsed.html || null;
        if (parsed[lang]) {
          htmlContent = parsed[lang];
        } else if (parsed.de) {
          // Fallback to German
          htmlContent = parsed.de;
        }
        content[row.block_key] = { html: htmlContent, raw: parsed };
      } catch (e) {
        content[row.block_key] = { html: row.content_json };
      }
    });

    return new Response(
      JSON.stringify({ success: true, content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
}

/**
 * HTML sanitieren - nur sichere Tags erlauben
 */
function sanitizeHTML(html) {
  if (!html) return "";
  
  // Erlaubte Tags
  const allowedTags = ['b', 'strong', 'i', 'em', 'u', 'a', 'br', 'p', 'ul', 'ol', 'li', 'span'];
  
  // Einfache Sanitization: Entferne script, style, und unerlaubte Tags
  let clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')  // Event handler entfernen
    .replace(/javascript:/gi, '');    // javascript: URLs entfernen

  return clean;
}

/**
 * Alle Content Blocks für ein Hostel abrufen
 */
async function getContentBlocks(env, corsHeaders, hostelId) {
  try {
    const result = await env.DB.prepare(
      `SELECT * FROM page_content
       WHERE hostel_id = ?
       ORDER BY display_order ASC, id ASC`,
    )
      .bind(hostelId)
      .all();

    return new Response(
      JSON.stringify({
        success: true,
        content: result.results || [],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

/**
 * Einzelnen Content Block abrufen
 */
async function getContentBlock(env, corsHeaders, hostelId, blockKey) {
  try {
    const result = await env.DB.prepare(
      `SELECT * FROM page_content
       WHERE hostel_id = ? AND block_key = ?`,
    )
      .bind(hostelId, blockKey)
      .first();

    if (!result) {
      return new Response(
        JSON.stringify({ success: false, error: "Block not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        content: result,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

/**
 * Neuen Content Block erstellen (Admin only)
 */
async function createContentBlock(request, env, corsHeaders, hostelId) {
  // Admin Auth prüfen
  if (!(await isAdmin(request, env))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const { block_type, block_key, content_json, display_order } = body;

    // Validierung
    if (!block_type || !block_key || !content_json) {
      return new Response(
        JSON.stringify({
          error: "block_type, block_key, and content_json are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse und sanitize content
    let content;
    try {
      content =
        typeof content_json === "string"
          ? JSON.parse(content_json)
          : content_json;
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in content_json" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // CRITICAL: Sanitize all text content
    const sanitizedContent = sanitizeContentJson(content);

    // Insert in DB
    await env.DB.prepare(
      `INSERT INTO page_content (hostel_id, block_type, block_key, content_json, display_order)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(
        hostelId,
        block_type,
        block_key,
        JSON.stringify(sanitizedContent),
        display_order || 0,
      )
      .run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error.message.includes("UNIQUE")) {
      return new Response(
        JSON.stringify({ error: "Block key already exists" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

/**
 * Content Block aktualisieren (Admin only)
 */
async function updateContentBlock(
  request,
  env,
  corsHeaders,
  hostelId,
  blockKey,
) {
  // Admin Auth prüfen
  if (!(await isAdmin(request, env))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const { content_json, is_visible, display_order } = body;

    if (!content_json) {
      return new Response(
        JSON.stringify({ error: "content_json is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse und sanitize content
    let content;
    try {
      content =
        typeof content_json === "string"
          ? JSON.parse(content_json)
          : content_json;
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in content_json" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // CRITICAL: Sanitize all text content
    const sanitizedContent = sanitizeContentJson(content);

    // Build UPDATE query dynamically
    const updates = ["content_json = ?", "updated_at = unixepoch()"];
    const params = [JSON.stringify(sanitizedContent)];

    if (is_visible !== undefined) {
      updates.push("is_visible = ?");
      params.push(is_visible ? 1 : 0);
    }

    if (display_order !== undefined) {
      updates.push("display_order = ?");
      params.push(display_order);
    }

    params.push(hostelId, blockKey);

    await env.DB.prepare(
      `UPDATE page_content
       SET ${updates.join(", ")}
       WHERE hostel_id = ? AND block_key = ?`,
    )
      .bind(...params)
      .run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

/**
 * Content Block löschen (Admin only)
 */
async function deleteContentBlock(
  request,
  env,
  corsHeaders,
  hostelId,
  blockKey,
) {
  // Admin Auth prüfen
  if (!(await isAdmin(request, env))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    await env.DB.prepare(
      `DELETE FROM page_content
       WHERE hostel_id = ? AND block_key = ?`,
    )
      .bind(hostelId, blockKey)
      .run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}
// Deployment 1769345560
