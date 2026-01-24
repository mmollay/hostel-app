-- ============================================
-- HOSTEL-APP - D1 Database Schema
-- ============================================
-- Multi-Tenant ready für mehrere Hostels

-- Hostels (Mandanten)
CREATE TABLE IF NOT EXISTS hostels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  settings_json TEXT,  -- JSON mit hostel-spezifischen Einstellungen
  created_at INTEGER DEFAULT (unixepoch())
);

-- Energie-Daten pro Hostel & Tag
CREATE TABLE IF NOT EXISTS energy_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hostel_id TEXT NOT NULL,
  date TEXT NOT NULL,  -- YYYY-MM-DD
  energy_kwh REAL DEFAULT 0,
  cost REAL DEFAULT 0,
  peak_power REAL DEFAULT 0,
  shelly_total_start REAL,  -- Shelly-Zählerstand am Tagesbeginn
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE CASCADE,
  UNIQUE(hostel_id, date)
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_energy_hostel_date ON energy_data(hostel_id, date DESC);

-- Gäste pro Hostel
CREATE TABLE IF NOT EXISTS guests (
  id TEXT PRIMARY KEY,
  hostel_id TEXT NOT NULL,
  name TEXT NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  check_in TEXT NOT NULL,  -- YYYY-MM-DD
  check_out TEXT NOT NULL,  -- YYYY-MM-DD
  number_of_persons INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE CASCADE,
  UNIQUE(hostel_id, username)
);

-- Index für Guest-Login
CREATE INDEX IF NOT EXISTS idx_guest_username ON guests(hostel_id, username);

-- Annehmlichkeiten (Amenities) pro Hostel
CREATE TABLE IF NOT EXISTS amenities (
  id TEXT PRIMARY KEY,
  hostel_id TEXT NOT NULL,
  icon TEXT NOT NULL,  -- Lucide icon name
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  is_visible INTEGER DEFAULT 1,  -- 1 = sichtbar, 0 = ausgeblendet
  display_order INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE CASCADE
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_amenities_hostel ON amenities(hostel_id, display_order);

-- Default Hostel anlegen (Hollenthon)
INSERT OR IGNORE INTO hostels (id, name, location, settings_json)
VALUES (
  'hollenthon',
  'Hostel Hollenthon',
  'Hollenthon am Waldrand',
  '{"pricePerKwh": 0.29, "currency": "€", "co2PerKwh": 0.2}'
);

-- Default Annehmlichkeiten für Hollenthon
INSERT OR IGNORE INTO amenities (id, hostel_id, icon, title, description, is_visible, display_order) VALUES
  ('amen_1', 'hollenthon', 'chef-hat', 'Voll ausgestattete Küche', 'Herd, Ofen, Kühlschrank', 1, 1),
  ('amen_2', 'hollenthon', 'flame', 'Kamin', 'Pellets & Holz vorhanden', 1, 2),
  ('amen_3', 'hollenthon', 'trees', 'Garten mit Feuerstelle', 'Gartenmöbel & Hängematte', 1, 3),
  ('amen_4', 'hollenthon', 'utensils', 'Grill & Außenküche', 'Essbereich im Freien', 1, 4),
  ('amen_5', 'hollenthon', 'washing-machine', 'Waschmaschine', 'In der Waschküche', 1, 5),
  ('amen_6', 'hollenthon', 'wifi', 'Kostenloses WLAN', 'Highspeed-Internet', 1, 6),
  ('amen_7', 'hollenthon', 'bed-double', 'Komfortable Betten', 'Hochwertige Matratzen', 1, 7),
  ('amen_8', 'hollenthon', 'bath', 'Badezimmer', 'Mit Dusche & WC', 1, 8),
  ('amen_9', 'hollenthon', 'car', 'Parkplatz', 'Kostenlose Parkplätze', 1, 9),
  ('amen_10', 'hollenthon', 'coffee', 'Kaffee & Tee', 'Zur freien Verfügung', 1, 10),
  ('amen_11', 'hollenthon', 'tv', 'TV & Streaming', 'Netflix, YouTube, etc.', 1, 11),
  ('amen_12', 'hollenthon', 'book', 'Bücher & Spiele', 'Kleine Bibliothek', 1, 12);
