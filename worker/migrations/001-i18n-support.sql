-- ============================================
-- Migration: i18n Support für Amenities
-- ============================================

-- 1. Neue i18n Spalten hinzufügen
ALTER TABLE amenities ADD COLUMN title_i18n TEXT;
ALTER TABLE amenities ADD COLUMN description_i18n TEXT;

-- 2. Bestehende deutsche Texte migrieren
UPDATE amenities SET 
  title_i18n = json_object('de', title, 'en', ''),
  description_i18n = json_object('de', description, 'en', '');

-- 3. Englische Übersetzungen einfügen
UPDATE amenities SET title_i18n = json_set(title_i18n, '$.en', 'Fully equipped kitchen'), description_i18n = json_set(description_i18n, '$.en', 'Stove, oven, fridge') WHERE id = 'amen_1';
UPDATE amenities SET title_i18n = json_set(title_i18n, '$.en', 'Fireplace'), description_i18n = json_set(description_i18n, '$.en', 'Pellets & wood available') WHERE id = 'amen_2';
UPDATE amenities SET title_i18n = json_set(title_i18n, '$.en', 'Garden with fire pit'), description_i18n = json_set(description_i18n, '$.en', 'Garden furniture & hammock') WHERE id = 'amen_3';
UPDATE amenities SET title_i18n = json_set(title_i18n, '$.en', 'BBQ & outdoor kitchen'), description_i18n = json_set(description_i18n, '$.en', 'Outdoor dining area') WHERE id = 'amen_4';
UPDATE amenities SET title_i18n = json_set(title_i18n, '$.en', 'Washing machine'), description_i18n = json_set(description_i18n, '$.en', 'In the laundry room') WHERE id = 'amen_5';
UPDATE amenities SET title_i18n = json_set(title_i18n, '$.en', 'Free WiFi'), description_i18n = json_set(description_i18n, '$.en', 'High-speed internet') WHERE id = 'amen_6';
UPDATE amenities SET title_i18n = json_set(title_i18n, '$.en', 'Comfortable beds'), description_i18n = json_set(description_i18n, '$.en', 'Premium mattresses') WHERE id = 'amen_7';
UPDATE amenities SET title_i18n = json_set(title_i18n, '$.en', 'Bathroom'), description_i18n = json_set(description_i18n, '$.en', 'With shower & toilet') WHERE id = 'amen_8';
UPDATE amenities SET title_i18n = json_set(title_i18n, '$.en', 'Parking'), description_i18n = json_set(description_i18n, '$.en', 'Free parking spaces') WHERE id = 'amen_9';
UPDATE amenities SET title_i18n = json_set(title_i18n, '$.en', 'Coffee & tea'), description_i18n = json_set(description_i18n, '$.en', 'Complimentary') WHERE id = 'amen_10';
UPDATE amenities SET title_i18n = json_set(title_i18n, '$.en', 'TV & streaming'), description_i18n = json_set(description_i18n, '$.en', 'Netflix, YouTube, etc.') WHERE id = 'amen_11';
UPDATE amenities SET title_i18n = json_set(title_i18n, '$.en', 'Books & games'), description_i18n = json_set(description_i18n, '$.en', 'Small library') WHERE id = 'amen_12';
