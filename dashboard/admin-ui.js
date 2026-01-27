/**
 * Admin UI Module v2.0.0
 * Simplified: Just shows admin indicator and link to /admin
 */

const AdminUI = {
  // State
  isAdmin: false,
  adminToken: null,

  /**
   * Initialize Admin UI
   */
  init() {
    this.checkAdminSession();
    this.createAdminElements();
    this.bindEvents();
    
    if (this.isAdmin) {
      this.showAdminUI();
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
    // Admin Button (link to /admin)
    this.createAdminButton();
    
    // Admin Login Modal (hidden link in footer)
    this.createAdminLoginModal();
    
    // Admin Indicator Bar
    this.createAdminIndicator();
  },

  /**
   * Create Admin Button (links to /admin)
   */
  createAdminButton() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;

    const btn = document.createElement('a');
    btn.id = 'adminAreaBtn';
    btn.href = '/admin';
    btn.className = 'guest-login-btn admin-mode';
    btn.title = 'Zurück zum Admin-Bereich';
    btn.style.display = 'none'; // Hidden by default
    btn.style.textDecoration = 'none';
    btn.style.background = 'rgba(34, 197, 94, 0.3)';
    btn.style.borderColor = 'rgba(34, 197, 94, 0.5)';
    btn.innerHTML = `
      <i data-lucide="layout-dashboard"></i>
      <span>Admin</span>
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
        <a href="/admin" class="btn-admin-link">
          <i data-lucide="layout-dashboard" style="width: 14px; height: 14px;"></i>
          <span>Zum Admin-Bereich</span>
        </a>
      </div>
    `;
    
    document.body.insertBefore(indicator, document.body.firstChild);
  },

  /**
   * Bind all events
   */
  bindEvents() {
    // Admin link in footer
    const adminLink = document.querySelector('a[href="/admin.html"]');
    if (adminLink) {
      adminLink.addEventListener('click', (e) => {
        if (!this.isAdmin) {
          e.preventDefault();
          this.openAdminLogin();
        }
        // If admin, let the link work normally
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
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Escape to close modals
      if (e.key === 'Escape') {
        this.closeAdminLogin();
      }
      // Ctrl+Shift+A for admin login
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        if (this.isAdmin) {
          window.location.href = '/admin';
        } else {
          this.openAdminLogin();
        }
      }
    });
  },

  /**
   * Show Admin UI elements
   */
  showAdminUI() {
    const adminBtn = document.getElementById('adminAreaBtn');
    const indicator = document.getElementById('adminIndicator');
    const guestBtn = document.getElementById('guestLoginBtn');
    
    if (adminBtn) adminBtn.style.display = 'flex';
    if (indicator) indicator.style.display = 'block';
    // Hide guest login button when admin is logged in
    if (guestBtn) guestBtn.style.display = 'none';
    
    document.body.classList.add('admin-logged-in');
    
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  },

  /**
   * Hide Admin UI elements
   */
  hideAdminUI() {
    const adminBtn = document.getElementById('adminAreaBtn');
    const indicator = document.getElementById('adminIndicator');
    const guestBtn = document.getElementById('guestLoginBtn');
    
    if (adminBtn) adminBtn.style.display = 'none';
    if (indicator) indicator.style.display = 'none';
    // Show guest login button again
    if (guestBtn) guestBtn.style.display = 'flex';
    
    document.body.classList.remove('admin-logged-in');
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
        
        // Redirect to admin area
        window.location.href = '/admin';
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
