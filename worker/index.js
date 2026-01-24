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
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
      if (path === "/login" && request.method === "POST") {
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

      // DELETE /guests/:id - Gast löschen (Admin only)
      if (path.startsWith("/guests/") && request.method === "DELETE") {
        const id = path.split("/")[2];
        return await deleteGuest(request, env, corsHeaders, id);
      }

      // GET / - Shelly Daten + Einstellungen
      if (path === "/" && request.method === "GET") {
        return await getShellyData(env, corsHeaders);
      }

      return new Response("Not found", { status: 404, headers: corsHeaders });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
  const { name, username, password, checkIn, checkOut } = body;

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
    createdAt: new Date().toISOString(),
  };

  guests.push(guest);
  await env.SETTINGS.put("guests", JSON.stringify(guests));

  return new Response(JSON.stringify({ success: true, guest }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
