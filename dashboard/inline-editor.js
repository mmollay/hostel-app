/**
 * WYSIWYG Inline Editor für Hostel-App
 * Security-First Implementation mit DOM-basierten Methoden
 */

class InlineEditor {
  constructor() {
    this.isEditMode = false;
    this.adminToken = null;
    this.hostelId = "hollenthon"; // Default hostel
    this.contentBlocks = [];
  }

  /**
   * Initialize editor (only when admin is logged in)
   */
  async init() {
    this.adminToken = localStorage.getItem("adminToken");
    if (!this.adminToken) {
      console.log(
        "[InlineEditor] No admin token found, skipping initialization",
      );
      return;
    }

    console.log("[InlineEditor] Initializing...");
    await this.loadContentBlocks();
    this.makeContentEditable();
    this.showEditToolbar();
    console.log("[InlineEditor] Ready");
  }

  /**
   * Load content blocks from API
   */
  async loadContentBlocks() {
    try {
      const response = await fetch(
        `${CONFIG.API_PROXY_URL}/content/${this.hostelId}`,
        {
          headers: { Authorization: `Bearer ${this.adminToken}` },
        },
      );
      const data = await response.json();
      this.contentBlocks = data.content || [];
      console.log(
        "[InlineEditor] Loaded",
        this.contentBlocks.length,
        "content blocks",
      );
    } catch (error) {
      console.error("[InlineEditor] Failed to load content blocks:", error);
      this.contentBlocks = [];
    }
  }

  /**
   * Make elements with data-editable attribute clickable
   */
  makeContentEditable() {
    const editableElements = document.querySelectorAll("[data-editable]");
    console.log(
      "[InlineEditor] Found",
      editableElements.length,
      "editable elements",
    );

    editableElements.forEach((element) => {
      // Skip SSI-protected elements
      if (element.closest("[data-ssi-protected]")) {
        console.log(
          "[InlineEditor] Skipping SSI-protected element:",
          element.dataset.editable,
        );
        return;
      }

      element.classList.add("editable-element");
      element.style.cursor = "pointer";

      // Hover effect
      element.addEventListener("mouseenter", () => {
        element.style.outline = "2px dashed var(--sage)";
      });
      element.addEventListener("mouseleave", () => {
        element.style.outline = "2px dashed transparent";
      });

      // Click to edit
      element.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.openEditor(element);
      });
    });
  }

  /**
   * Open editor modal for an element
   */
  openEditor(element) {
    const blockKey = element.dataset.editable;
    console.log("[InlineEditor] Opening editor for:", blockKey);

    const contentBlock = this.contentBlocks.find(
      (b) => b.block_key === blockKey,
    );

    if (!contentBlock) {
      console.error("[InlineEditor] Content block not found:", blockKey);
      alert(
        "Content-Block nicht gefunden. Möglicherweise müssen Sie die Seite neu laden.",
      );
      return;
    }

    const modal = this.createEditorModal(contentBlock);
    document.body.appendChild(modal);
  }

  /**
   * Create editor modal (DOM-based, NO innerHTML)
   */
  createEditorModal(contentBlock) {
    const content = JSON.parse(contentBlock.content_json);

    // Create modal container
    const modal = document.createElement("div");
    modal.className = "editor-modal";

    // Create overlay
    const overlay = document.createElement("div");
    overlay.className = "editor-overlay";
    overlay.addEventListener("click", () => modal.remove());
    modal.appendChild(overlay);

    // Create content container
    const contentDiv = document.createElement("div");
    contentDiv.className = "editor-content";

    // Create header
    const header = document.createElement("div");
    header.className = "editor-header";

    const title = document.createElement("h2");
    title.textContent = `Bearbeiten: ${content.title || contentBlock.block_key}`;

    const closeBtn = document.createElement("button");
    closeBtn.className = "editor-close";
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", () => modal.remove());

    header.appendChild(title);
    header.appendChild(closeBtn);
    contentDiv.appendChild(header);

    // Create form
    const form = this.createFormElement(contentBlock.block_type, content);
    contentDiv.appendChild(form);

    modal.appendChild(contentDiv);

    // Handle form submission
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveContent(contentBlock, modal);
    });

    return modal;
  }

  /**
   * Create form element (DOM-based, NO innerHTML)
   */
  createFormElement(blockType, content) {
    const form = document.createElement("form");
    form.className = "editor-form";

    // Different form fields based on block type
    if (blockType === "text" || blockType === "card") {
      // Title field
      const titleGroup = this.createFormGroup(
        "Überschrift",
        "title",
        "text",
        content.title || "",
      );
      form.appendChild(titleGroup);

      // Content textarea
      const contentGroup = this.createFormGroup(
        "Text",
        "content",
        "textarea",
        content.content || "",
      );
      form.appendChild(contentGroup);

      // Icon field (optional)
      const iconGroup = this.createFormGroup(
        "Icon (Lucide)",
        "icon",
        "text",
        content.icon || "",
        false,
      );
      form.appendChild(iconGroup);
    } else if (blockType === "hero") {
      // Title field
      const titleGroup = this.createFormGroup(
        "Haupttitel",
        "title",
        "text",
        content.title || "",
      );
      form.appendChild(titleGroup);

      // Subtitle field
      const subtitleGroup = this.createFormGroup(
        "Untertitel",
        "subtitle",
        "text",
        content.subtitle || "",
      );
      form.appendChild(subtitleGroup);
    }

    // Actions
    const actions = document.createElement("div");
    actions.className = "editor-actions";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn-secondary";
    cancelBtn.textContent = "Abbrechen";
    cancelBtn.addEventListener("click", () =>
      form.closest(".editor-modal").remove(),
    );

    const saveBtn = document.createElement("button");
    saveBtn.type = "submit";
    saveBtn.className = "btn-primary";
    saveBtn.textContent = "Speichern";

    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    form.appendChild(actions);

    return form;
  }

  /**
   * Create form group with label and input (DOM-based)
   */
  createFormGroup(label, name, type, value = "", required = true) {
    const group = document.createElement("div");
    group.className = "form-group";

    const labelEl = document.createElement("label");
    labelEl.textContent = label;
    group.appendChild(labelEl);

    let input;
    if (type === "textarea") {
      input = document.createElement("textarea");
      input.rows = 6;
      input.textContent = value; // SAFE: Use textContent, not innerHTML
    } else {
      input = document.createElement("input");
      input.type = type;
      input.value = value;
    }

    input.name = name;
    input.required = required;
    group.appendChild(input);

    return group;
  }

  /**
   * Save content (with XSS sanitization)
   */
  async saveContent(contentBlock, modal) {
    const formData = new FormData(modal.querySelector("form"));
    const updatedContent = {};

    // Extract and sanitize all form fields
    for (const [key, value] of formData.entries()) {
      // CRITICAL: Remove HTML tags for text content
      updatedContent[key] = value.replace(/<[^>]*>/g, "");
    }

    console.log("[InlineEditor] Saving content:", updatedContent);

    try {
      const response = await fetch(
        `${CONFIG.API_PROXY_URL}/content/${this.hostelId}/${contentBlock.block_key}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.adminToken}`,
          },
          body: JSON.stringify({
            content_json: JSON.stringify(updatedContent),
          }),
        },
      );

      if (response.ok) {
        console.log("[InlineEditor] Content saved successfully");
        modal.remove();
        // Reload page to show changes
        window.location.reload();
      } else {
        const error = await response.json();
        alert(
          "Fehler beim Speichern: " + (error.error || "Unbekannter Fehler"),
        );
      }
    } catch (error) {
      console.error("[InlineEditor] Save failed:", error);
      alert("Fehler beim Speichern: " + error.message);
    }
  }

  /**
   * Render content block (update DOM with saved content)
   */
  renderContentBlock(block) {
    const content = JSON.parse(block.content_json);
    const element = document.querySelector(
      `[data-editable="${block.block_key}"]`,
    );
    if (!element) return;

    console.log("[InlineEditor] Rendering block:", block.block_key);

    // Update text content safely
    const titleEl = element.querySelector(".card-title, h1, h3, h2, .greeting");
    if (titleEl && content.title) {
      titleEl.textContent = content.title; // SAFE: No HTML parsing
    }

    const contentEl = element.querySelector(
      ".card-content p, .subtitle, .message",
    );
    if (contentEl && content.content) {
      contentEl.textContent = content.content; // SAFE: No HTML parsing
    }

    // Update icon safely
    const iconEl = element.querySelector("[data-lucide]");
    if (iconEl && content.icon) {
      iconEl.setAttribute("data-lucide", content.icon);
      if (typeof lucide !== "undefined") {
        lucide.createIcons(); // Re-render Lucide icons
      }
    }
  }

  /**
   * Show edit toolbar at the top
   */
  showEditToolbar() {
    const toolbar = document.createElement("div");
    toolbar.className = "edit-toolbar";

    const content = document.createElement("div");
    content.className = "edit-toolbar-content";

    const badge = document.createElement("span");
    badge.className = "edit-mode-badge";
    badge.textContent = "✏️ Bearbeitungsmodus";

    const exitBtn = document.createElement("button");
    exitBtn.className = "btn-exit-edit";
    exitBtn.textContent = "Beenden";
    exitBtn.addEventListener("click", () => {
      if (confirm("Bearbeitungsmodus beenden?")) {
        location.reload();
      }
    });

    content.appendChild(badge);
    content.appendChild(exitBtn);
    toolbar.appendChild(content);

    document.body.insertBefore(toolbar, document.body.firstChild);
  }
}

// Lazy load: Only initialize when admin is logged in
if (localStorage.getItem("adminToken")) {
  console.log("[InlineEditor] Admin token found, initializing editor...");
  const editor = new InlineEditor();
  window.addEventListener("DOMContentLoaded", () => {
    editor.init();
  });
} else {
  console.log("[InlineEditor] No admin token, editor disabled");
}
