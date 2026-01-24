-- ============================================
-- Migration: Add hostName, website, tagline to apartment settings
-- ============================================

-- Update settings_json for hollenthon apartment
UPDATE apartments 
SET settings_json = json_set(
  json_set(
    json_set(settings_json, 
      '$.hostName', 'Martin Mollay'),
    '$.website', 'gastauferden.at'),
  '$.tagline', 'Ein magischer Ort zum Sein'
)
WHERE slug = 'hollenthon';

-- Also add tagline_en for English
UPDATE apartments 
SET settings_json = json_set(settings_json, '$.tagline_en', 'A magical place to be')
WHERE slug = 'hollenthon';
