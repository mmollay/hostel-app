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
   * Switch to a different language
   */
  switchLanguage(lang) {
    if (!this.languages.includes(lang)) return;
    if (lang === this.currentLang) return;
    
    // Save preference
    localStorage.setItem('hostel_language', lang);
    
    // Navigate to the correct URL
    const currentPath = window.location.pathname;
    let newPath;
    
    if (lang === 'en') {
      // Going to English
      if (currentPath.startsWith('/en/')) {
        return; // Already on English
      }
      // Remove leading slash and add /en/
      newPath = '/en' + (currentPath === '/' ? '/' : currentPath);
    } else {
      // Going to German (default)
      if (currentPath.startsWith('/en/')) {
        newPath = currentPath.replace('/en/', '/');
      } else if (currentPath === '/en') {
        newPath = '/';
      } else {
        return; // Already on German
      }
    }
    
    window.location.href = newPath;
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

// Export for use in other scripts
window.I18N = I18N;
