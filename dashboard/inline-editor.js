/**
 * Inline Editor v0.6.0
 * WYSIWYG-style editing for admin users
 * Works with AdminUI module for authentication
 * 
 * Erlaubte HTML-Tags: <b>, <i>, <u>, <a>, <br>, <p>, <ul>, <ol>, <li>
 */

const InlineEditor = {
  // Erlaubte HTML-Tags für Sanitization
  ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'a', 'br', 'p', 'ul', 'ol', 'li', 'span'],
  ALLOWED_ATTRIBUTES: {
    'a': ['href', 'target', 'rel'],
    'span': ['class']
  },

  // State
  isAdmin: false,
  editMode: false,
  currentElement: null,
  toolbar: null,
  originalContent: {},
  initialized: false,

  /**
   * Initialisierung
   */
  init() {
    // Prevent double initialization
    if (this.initialized) {
      console.log('[InlineEditor] Already initialized');
      return;
    }

    // Check if user is admin (via AdminUI or token)
    const adminToken = localStorage.getItem('hostel_admin_token') || 
                       sessionStorage.getItem('hostel_admin_token');
    
    // Also check AdminUI if available
    const isAdminViaUI = typeof AdminUI !== 'undefined' && AdminUI.isAdmin;
    
    if (!adminToken && !isAdminViaUI) {
      console.log('[InlineEditor] No admin token, editor disabled');
      return;
    }

    this.isAdmin = true;
    this.initialized = true;
    this.createToolbar();
    this.markEditableElements();
    this.addEventListeners();
    // Don't add edit mode toggle - AdminUI handles this now
    // this.addEditModeToggle();
    
    console.log('[InlineEditor] Initialized for admin user');
  },

  /**
   * Toolbar erstellen
   */
  createToolbar() {
    const toolbar = document.createElement('div');
    toolbar.id = 'inlineEditorToolbar';
    toolbar.className = 'inline-editor-toolbar';
    toolbar.innerHTML = `
      <button type="button" data-command="bold" title="Fett (Ctrl+B)">
        <i data-lucide="bold"></i>
      </button>
      <button type="button" data-command="italic" title="Kursiv (Ctrl+I)">
        <i data-lucide="italic"></i>
      </button>
      <button type="button" data-command="underline" title="Unterstrichen (Ctrl+U)">
        <i data-lucide="underline"></i>
      </button>
      <span class="toolbar-divider"></span>
      <button type="button" data-command="link" title="Link einfügen">
        <i data-lucide="link"></i>
      </button>
      <button type="button" data-command="unlink" title="Link entfernen">
        <i data-lucide="link-2-off"></i>
      </button>
      <span class="toolbar-divider"></span>
      <button type="button" data-command="save" title="Speichern" class="save-btn">
        <i data-lucide="save"></i>
      </button>
      <button type="button" data-command="cancel" title="Abbrechen" class="cancel-btn">
        <i data-lucide="x"></i>
      </button>
    `;
    
    toolbar.style.display = 'none';
    document.body.appendChild(toolbar);
    this.toolbar = toolbar;

    // Lucide Icons initialisieren
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    // Toolbar Button Events
    toolbar.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const command = btn.dataset.command;
        this.executeCommand(command);
      });
    });
  },

  /**
   * Edit-Mode Toggle Button zum Header hinzufügen
   * NOTE: This is now handled by AdminUI module
   */
  addEditModeToggle() {
    // Skip if AdminUI is handling the toggle button
    if (typeof AdminUI !== 'undefined') {
      console.log('[InlineEditor] Edit mode toggle handled by AdminUI');
      return;
    }

    const headerActions = document.querySelector('.header-actions') || 
                          document.querySelector('header .user-actions') ||
                          document.querySelector('header');
    
    if (!headerActions) return;

    const toggle = document.createElement('button');
    toggle.id = 'editModeToggle';
    toggle.className = 'btn btn-sm edit-mode-toggle';
    toggle.innerHTML = '<i data-lucide="edit-3"></i> <span>Bearbeiten</span>';
    toggle.title = 'Inline-Bearbeitung aktivieren';
    
    toggle.addEventListener('click', () => this.toggleEditMode());
    
    // Am Anfang einfügen
    headerActions.insertBefore(toggle, headerActions.firstChild);
    
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  },

  /**
   * Edit-Mode umschalten
   */
  toggleEditMode() {
    this.editMode = !this.editMode;
    const toggle = document.getElementById('editModeToggle');
    const body = document.body;

    if (this.editMode) {
      body.classList.add('inline-edit-mode');
      if (toggle) {
        toggle.classList.add('active');
        toggle.innerHTML = '<i data-lucide="eye"></i> <span>Vorschau</span>';
      }
      this.showEditableHints();
    } else {
      body.classList.remove('inline-edit-mode');
      if (toggle) {
        toggle.classList.remove('active');
        toggle.innerHTML = '<i data-lucide="edit-3"></i> <span>Bearbeiten</span>';
      }
      this.hideToolbar();
      this.hideEditableHints();
    }

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  },

  /**
   * Editierbare Elemente markieren
   */
  markEditableElements() {
    // Finde alle Elemente mit data-editable Attribut
    const editables = document.querySelectorAll('[data-editable]');
    
    editables.forEach(el => {
      el.classList.add('inline-editable');
      
      // Speichere Original-Content
      const key = el.dataset.editable;
      this.originalContent[key] = el.innerHTML;
    });

    console.log(`[InlineEditor] Found ${editables.length} editable elements`);
  },

  /**
   * Visuelle Hinweise für editierbare Elemente zeigen
   */
  showEditableHints() {
    document.querySelectorAll('.inline-editable').forEach(el => {
      el.classList.add('editable-highlight');
    });
  },

  /**
   * Visuelle Hinweise verstecken
   */
  hideEditableHints() {
    document.querySelectorAll('.inline-editable').forEach(el => {
      el.classList.remove('editable-highlight');
    });
  },

  /**
   * Event Listeners
   */
  addEventListeners() {
    // Click auf editierbare Elemente
    document.addEventListener('click', (e) => {
      if (!this.editMode) return;

      const editable = e.target.closest('[data-editable]');
      
      if (editable) {
        e.preventDefault();
        this.startEditing(editable);
      } else if (!e.target.closest('#inlineEditorToolbar') && 
                 !e.target.closest('.inline-editing')) {
        // Click außerhalb - nichts tun (User muss explizit speichern/abbrechen)
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (!this.currentElement) return;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            this.executeCommand('bold');
            break;
          case 'i':
            e.preventDefault();
            this.executeCommand('italic');
            break;
          case 'u':
            e.preventDefault();
            this.executeCommand('underline');
            break;
          case 's':
            e.preventDefault();
            this.executeCommand('save');
            break;
        }
      }

      if (e.key === 'Escape') {
        this.executeCommand('cancel');
      }
    });
  },

  /**
   * Bearbeitung starten
   */
  startEditing(element) {
    // Falls schon ein anderes Element bearbeitet wird
    if (this.currentElement && this.currentElement !== element) {
      // Frage ob speichern
      if (this.hasChanges()) {
        if (!confirm('Ungespeicherte Änderungen. Verwerfen?')) {
          return;
        }
      }
      this.cancelEditing();
    }

    this.currentElement = element;
    const key = element.dataset.editable;
    
    // Original speichern falls nicht vorhanden
    if (!this.originalContent[key]) {
      this.originalContent[key] = element.innerHTML;
    }

    element.setAttribute('contenteditable', 'true');
    element.classList.add('inline-editing');
    element.focus();

    this.showToolbar(element);
    
    console.log(`[InlineEditor] Started editing: ${key}`);
  },

  /**
   * Toolbar anzeigen
   */
  showToolbar(element) {
    if (!this.toolbar) return;

    const rect = element.getBoundingClientRect();
    const toolbarHeight = 44;
    
    // Position über dem Element
    let top = rect.top - toolbarHeight - 8 + window.scrollY;
    let left = rect.left + window.scrollX;

    // Falls zu weit oben, unter dem Element anzeigen
    if (top < 60) {
      top = rect.bottom + 8 + window.scrollY;
    }

    // Falls zu weit rechts
    const toolbarWidth = 280;
    if (left + toolbarWidth > window.innerWidth) {
      left = window.innerWidth - toolbarWidth - 16;
    }

    this.toolbar.style.top = `${top}px`;
    this.toolbar.style.left = `${left}px`;
    this.toolbar.style.display = 'flex';
  },

  /**
   * Toolbar verstecken
   */
  hideToolbar() {
    if (this.toolbar) {
      this.toolbar.style.display = 'none';
    }
  },

  /**
   * Command ausführen
   */
  executeCommand(command) {
    switch (command) {
      case 'bold':
        document.execCommand('bold', false, null);
        break;
      case 'italic':
        document.execCommand('italic', false, null);
        break;
      case 'underline':
        document.execCommand('underline', false, null);
        break;
      case 'link':
        const url = prompt('Link URL:', 'https://');
        if (url) {
          document.execCommand('createLink', false, url);
          // Neue Links mit target="_blank" versehen
          if (this.currentElement) {
            this.currentElement.querySelectorAll('a:not([target])').forEach(a => {
              a.setAttribute('target', '_blank');
              a.setAttribute('rel', 'noopener noreferrer');
            });
          }
        }
        break;
      case 'unlink':
        document.execCommand('unlink', false, null);
        break;
      case 'save':
        this.saveChanges();
        break;
      case 'cancel':
        this.cancelEditing();
        break;
    }
  },

  /**
   * Prüfen ob Änderungen vorhanden
   */
  hasChanges() {
    if (!this.currentElement) return false;
    const key = this.currentElement.dataset.editable;
    return this.currentElement.innerHTML !== this.originalContent[key];
  },

  /**
   * Get current language from I18N module
   */
  getCurrentLang() {
    // Check I18N module
    if (typeof I18N !== 'undefined' && I18N.currentLang) {
      return I18N.currentLang;
    }
    // Fallback: check localStorage or URL
    const savedLang = localStorage.getItem('hostel_language');
    if (savedLang && ['de', 'en'].includes(savedLang)) {
      return savedLang;
    }
    // Check URL
    if (window.location.pathname.startsWith('/en/') || 
        window.location.search.includes('lang=en')) {
      return 'en';
    }
    return 'de';
  },

  /**
   * Änderungen speichern
   */
  async saveChanges() {
    if (!this.currentElement) return;

    const key = this.currentElement.dataset.editable;
    const content = this.sanitizeHTML(this.currentElement.innerHTML);
    const lang = this.getCurrentLang();
    
    console.log(`[InlineEditor] Saving: ${key} (${lang})`);

    try {
      const token = localStorage.getItem('hostel_admin_token') || 
                    sessionStorage.getItem('hostel_admin_token');

      const response = await fetch(`${window.CONFIG?.API_PROXY_URL || ''}/content/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          content: content,
          blockKey: key,
          lang: lang
        })
      });

      const data = await response.json();

      if (data.success) {
        // Update original content
        this.originalContent[key] = content;
        this.currentElement.innerHTML = content;
        
        const langLabel = lang === 'de' ? 'DE' : 'EN';
        this.showNotification(`Gespeichert (${langLabel})!`, 'success');
        this.stopEditing();
      } else {
        this.showNotification(data.error || 'Fehler beim Speichern', 'error');
      }
    } catch (error) {
      console.error('[InlineEditor] Save error:', error);
      this.showNotification('Verbindungsfehler', 'error');
    }
  },

  /**
   * Bearbeitung abbrechen
   */
  cancelEditing() {
    if (!this.currentElement) return;

    const key = this.currentElement.dataset.editable;
    
    // Original wiederherstellen
    if (this.originalContent[key]) {
      this.currentElement.innerHTML = this.originalContent[key];
    }

    this.stopEditing();
  },

  /**
   * Bearbeitung beenden
   */
  stopEditing() {
    if (this.currentElement) {
      this.currentElement.removeAttribute('contenteditable');
      this.currentElement.classList.remove('inline-editing');
      this.currentElement = null;
    }
    this.hideToolbar();
  },

  /**
   * HTML sanitieren - nur erlaubte Tags
   */
  sanitizeHTML(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    const clean = (node) => {
      const children = Array.from(node.childNodes);
      
      children.forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const tagName = child.tagName.toLowerCase();
          
          if (!this.ALLOWED_TAGS.includes(tagName)) {
            // Tag nicht erlaubt - durch Inhalt ersetzen
            while (child.firstChild) {
              node.insertBefore(child.firstChild, child);
            }
            node.removeChild(child);
          } else {
            // Nur erlaubte Attribute behalten
            const allowedAttrs = this.ALLOWED_ATTRIBUTES[tagName] || [];
            Array.from(child.attributes).forEach(attr => {
              if (!allowedAttrs.includes(attr.name)) {
                child.removeAttribute(attr.name);
              }
            });
            
            // Rekursiv säubern
            clean(child);
          }
        }
      });
    };

    clean(doc.body);
    return doc.body.innerHTML;
  },

  /**
   * Benachrichtigung anzeigen
   */
  showNotification(message, type = 'info') {
    // Nutze bestehende Toast-Funktion falls vorhanden
    if (typeof showToast === 'function') {
      showToast(message, type);
      return;
    }

    // Fallback: Simple notification
    const notification = document.createElement('div');
    notification.className = `inline-editor-notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }
};

// Auto-init wenn DOM ready
// NOTE: If AdminUI is present, it will call InlineEditor.init() when admin logs in
// This auto-init is for backwards compatibility when AdminUI is not loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Delay to let AdminUI initialize first
    setTimeout(() => {
      if (typeof AdminUI === 'undefined') {
        InlineEditor.init();
      }
    }, 100);
  });
} else {
  setTimeout(() => {
    if (typeof AdminUI === 'undefined') {
      InlineEditor.init();
    }
  }, 100);
}

// Export für Module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InlineEditor;
}
