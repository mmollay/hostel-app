# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-01-24

### Added
- **Guest Login System**: Username/password authentication with check-in/out date validation
- **Personalized Greetings**: Time-based greetings ("Guten Morgen", "Guten Tag", etc.) with guest name
- **Weather Widget**: Real-time weather for Hollenthon using Open-Meteo API
  - Temperature, humidity, wind speed
  - Updates every 10 minutes
- **WiFi QR Code**: Scannable QR code for automatic WiFi connection
- **Local Recommendations**: Hiking trails, restaurants, shopping, wellness, sights
- **Night Mode**: Toggle dark/light theme with saved preference
- **Easter Eggs**:
  - Konami Code (↑↑↓↓←→←→BA) triggers rainbow animation
  - 23:23 secret bedtime message
- **Admin Dashboard**: `/admin.html` for guest management (CRUD operations)
- **Energy Tracking**: Per-guest stay monitoring (visible only to logged-in guests)

### Changed
- **BREAKING**: Replaced admin login with guest login system
- **UI Redesign**: DM Sans font instead of Cormorant serif
- **Background**: Abstract artistic background image
- **Logo**: New minimalist logo with heart symbol
- Guest-only features now require login (energy, weather, WiFi, recommendations)

### Fixed
- **Critical**: Energy calculation was 1000x too high (Shelly returns Wh, not kWh)
- **Security**: Removed innerHTML usage to prevent XSS attacks
- Auto-reset corrupted localStorage data from previous bug

### Technical
- Cloudflare Worker API endpoints for guest authentication
- KV storage for guest data
- Date-based access control (guest can only login during check-in period)
- Auto-generated 8-character passwords for new guests
- Responsive design for mobile and desktop

## [0.1.0] - 2026-01-23

### Added
- Initial dashboard with energy monitoring
- Shelly Pro 3EM integration
- Contact information
- Amenities list
- Basic admin settings

### Changed
- Migrated from "Energy Kiosk" to "Hostel-App"
- Updated branding and design

### Fixed
- Various UI improvements
