/**
 * i18n - Internationalization Module
 * ===================================
 * Handles language detection, loading, and text replacement.
 * 
 * Usage:
 *   - Default language: German (/)
 *   - English: /en/
 *   
 * Elements with data-i18n="key.path" get their text replaced.
 * Elements with data-i18n-placeholder="key.path" get placeholder replaced.
 * Elements with data-i18n-title="key.path" get title attribute replaced.
 */

const I18N = {
  // Current language
  currentLang: 'de',
  
  // Available languages
  languages: ['de', 'en'],
  
  // Translation data
  translations: {},
  
  // Callbacks for when language changes
  onLanguageChange: [],

  /**
   * Initialize i18n - detect language and load translations
   */
  async init() {
    this.detectLanguage();
    await this.loadTranslations();
    this.applyTranslations();
    this.updateHtmlLang();
    this.createLanguageSwitcher();
    
    console.log(`[i18n] Initialized with language: ${this.currentLang}`);
  },

  /**
   * Detect language from URL path or query parameter
   * /en/ → English
   * ?lang=en → English
   * / → German (default)
   */
  detectLanguage() {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const langParam = params.get('lang');
    
    if (langParam && this.languages.includes(langParam)) {
      this.currentLang = langParam;
    } else if (path.startsWith('/en/') || path === '/en') {
      this.currentLang = 'en';
    } else {
      this.currentLang = 'de';
    }
    
    // Also check localStorage for preference (optional override)
    const savedLang = localStorage.getItem('hostel_language');
    if (savedLang && this.languages.includes(savedLang)) {
      // Only use saved preference if on matching URL
      // This prevents confusion when user navigates via URL
    }
  },

  /**
   * Load translation file for current language
   */
  async loadTranslations() {
    try {
      // Always use absolute path for consistency
      const response = await fetch(`/i18n/${this.currentLang}.json`);
      
      if (!response.ok) {
        throw new Error(`Failed to load ${this.currentLang}.json`);
      }
      
      this.translations = await response.json();
      console.log(`[i18n] Loaded translations for: ${this.currentLang}`);
    } catch (error) {
      console.error('[i18n] Error loading translations:', error);
      // Fallback: try loading German
      if (this.currentLang !== 'de') {
        this.currentLang = 'de';
        await this.loadTranslations();
      }
    }
  },

  /**
   * Get a translation by key path (e.g., "header.login")
   * Supports du/sie formal address variants
   */
  t(keyPath, params = {}) {
    const keys = keyPath.split('.');
    let value = this.translations;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        console.warn(`[i18n] Missing translation: ${keyPath}`);
        return keyPath; // Return key as fallback
      }
    }
    
    // Handle du/sie variants
    if (typeof value === 'object' && ('du' in value || 'sie' in value)) {
      const form = typeof formalAddress !== 'undefined' ? formalAddress : 'du';
      value = value[form] || value.du || value.sie;
    }
    
    // Replace parameters like {days}
    if (typeof value === 'string' && Object.keys(params).length > 0) {
      for (const [param, replacement] of Object.entries(params)) {
        value = value.replace(new RegExp(`\\{${param}\\}`, 'g'), replacement);
      }
    }
    
    return value;
  },

  /**
   * Apply translations to all elements with data-i18n attributes
   */
  applyTranslations() {
    // Text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translation = this.t(key);
      if (translation && translation !== key) {
        el.textContent = translation;
      }
    });
    
    // Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const translation = this.t(key);
      if (translation && translation !== key) {
        el.placeholder = translation;
      }
    });
    
    // Title attributes
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const translation = this.t(key);
      if (translation && translation !== key) {
        el.title = translation;
      }
    });
    
    // Update page title
    if (this.translations.meta?.title) {
      document.title = this.translations.meta.title;
    }
    
    // Update meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && this.translations.meta?.description) {
      metaDesc.content = this.translations.meta.description;
    }

    // Notify callbacks
    this.onLanguageChange.forEach(callback => callback(this.currentLang));
  },

  /**
   * Update html lang attribute
   */
  updateHtmlLang() {
    document.documentElement.lang = this.currentLang;
  },

  /**
   * Create language switcher UI
   */
  createLanguageSwitcher() {
    // Find or create the switcher container
    let switcher = document.getElementById('language-switcher');
    
    if (!switcher) {
      // Create switcher and add to header-actions
      const headerActions = document.querySelector('.header-actions');
      if (headerActions) {
        switcher = document.createElement('div');
        switcher.id = 'language-switcher';
        switcher.className = 'language-switcher';
        switcher.innerHTML = `
          <button class="lang-btn ${this.currentLang === 'de' ? 'active' : ''}" data-lang="de" title="Deutsch">
            🇩🇪
          </button>
          <button class="lang-btn ${this.currentLang === 'en' ? 'active' : ''}" data-lang="en" title="English">
            🇬🇧
          </button>
        `;
        
        // Insert at the beginning of header-actions
        headerActions.insertBefore(switcher, headerActions.firstChild);
        
        // Add click handlers
        switcher.querySelectorAll('.lang-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const lang = e.currentTarget.getAttribute('data-lang');
            this.switchLanguage(lang);
          });
        });
      }
    }
  },

  /**
   * Switch to a different language (without page reload)
   */
  async switchLanguage(lang) {
    if (!this.languages.includes(lang)) return;
    if (lang === this.currentLang) return;
    
    // Save preference
    localStorage.setItem('hostel_language', lang);
    
    // Update current language
    this.currentLang = lang;
    
    // Load new translations
    await this.loadTranslations();
    
    // Apply to DOM
    this.applyTranslations();
    this.updateHtmlLang();
    
    // Update switcher buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
    
    // Update URL without reload (for bookmarking/sharing)
    const currentPath = window.location.pathname;
    let newPath;
    
    if (lang === 'en') {
      newPath = '/en' + (currentPath === '/' ? '/' : currentPath.replace('/en/', '/').replace('/en', ''));
    } else {
      newPath = currentPath.startsWith('/en/') ? currentPath.replace('/en/', '/') : 
                currentPath === '/en' ? '/' : currentPath;
    }
    
    // Use pushState to update URL without reload
    window.history.pushState({ lang }, '', newPath);
    
    console.log(`[i18n] Switched to: ${lang}`);
  },

  /**
   * Get current language
   */
  getLang() {
    return this.currentLang;
  },

  /**
   * Check if current language is English
   */
  isEnglish() {
    return this.currentLang === 'en';
  },

  /**
   * Register callback for language changes
   */
  onChange(callback) {
    this.onLanguageChange.push(callback);
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => I18N.init());
} else {
  I18N.init();
}

// Handle browser back/forward buttons
window.addEventListener('popstate', async (event) => {
  I18N.detectLanguage();
  await I18N.loadTranslations();
  I18N.applyTranslations();
  I18N.updateHtmlLang();
  
  // Update switcher buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === I18N.currentLang);
  });
});

// Export for use in other scripts
window.I18N = I18N;
