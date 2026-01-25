/**
 * Admin UI Module v1.0.0
 * Handles admin authentication and settings on main page
 */

const AdminUI = {
  // State
  isAdmin: false,
  adminToken: null,
  settings: null,

  /**
   * Initialize Admin UI
   */
  init() {
    this.checkAdminSession();
    this.createAdminElements();
    this.bindEvents();
    
    if (this.isAdmin) {
      this.showAdminUI();
      this.loadSettings();
    }
    
    console.log('[AdminUI] Initialized, isAdmin:', this.isAdmin);
  },

  /**
   * Check if admin is logged in
   */
  checkAdminSession() {
    this.adminToken = localStorage.getItem('hostel_admin_token') || 
                      sessionStorage.getItem('hostel_admin_token');
    this.isAdmin = !!this.adminToken;
  },

  /**
   * Create admin UI elements
   */
  createAdminElements() {
    // Settings Button (in header, only visible for admin)
    this.createSettingsButton();
    
    // Admin Login Modal (hidden link in footer)
    this.createAdminLoginModal();
    
    // Settings Modal
    this.createSettingsModal();
    
    // Admin Indicator Bar
    this.createAdminIndicator();
  },

  /**
   * Create Settings Button
   */
  createSettingsButton() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;

    const btn = document.createElement('button');
    btn.id = 'adminSettingsBtn';
    btn.className = 'settings-btn';
    btn.title = 'Admin-Einstellungen';
    btn.style.display = 'none'; // Hidden by default
    btn.innerHTML = `
      <i data-lucide="settings"></i>
      <span>Settings</span>
    `;
    
    // Insert at beginning
    headerActions.insertBefore(btn, headerActions.firstChild);
    
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  },

  /**
   * Create Admin Login Modal
   */
  createAdminLoginModal() {
    const modal = document.createElement('div');
    modal.id = 'adminLoginModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal admin-modal">
        <div class="modal-header">
          <h2><i data-lucide="shield" style="width: 24px; height: 24px; margin-right: 8px;"></i>Admin-Login</h2>
          <button class="modal-close" id="closeAdminLoginBtn">&times;</button>
        </div>
        <form id="adminLoginForm">
          <div class="form-group">
            <label>Admin-Passwort</label>
            <input type="password" id="adminPassword" placeholder="••••••••" autocomplete="current-password">
          </div>
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" id="adminRemember"> 
              <span>Eingeloggt bleiben</span>
            </label>
          </div>
          <button type="submit" class="btn btn-primary">
            <i data-lucide="log-in" style="width: 18px; height: 18px;"></i>
            Anmelden
          </button>
          <div class="error-text" id="adminLoginError"></div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
  },

  /**
   * Create Settings Modal
   */
  createSettingsModal() {
    const modal = document.createElement('div');
    modal.id = 'settingsModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal settings-modal">
        <div class="modal-header">
          <h2><i data-lucide="settings" style="width: 24px; height: 24px; margin-right: 8px;"></i>Einstellungen</h2>
          <button class="modal-close" id="closeSettingsBtn">&times;</button>
        </div>
        
        <div class="settings-tabs">
          <button class="settings-tab active" data-tab="content">
            <i data-lucide="file-text"></i> Inhalte
          </button>
          <button class="settings-tab" data-tab="wifi">
            <i data-lucide="wifi"></i> WLAN
          </button>
          <button class="settings-tab" data-tab="design">
            <i data-lucide="palette"></i> Design
          </button>
          <button class="settings-tab" data-tab="api">
            <i data-lucide="key"></i> API Keys
          </button>
          <button class="settings-tab" data-tab="account">
            <i data-lucide="user"></i> Account
          </button>
        </div>
        
        <div class="settings-content">
          <!-- Content Tab -->
          <div class="settings-panel active" id="panel-content">
            <h3>Hostel-Informationen</h3>
            <div class="form-group">
              <label>Hostel-Name</label>
              <input type="text" id="settingHostelName" placeholder="z.B. Gast auf Erden">
            </div>
            <div class="form-group">
              <label>Tagline / Untertitel</label>
              <input type="text" id="settingTagline" placeholder="z.B. Ein magischer Ort zum Sein">
            </div>
            <div class="form-group">
              <label>Gastgeber-Name</label>
              <input type="text" id="settingHostName" placeholder="z.B. Martin Mollay">
            </div>
            <div class="form-group">
              <label>Telefon</label>
              <input type="tel" id="settingPhone" placeholder="+43 650 ...">
            </div>
            <div class="form-group">
              <label>E-Mail</label>
              <input type="email" id="settingEmail" placeholder="email@example.com">
            </div>
            <div class="form-group">
              <label>Adresse</label>
              <input type="text" id="settingAddress" placeholder="Straße Nr, PLZ Ort">
            </div>
            
            <h3 style="margin-top: 24px;">Bankdaten</h3>
            <div class="form-group">
              <label>IBAN</label>
              <input type="text" id="settingIban" placeholder="AT00 0000 0000 0000 0000">
            </div>
            <div class="form-group">
              <label>BIC</label>
              <input type="text" id="settingBic" placeholder="XXXXXXXX">
            </div>
            <div class="form-group">
              <label>Kontoinhaber</label>
              <input type="text" id="settingAccountHolder" placeholder="Name">
            </div>
          </div>
          
          <!-- WiFi Tab -->
          <div class="settings-panel" id="panel-wifi">
            <h3>WLAN-Netzwerke</h3>
            <div class="wifi-network-card">
              <h4>Netzwerk 1</h4>
              <div class="form-group">
                <label>SSID (Netzwerkname)</label>
                <input type="text" id="settingWifi1Ssid" placeholder="z.B. Hostel Power">
              </div>
              <div class="form-group">
                <label>Passwort</label>
                <input type="text" id="settingWifi1Password" placeholder="WLAN-Passwort">
              </div>
            </div>
            
            <div class="wifi-network-card">
              <h4>Netzwerk 2 (optional)</h4>
              <div class="form-group">
                <label>SSID (Netzwerkname)</label>
                <input type="text" id="settingWifi2Ssid" placeholder="z.B. Hostel">
              </div>
              <div class="form-group">
                <label>Passwort</label>
                <input type="text" id="settingWifi2Password" placeholder="WLAN-Passwort">
              </div>
            </div>
            
            <p class="settings-hint">
              <i data-lucide="info" style="width: 14px; height: 14px;"></i>
              Die QR-Codes werden automatisch aktualisiert.
            </p>
          </div>
          
          <!-- Design Tab -->
          <div class="settings-panel" id="panel-design">
            <h3>Erscheinungsbild</h3>
            <div class="form-group">
              <label>Primärfarbe (Sage)</label>
              <div class="color-picker-group">
                <input type="color" id="settingColorSage" value="#9CAF88">
                <input type="text" id="settingColorSageHex" value="#9CAF88" placeholder="#9CAF88">
              </div>
            </div>
            <div class="form-group">
              <label>Akzentfarbe (Forest)</label>
              <div class="color-picker-group">
                <input type="color" id="settingColorForest" value="#2D4A3E">
                <input type="text" id="settingColorForestHex" value="#2D4A3E" placeholder="#2D4A3E">
              </div>
            </div>
            <div class="form-group">
              <label>Logo-URL</label>
              <input type="url" id="settingLogoUrl" placeholder="https://...">
            </div>
            <div class="form-group">
              <label>Header-Bild URL</label>
              <input type="url" id="settingHeaderBgUrl" placeholder="https://...">
            </div>
            
            <h3 style="margin-top: 24px;">Sprache</h3>
            <div class="form-group">
              <label>Standard-Sprache</label>
              <select id="settingDefaultLang">
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
            </div>
            <div class="form-group">
              <label>Anrede-Form</label>
              <select id="settingFormalAddress">
                <option value="du">Du-Form (informell)</option>
                <option value="sie">Sie-Form (formell)</option>
              </select>
            </div>
          </div>
          
          <!-- API Keys Tab -->
          <div class="settings-panel" id="panel-api">
            <h3>API-Konfiguration</h3>
            <p class="settings-hint warning">
              <i data-lucide="alert-triangle" style="width: 14px; height: 14px;"></i>
              API-Keys sind sensible Daten. Teile sie nicht!
            </p>
            
            <div class="form-group">
              <label>Google Maps API Key</label>
              <input type="password" id="settingGoogleMapsKey" placeholder="AIza...">
              <span class="input-hint">Für Empfehlungen in der Umgebung</span>
            </div>
            <div class="form-group">
              <label>OpenWeatherMap API Key</label>
              <input type="password" id="settingOpenWeatherKey" placeholder="...">
              <span class="input-hint">Für Wettervorhersage</span>
            </div>
            <div class="form-group">
              <label>Shelly Cloud Auth Key</label>
              <input type="password" id="settingShellyKey" placeholder="...">
              <span class="input-hint">Für Energiemonitoring</span>
            </div>
            <div class="form-group">
              <label>Shelly Device ID</label>
              <input type="text" id="settingShellyDevice" placeholder="...">
            </div>
          </div>
          
          <!-- Account Tab -->
          <div class="settings-panel" id="panel-account">
            <h3>Admin-Account</h3>
            <div class="form-group">
              <label>Neues Passwort</label>
              <input type="password" id="settingNewPassword" placeholder="••••••••">
            </div>
            <div class="form-group">
              <label>Passwort bestätigen</label>
              <input type="password" id="settingConfirmPassword" placeholder="••••••••">
            </div>
            <button class="btn btn-secondary" id="changePasswordBtn" style="margin-top: 8px;">
              Passwort ändern
            </button>
            
            <h3 style="margin-top: 32px;">Daten</h3>
            <div class="settings-actions">
              <button class="btn btn-secondary" id="exportDataBtn">
                <i data-lucide="download" style="width: 16px; height: 16px;"></i>
                Daten exportieren
              </button>
              <button class="btn btn-secondary" id="importDataBtn">
                <i data-lucide="upload" style="width: 16px; height: 16px;"></i>
                Daten importieren
              </button>
            </div>
            
            <h3 style="margin-top: 32px;">Session</h3>
            <button class="btn btn-danger" id="adminLogoutBtn">
              <i data-lucide="log-out" style="width: 16px; height: 16px;"></i>
              Admin abmelden
            </button>
          </div>
        </div>
        
        <div class="settings-footer">
          <button class="btn btn-secondary" id="cancelSettingsBtn">Abbrechen</button>
          <button class="btn btn-primary" id="saveSettingsBtn">
            <i data-lucide="save" style="width: 16px; height: 16px;"></i>
            Speichern
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  },

  /**
   * Create Admin Indicator Bar
   */
  createAdminIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'adminIndicator';
    indicator.className = 'admin-indicator';
    indicator.style.display = 'none';
    indicator.innerHTML = `
      <div class="admin-indicator-content">
        <span class="admin-badge">
          <i data-lucide="shield-check" style="width: 14px; height: 14px;"></i>
          Admin-Modus
        </span>
        <span class="admin-hint">Klicke auf ✏️ markierte Elemente zum Bearbeiten</span>
        <button id="toggleEditModeBtn" class="btn-edit-mode">
          <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
          <span>Bearbeiten</span>
        </button>
      </div>
    `;
    
    document.body.insertBefore(indicator, document.body.firstChild);
  },

  /**
   * Bind all events
   */
  bindEvents() {
    // Settings button
    const settingsBtn = document.getElementById('adminSettingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.openSettings());
    }
    
    // Admin link in footer
    const adminLink = document.querySelector('a[href="/admin.html"]');
    if (adminLink) {
      adminLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.isAdmin) {
          this.openSettings();
        } else {
          this.openAdminLogin();
        }
      });
    }
    
    // Admin login modal
    const adminLoginModal = document.getElementById('adminLoginModal');
    const closeAdminLoginBtn = document.getElementById('closeAdminLoginBtn');
    const adminLoginForm = document.getElementById('adminLoginForm');
    
    if (closeAdminLoginBtn) {
      closeAdminLoginBtn.addEventListener('click', () => this.closeAdminLogin());
    }
    if (adminLoginModal) {
      adminLoginModal.addEventListener('click', (e) => {
        if (e.target === adminLoginModal) this.closeAdminLogin();
      });
    }
    if (adminLoginForm) {
      adminLoginForm.addEventListener('submit', (e) => this.handleAdminLogin(e));
    }
    
    // Settings modal
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    
    if (closeSettingsBtn) {
      closeSettingsBtn.addEventListener('click', () => this.closeSettings());
    }
    if (cancelSettingsBtn) {
      cancelSettingsBtn.addEventListener('click', () => this.closeSettings());
    }
    if (settingsModal) {
      settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) this.closeSettings();
      });
    }
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', () => this.saveSettings());
    }
    
    // Settings tabs
    document.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });
    
    // Admin logout
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    if (adminLogoutBtn) {
      adminLogoutBtn.addEventListener('click', () => this.handleAdminLogout());
    }
    
    // Edit mode toggle
    const toggleEditBtn = document.getElementById('toggleEditModeBtn');
    if (toggleEditBtn) {
      toggleEditBtn.addEventListener('click', () => this.toggleEditMode());
    }
    
    // Color pickers sync
    this.bindColorPickers();
    
    // Export/Import
    const exportBtn = document.getElementById('exportDataBtn');
    const importBtn = document.getElementById('importDataBtn');
    if (exportBtn) exportBtn.addEventListener('click', () => this.exportData());
    if (importBtn) importBtn.addEventListener('click', () => this.importData());
    
    // Change password
    const changePwBtn = document.getElementById('changePasswordBtn');
    if (changePwBtn) {
      changePwBtn.addEventListener('click', () => this.changePassword());
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Escape to close modals
      if (e.key === 'Escape') {
        this.closeSettings();
        this.closeAdminLogin();
      }
      // Ctrl+Shift+A for admin login
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        if (this.isAdmin) {
          this.openSettings();
        } else {
          this.openAdminLogin();
        }
      }
    });
  },

  /**
   * Bind color picker syncing
   */
  bindColorPickers() {
    const pairs = [
      ['settingColorSage', 'settingColorSageHex'],
      ['settingColorForest', 'settingColorForestHex']
    ];
    
    pairs.forEach(([colorId, hexId]) => {
      const colorInput = document.getElementById(colorId);
      const hexInput = document.getElementById(hexId);
      
      if (colorInput && hexInput) {
        colorInput.addEventListener('input', () => {
          hexInput.value = colorInput.value.toUpperCase();
        });
        hexInput.addEventListener('input', () => {
          if (/^#[0-9A-Fa-f]{6}$/.test(hexInput.value)) {
            colorInput.value = hexInput.value;
          }
        });
      }
    });
  },

  /**
   * Show Admin UI elements
   */
  showAdminUI() {
    const settingsBtn = document.getElementById('adminSettingsBtn');
    const indicator = document.getElementById('adminIndicator');
    
    if (settingsBtn) settingsBtn.style.display = 'flex';
    if (indicator) indicator.style.display = 'block';
    
    document.body.classList.add('admin-logged-in');
    
    // Initialize inline editor if available
    if (typeof InlineEditor !== 'undefined') {
      InlineEditor.init();
    }
    
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  },

  /**
   * Hide Admin UI elements
   */
  hideAdminUI() {
    const settingsBtn = document.getElementById('adminSettingsBtn');
    const indicator = document.getElementById('adminIndicator');
    
    if (settingsBtn) settingsBtn.style.display = 'none';
    if (indicator) indicator.style.display = 'none';
    
    document.body.classList.remove('admin-logged-in');
    document.body.classList.remove('inline-edit-mode');
  },

  /**
   * Open Admin Login Modal
   */
  openAdminLogin() {
    const modal = document.getElementById('adminLoginModal');
    const passwordInput = document.getElementById('adminPassword');
    const errorEl = document.getElementById('adminLoginError');
    
    if (modal) modal.classList.add('active');
    if (passwordInput) {
      passwordInput.value = '';
      passwordInput.focus();
    }
    if (errorEl) errorEl.style.display = 'none';
    
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  },

  /**
   * Close Admin Login Modal
   */
  closeAdminLogin() {
    const modal = document.getElementById('adminLoginModal');
    if (modal) modal.classList.remove('active');
  },

  /**
   * Handle Admin Login
   */
  async handleAdminLogin(e) {
    e.preventDefault();
    
    const password = document.getElementById('adminPassword').value;
    const remember = document.getElementById('adminRemember').checked;
    const errorEl = document.getElementById('adminLoginError');
    
    if (!password) {
      if (errorEl) {
        errorEl.textContent = 'Bitte Passwort eingeben';
        errorEl.style.display = 'block';
      }
      return;
    }
    
    try {
      const response = await fetch(`${CONFIG.API_PROXY_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.adminToken = result.token;
        this.isAdmin = true;
        
        if (remember) {
          localStorage.setItem('hostel_admin_token', result.token);
        } else {
          sessionStorage.setItem('hostel_admin_token', result.token);
        }
        
        this.closeAdminLogin();
        this.showAdminUI();
        this.loadSettings();
        this.showNotification('Admin-Login erfolgreich!', 'success');
      } else {
        if (errorEl) {
          errorEl.textContent = result.error || 'Falsches Passwort';
          errorEl.style.display = 'block';
        }
      }
    } catch (error) {
      console.error('[AdminUI] Login error:', error);
      if (errorEl) {
        errorEl.textContent = 'Verbindungsfehler';
        errorEl.style.display = 'block';
      }
    }
  },

  /**
   * Handle Admin Logout
   */
  handleAdminLogout() {
    localStorage.removeItem('hostel_admin_token');
    sessionStorage.removeItem('hostel_admin_token');
    
    this.adminToken = null;
    this.isAdmin = false;
    
    this.hideAdminUI();
    this.closeSettings();
    this.showNotification('Abgemeldet', 'info');
  },

  /**
   * Open Settings Modal
   */
  openSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.add('active');
    
    this.loadSettings();
    
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  },

  /**
   * Close Settings Modal
   */
  closeSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.remove('active');
  },

  /**
   * Switch settings tab
   */
  switchTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.settings-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    
    // Update panels
    document.querySelectorAll('.settings-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `panel-${tabId}`);
    });
  },

  /**
   * Load settings from API
   */
  async loadSettings() {
    if (!this.adminToken) return;
    
    try {
      const response = await fetch(`${CONFIG.API_PROXY_URL}/admin/settings`, {
        headers: {
          'Authorization': `Bearer ${this.adminToken}`
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.settings = result.settings;
        this.populateSettingsForm();
      }
    } catch (error) {
      console.error('[AdminUI] Failed to load settings:', error);
    }
  },

  /**
   * Populate settings form with loaded data
   */
  populateSettingsForm() {
    if (!this.settings) return;
    
    const s = this.settings;
    
    // Content
    this.setFieldValue('settingHostelName', s.hostelName);
    this.setFieldValue('settingTagline', s.tagline);
    this.setFieldValue('settingHostName', s.hostName);
    this.setFieldValue('settingPhone', s.phone);
    this.setFieldValue('settingEmail', s.email);
    this.setFieldValue('settingAddress', s.address);
    this.setFieldValue('settingIban', s.iban);
    this.setFieldValue('settingBic', s.bic);
    this.setFieldValue('settingAccountHolder', s.accountHolder);
    
    // WiFi
    this.setFieldValue('settingWifi1Ssid', s.wifi1Ssid);
    this.setFieldValue('settingWifi1Password', s.wifi1Password);
    this.setFieldValue('settingWifi2Ssid', s.wifi2Ssid);
    this.setFieldValue('settingWifi2Password', s.wifi2Password);
    
    // Design
    this.setFieldValue('settingColorSage', s.colorSage);
    this.setFieldValue('settingColorSageHex', s.colorSage);
    this.setFieldValue('settingColorForest', s.colorForest);
    this.setFieldValue('settingColorForestHex', s.colorForest);
    this.setFieldValue('settingLogoUrl', s.logoUrl);
    this.setFieldValue('settingHeaderBgUrl', s.headerBgUrl);
    this.setFieldValue('settingDefaultLang', s.defaultLang);
    this.setFieldValue('settingFormalAddress', s.formalAddress);
    
    // API Keys (masked)
    if (s.hasGoogleMapsKey) {
      document.getElementById('settingGoogleMapsKey').placeholder = '••••••••••••';
    }
    if (s.hasOpenWeatherKey) {
      document.getElementById('settingOpenWeatherKey').placeholder = '••••••••••••';
    }
    if (s.hasShellyKey) {
      document.getElementById('settingShellyKey').placeholder = '••••••••••••';
    }
    this.setFieldValue('settingShellyDevice', s.shellyDevice);
  },

  /**
   * Helper to set field value
   */
  setFieldValue(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (field && value !== undefined && value !== null) {
      field.value = value;
    }
  },

  /**
   * Save settings to API
   */
  async saveSettings() {
    if (!this.adminToken) return;
    
    const settings = {
      // Content
      hostelName: document.getElementById('settingHostelName')?.value,
      tagline: document.getElementById('settingTagline')?.value,
      hostName: document.getElementById('settingHostName')?.value,
      phone: document.getElementById('settingPhone')?.value,
      email: document.getElementById('settingEmail')?.value,
      address: document.getElementById('settingAddress')?.value,
      iban: document.getElementById('settingIban')?.value,
      bic: document.getElementById('settingBic')?.value,
      accountHolder: document.getElementById('settingAccountHolder')?.value,
      
      // WiFi
      wifi1Ssid: document.getElementById('settingWifi1Ssid')?.value,
      wifi1Password: document.getElementById('settingWifi1Password')?.value,
      wifi2Ssid: document.getElementById('settingWifi2Ssid')?.value,
      wifi2Password: document.getElementById('settingWifi2Password')?.value,
      
      // Design
      colorSage: document.getElementById('settingColorSage')?.value,
      colorForest: document.getElementById('settingColorForest')?.value,
      logoUrl: document.getElementById('settingLogoUrl')?.value,
      headerBgUrl: document.getElementById('settingHeaderBgUrl')?.value,
      defaultLang: document.getElementById('settingDefaultLang')?.value,
      formalAddress: document.getElementById('settingFormalAddress')?.value,
      
      // API Keys (only if changed)
      googleMapsKey: document.getElementById('settingGoogleMapsKey')?.value || undefined,
      openWeatherKey: document.getElementById('settingOpenWeatherKey')?.value || undefined,
      shellyKey: document.getElementById('settingShellyKey')?.value || undefined,
      shellyDevice: document.getElementById('settingShellyDevice')?.value,
    };
    
    // Remove empty API keys (don't overwrite existing)
    if (!settings.googleMapsKey) delete settings.googleMapsKey;
    if (!settings.openWeatherKey) delete settings.openWeatherKey;
    if (!settings.shellyKey) delete settings.shellyKey;
    
    try {
      const response = await fetch(`${CONFIG.API_PROXY_URL}/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.adminToken}`
        },
        body: JSON.stringify(settings)
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.settings = { ...this.settings, ...settings };
        this.closeSettings();
        this.showNotification('Einstellungen gespeichert!', 'success');
        
        // Apply changes to page
        this.applySettingsToPage();
      } else {
        this.showNotification(result.error || 'Fehler beim Speichern', 'error');
      }
    } catch (error) {
      console.error('[AdminUI] Save error:', error);
      this.showNotification('Verbindungsfehler', 'error');
    }
  },

  /**
   * Apply settings changes to the page
   */
  applySettingsToPage() {
    if (!this.settings) return;
    
    const s = this.settings;
    
    // Update contact info
    if (s.hostName) {
      const el = document.getElementById('hostelHost');
      if (el) el.textContent = s.hostName;
    }
    if (s.phone) {
      const el = document.getElementById('hostelPhoneDisplay');
      if (el) el.textContent = s.phone;
    }
    if (s.email) {
      const el = document.getElementById('hostelEmailDisplay');
      if (el) el.textContent = s.email;
    }
    if (s.address) {
      const el = document.getElementById('hostelAddressDisplay');
      if (el) el.textContent = s.address;
    }
    
    // Update bank details
    if (s.iban) {
      const el = document.getElementById('displayIban');
      if (el) el.textContent = s.iban;
    }
    if (s.bic) {
      const el = document.getElementById('displayBic');
      if (el) el.textContent = s.bic;
    }
    if (s.accountHolder) {
      const el = document.getElementById('displayAccountHolder');
      if (el) el.textContent = s.accountHolder;
    }
    
    // Update colors (CSS variables)
    if (s.colorSage) {
      document.documentElement.style.setProperty('--sage', s.colorSage);
    }
    if (s.colorForest) {
      document.documentElement.style.setProperty('--forest', s.colorForest);
    }
  },

  /**
   * Toggle edit mode
   */
  toggleEditMode() {
    const body = document.body;
    const btn = document.getElementById('toggleEditModeBtn');
    const isEditMode = body.classList.toggle('inline-edit-mode');
    
    if (btn) {
      const span = btn.querySelector('span');
      if (span) {
        span.textContent = isEditMode ? 'Vorschau' : 'Bearbeiten';
      }
      btn.classList.toggle('active', isEditMode);
    }
    
    // Trigger InlineEditor if available
    if (typeof InlineEditor !== 'undefined' && InlineEditor.toggleEditMode) {
      // Already toggled by class, just sync state
      InlineEditor.editMode = isEditMode;
      if (isEditMode) {
        InlineEditor.showEditableHints();
      } else {
        InlineEditor.hideEditableHints();
        InlineEditor.hideToolbar();
      }
    }
  },

  /**
   * Export data
   */
  async exportData() {
    try {
      const response = await fetch(`${CONFIG.API_PROXY_URL}/admin/export`, {
        headers: {
          'Authorization': `Bearer ${this.adminToken}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gastauferden-backup-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Export erfolgreich!', 'success');
      }
    } catch (error) {
      console.error('[AdminUI] Export error:', error);
      this.showNotification('Export fehlgeschlagen', 'error');
    }
  },

  /**
   * Import data
   */
  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        const response = await fetch(`${CONFIG.API_PROXY_URL}/admin/import`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.adminToken}`
          },
          body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
          this.showNotification('Import erfolgreich! Seite wird neu geladen...', 'success');
          setTimeout(() => location.reload(), 1500);
        } else {
          this.showNotification(result.error || 'Import fehlgeschlagen', 'error');
        }
      } catch (error) {
        console.error('[AdminUI] Import error:', error);
        this.showNotification('Ungültige Datei', 'error');
      }
    };
    
    input.click();
  },

  /**
   * Change password
   */
  async changePassword() {
    const newPassword = document.getElementById('settingNewPassword')?.value;
    const confirmPassword = document.getElementById('settingConfirmPassword')?.value;
    
    if (!newPassword || newPassword.length < 6) {
      this.showNotification('Passwort muss mindestens 6 Zeichen haben', 'error');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      this.showNotification('Passwörter stimmen nicht überein', 'error');
      return;
    }
    
    try {
      const response = await fetch(`${CONFIG.API_PROXY_URL}/admin/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.adminToken}`
        },
        body: JSON.stringify({ password: newPassword })
      });
      
      const result = await response.json();
      
      if (result.success) {
        document.getElementById('settingNewPassword').value = '';
        document.getElementById('settingConfirmPassword').value = '';
        this.showNotification('Passwort geändert!', 'success');
      } else {
        this.showNotification(result.error || 'Fehler', 'error');
      }
    } catch (error) {
      console.error('[AdminUI] Password change error:', error);
      this.showNotification('Verbindungsfehler', 'error');
    }
  },

  /**
   * Show notification toast
   */
  showNotification(message, type = 'info') {
    // Use existing toast function if available
    if (typeof showToast === 'function') {
      showToast(message, type);
      return;
    }
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `admin-notification ${type}`;
    notification.innerHTML = `
      <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info'}" style="width: 18px; height: 18px;"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
    
    // Animate in
    requestAnimationFrame(() => {
      notification.classList.add('show');
    });
    
    // Remove after delay
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
};

// Initialize when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AdminUI.init());
} else {
  AdminUI.init();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdminUI;
}
