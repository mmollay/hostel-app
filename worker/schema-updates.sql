-- ============================================
-- HOSTEL-APP - Schema Updates für Inline-Editor
-- ============================================

-- 1. KRITISCH: Apartments Table hinzufügen (fehlte bisher)
-- Diese Tabelle wird vom Worker bereits verwendet, existiert aber nicht im Schema!
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

-- 2. Page Content Table für Inline-Editing
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
-- Diese können später über die UI bearbeitet werden
INSERT OR IGNORE INTO page_content (hostel_id, block_type, block_key, content_json, display_order) VALUES
  ('hollenthon', 'hero', 'hero-main', '{"title": "gastauferden.at", "subtitle": "Ein magischer Ort zum Sein • Hollenthon"}', 1),
  ('hollenthon', 'text', 'text-about', '{"title": "Über diesen Ort", "subtitle": "Wo Magie und Natur sich vereinen", "content": "Hier, am Rand des Waldes, hat sich ein besonderer Platz entfaltet – ein Ort zum Innehalten, zum Auftanken und zum Wiederfinden.", "icon": "trees"}', 2);
