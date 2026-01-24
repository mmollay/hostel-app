# 📋 Hostel-App Kanban Board

> Letzte Aktualisierung: 2026-01-25 00:30

---

## 🔥 In Arbeit

| Task | Beschreibung | Begonnen |
|------|--------------|----------|
| - | - | - |

---

## ⏳ Geplant (Backlog)

| Task | Beschreibung | Priorität |
|------|--------------|-----------|
| Geocoding Fix | Google Maps API Key einrichten (Console) | Hoch |
| Annehmlichkeiten hinzufügen | Admin kann Amenities verwalten | Mittel |
| Energie-Charts | Verbrauchshistorie visualisieren | Mittel |
| PWA Optimierung | Offline-Modus, App-Icon | Niedrig |
| Gäste-Benachrichtigungen | Push/Email bei Check-in | Niedrig |

---

## ✅ Erledigt

| Task | Beschreibung | Datum |
|------|--------------|-------|
| i18n für Inline Editor | DE/EN Content separat editierbar | 25.01.2026 |
| Energy Save 500 Fix | try-catch Error-Handling hinzugefügt | 25.01.2026 |
| CDN Cache Fix | Service Worker v13 (Cache-Bust) | 25.01.2026 |
| Inline Editor CSS | inline-editor.css zur Cache-Liste | 25.01.2026 |
| v0.5.0 Release | Inline Editor Grundgerüst | 24.01.2026 |
| Admin Settings Fix | 500 Error beim Speichern behoben | 24.01.2026 |
| Sticky Save Button | Button immer sichtbar beim Scrollen | 24.01.2026 |
| Hostels → Apartments Migration | Datenbank-Schema vereinfacht | 24.01.2026 |
| Custom Domain | www.gastauferden.at eingerichtet | 24.01.2026 |
| Neue Admin-Felder | Website, Tagline, HostName editierbar | 24.01.2026 |
| Frontend i18n | Header zeigt Daten aus DB | 24.01.2026 |

---

## 🐛 Bekannte Bugs

| Bug | Beschreibung | Status |
|-----|--------------|--------|
| Geocoding REQUEST_DENIED | Google Maps API Key braucht Geocoding API Aktivierung in Google Cloud Console | Offen (extern) |

---

## 💡 Ideen (Someday/Maybe)

- [ ] Gäste-Bewertungen
- [ ] Buchungskalender-Integration
- [ ] QR-Code für Check-in
- [ ] Automatische Rechnung/PDF
- [ ] Smart Home Integration (Licht, Heizung)
- [ ] Wetter-Widget auf Startseite

---

## 📊 Version History

| Version | Datum | Highlights |
|---------|-------|------------|
| v0.5.1 | 25.01.2026 | i18n Inline Editor, Energy Save Fix, SW v13 |
| v0.5.0 | 24.01.2026 | Inline Editor |
| v0.4.0 | 24.01.2026 | Admin Settings, Sticky Button |
| v0.3.0 | - | i18n, Multi-Language |
| v0.2.0 | - | Energie-Dashboard |
| v0.1.0 | - | Initial Release |

---

## 📝 Notes

### Geocoding Problem (25.01.2026)
Der Google Maps API Key `AIzaSyD96KZTjSABxmBHZGwmSLZdJI94Za0lHtA` existiert in wrangler.toml, aber die Geocoding API ist wahrscheinlich nicht aktiviert. Lösung:
1. Google Cloud Console → APIs & Services → Library
2. "Geocoding API" suchen und aktivieren
3. Evtl. Billing aktivieren (falls noch nicht)
4. API Key Restrictions prüfen (HTTP Referrer)
