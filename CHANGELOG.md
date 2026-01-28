# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.12.0] - 2025-02-01

### Added
- **Admin-Panel Mobile Bottom Navigation**: Neue Tab-Bar für Mobile mit 5 Tabs (Dashboard, Gäste, Apartments, Features, Settings)
- Gleiche Navigation wie Hauptseite, nur für Admin-Bereich angepasst

### Changed
- **Admin Header Mobile optimiert**: Kompakterer Header mit Icon-Buttons statt Text-Buttons auf Mobile
- **Durchschnittswert-Anzeige rechtsbündig**: Energy-Info-Bar ist jetzt rechtsbündig für dezentere Darstellung
- Desktop Tab-Navigation wird auf Mobile durch Bottom-Nav ersetzt

### Fixed
- Buttons im Admin-Header haben nun konsistenten Abstand
- Mobile Admin-Bereich hat nun gleiche UX wie die Hauptseite

## [0.8.0] - 2026-01-27

### Added
- Mobile Footer Navigation fixiert am unteren Rand
- "Angemeldet bleiben" Checkbox für Gast-Login
- Basic Auth Middleware für develop.gastauferden.at

### Changed
- Mobile Header Optimierung: Kompakter App-Style
- Footer-Navigation bleibt fixiert beim Scrollen
- Performance-Verbesserungen

## [0.7.0] - 2026-01-26

### Added
- Mobile UI Improvements
- Kompaktere Darstellung auf Smartphones
- Deploy Scripts verbessert

### Fixed
- Dashboard Pfad korrigiert (dashboard/ statt dist/)

## [0.6.0] - 2026-01-26

### Changed
- Admin UI komplett überarbeitet
- Performance-Optimierungen: Bilder, API-Calls, Caching
- Skeleton Loading für bessere UX
- Empfehlungen: Kategorie-Persistenz, Heurige-Kategorie

## [0.5.5] - 2026-01-25

### Added
- Vollständige Mehrsprachigkeit (i18n) für alle Komponenten

## [0.5.4] - 2026-01-25

### Fixed
- Geocoding Warnungen unterdrückt

## [0.5.3] - 2026-01-25

### Fixed
- Z-index für klickbare Quick-Nav Buttons

## [0.5.2] - 2026-01-25

### Fixed
- Header scrollt jetzt normal mit (kein Flimmern mehr)
- Quick-Nav Buttons immer sichtbar
- Welcome-Card z-index korrigiert
- Energy API: FOREIGN KEY Constraint korrigiert
- Worker: Tabellen-Referenz korrigiert

### Changed
- Collapsed Header-Funktion entfernt

## [0.4.0] - 2026-01-24

### Added
- **Internationalization (i18n)**: Full bilingual support (German/English)
  - German default at `/`
  - English version at `/en/`
  - Language switcher with flag buttons (🇩🇪/🇬🇧) in header
  - JSON translation files
  - Locale-aware date/time formatting
