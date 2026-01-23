/**
 * Cloudflare Worker - Energy Kiosk API
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
