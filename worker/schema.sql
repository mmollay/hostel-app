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

-- ============================================
-- APARTMENTS (Multi-Apartment Support)
-- ============================================
CREATE TABLE IF NOT EXISTS apartments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  location TEXT,
  settings_json TEXT,  -- JSON mit apartment-spezifischen Einstellungen
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Index für schnelle Slug-Abfragen
CREATE INDEX IF NOT EXISTS idx_apartments_slug ON apartments(slug);

-- Default Apartment anlegen (Hollenthon)
INSERT OR IGNORE INTO apartments (id, slug, name, location, settings_json)
VALUES (
  1,
  'hollenthon',
  'Gast auf Erden',
  'Ausstraße 33, 2812 Hollenthon',
  '{"phone": "+43 650 25 26 26 26", "email": "martin@ssi.at", "checkInTime": "15:00", "checkOutTime": "11:00", "formalAddress": "du", "iban": "AT53 3293 7000 0060 8745", "bic": "RLNWATWWWRN", "accountHolder": "KAD", "pricePerKwh": 0.29, "co2PerKwh": 0.2}'
);

-- ============================================
-- PAGE CONTENT (Inline Editor)
-- ============================================
CREATE TABLE IF NOT EXISTS page_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hostel_id TEXT NOT NULL,
  block_type TEXT NOT NULL,              -- 'text', 'hero', 'card', 'image', 'projects', 'amenities', 'custom'
  block_key TEXT NOT NULL,               -- Eindeutiger Identifier z.B. 'hero-welcome', 'card-energy'
  content_json TEXT NOT NULL,            -- JSON mit strukturiertem Content
  display_order INTEGER DEFAULT 0,       -- Sortierung
  is_visible INTEGER DEFAULT 1,          -- Anzeigen/Verstecken
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE CASCADE,
  UNIQUE(hostel_id, block_key)
);

-- Indizes für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_page_content_hostel ON page_content(hostel_id);
CREATE INDEX IF NOT EXISTS idx_page_content_order ON page_content(hostel_id, display_order);

-- Default Content Blocks (optional - hybrid rendering ermöglicht inkrementelle Migration)
INSERT OR IGNORE INTO page_content (hostel_id, block_type, block_key, content_json, display_order) VALUES
  ('hollenthon', 'text', 'welcome-main', '{"title": "Herzlich Willkommen!", "content": "An diesem magischen Ort, wo Wald und Himmel sich berühren, laden wir dich ein, Ruhe zu finden und bei dir anzukommen. Nimm dir Zeit zum Sein."}', 1),
  ('hollenthon', 'text', 'text-about', '{"title": "Über diesen Ort", "subtitle": "Wo Magie und Natur sich vereinen", "content": "Hier, am Rand des Waldes, hat sich ein besonderer Platz entfaltet – ein Ort zum Innehalten, zum Auftanken und zum Wiederfinden.", "icon": "trees"}', 2),
  ('hollenthon', 'text', 'projects-coming-soon', '{"title": "In Entstehung", "subtitle": "Zauberhafte Projekte erwachen zum Leben", "content": "Tiny Haus mit Höhle, Sauna, Hot Tub und Lebenstraining", "icon": "construction"}', 3);
