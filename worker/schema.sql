-- ============================================
-- HOSTEL-APP - D1 Database Schema
-- ============================================
-- Based on apartments table (hostels table removed)

-- ============================================
-- APARTMENTS (Main entity)
-- ============================================
CREATE TABLE IF NOT EXISTS apartments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  location TEXT,
  settings_json TEXT,  -- JSON mit allen Einstellungen
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_apartments_slug ON apartments(slug);

-- Default Apartment
INSERT OR IGNORE INTO apartments (id, slug, name, location, settings_json)
VALUES (
  1,
  'hollenthon',
  'Gast auf Erden',
  'Auerstraße 35, 2812 Hollenthon',
  '{"phone": "06502526266", "email": "office@ssi.at", "checkInTime": "15:00", "checkOutTime": "11:00", "formalAddress": "du", "iban": "AT53 3293 7000 0060 8745", "bic": "RLNWATWWWRN", "accountHolder": "KAD", "pricePerKwh": 0.29, "co2PerKwh": 0.2, "hostName": "Martin Mollay", "website": "gastauferden.at", "tagline": "Ein magischer Ort zum Sein", "tagline_en": "A magical place to be"}'
);

-- ============================================
-- ENERGIE-DATEN
-- ============================================
CREATE TABLE IF NOT EXISTS energy_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hostel_id TEXT NOT NULL,  -- References apartment slug
  date TEXT NOT NULL,  -- YYYY-MM-DD
  energy_kwh REAL DEFAULT 0,
  cost REAL DEFAULT 0,
  peak_power REAL DEFAULT 0,
  shelly_total_start REAL,
  updated_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(hostel_id, date)
);

CREATE INDEX IF NOT EXISTS idx_energy_hostel_date ON energy_data(hostel_id, date DESC);

-- ============================================
-- GÄSTE
-- ============================================
CREATE TABLE IF NOT EXISTS guests (
  id TEXT PRIMARY KEY,
  hostel_id TEXT NOT NULL,  -- References apartment slug
  name TEXT NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  check_in TEXT NOT NULL,
  check_out TEXT NOT NULL,
  number_of_persons INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(hostel_id, username)
);

CREATE INDEX IF NOT EXISTS idx_guest_username ON guests(hostel_id, username);

-- ============================================
-- ANNEHMLICHKEITEN (Amenities)
-- ============================================
CREATE TABLE IF NOT EXISTS amenities (
  id TEXT PRIMARY KEY,
  hostel_id TEXT NOT NULL,  -- References apartment slug
  icon TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  title_i18n TEXT,  -- JSON: {"de": "...", "en": "..."}
  description_i18n TEXT,  -- JSON: {"de": "...", "en": "..."}
  is_visible INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_amenities_hostel ON amenities(hostel_id, display_order);

-- ============================================
-- PAGE CONTENT (Inline Editor)
-- ============================================
CREATE TABLE IF NOT EXISTS page_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hostel_id TEXT NOT NULL,  -- References apartment slug
  block_type TEXT NOT NULL,
  block_key TEXT NOT NULL,
  content_json TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_visible INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(hostel_id, block_key)
);

CREATE INDEX IF NOT EXISTS idx_page_content_hostel ON page_content(hostel_id);
CREATE INDEX IF NOT EXISTS idx_page_content_order ON page_content(hostel_id, display_order);
