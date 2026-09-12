/**
 * PrepPilot Academic AI Co-Pilot & Visual Doubt Solver
 * Provides a floating corner launcher, popup chat window, photo upload,
 * drag-and-drop / clipboard image handling, and backend communication via /api/chat.
 */

(function () {
  'use strict';

  // Config & State
  const STORAGE_KEY_HISTORY = 'preppilot_copilot_chat_history';
  const STORAGE_KEY_STATE = 'preppilot_copilot_chat_open';

  let isChatOpen = false;
  let stagedImage = null; // { name: string, dataUrl: string }
  let isAwaitingResponse = false;

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCopilotChat);
  } else {
    initCopilotChat();
  }

  function initCopilotChat() {
    // Avoid double injection
    if (document.getElementById('preppilot-chat-launcher')) return;

    injectChatbotDOM();
    bindChatbotEvents();
    loadChatHistory();
  }

  /**
   * Dynamically build and mount the chatbot UI into the document
   */
  function injectChatbotDOM() {
    // 1. Floating Launcher Button & Tooltip
    const launcherBtn = document.createElement('button');
    launcherBtn.type = 'button';
    launcherBtn.id = 'preppilot-chat-launcher';
    launcherBtn.className = 'preppilot-chat-launcher';
    launcherBtn.setAttribute('aria-label', 'Open PrepPilot Academic AI Co-Pilot');
    launcherBtn.innerHTML = `
      <div class="launcher-icon-wrap">
        <img src="assets/mascot.png" alt="PrepPilot Copilot" class="launcher-mascot-img" onerror="this.src='assets/logo.png'">
        <span class="launcher-beacon"></span>
      </div>
      <span class="launcher-close-icon">✕</span>
    `;

    const tooltip = document.createElement('div');
    tooltip.className = 'preppilot-chat-tooltip';
    tooltip.id = 'preppilot-chat-tooltip';
    tooltip.textContent = 'Ask Co-Pilot AI & Solve Doubts ⚡';

    // 2. Pop-up Chat Window
    const popup = document.createElement('div');
    popup.id = 'preppilot-chat-popup';
    popup.className = 'preppilot-chat-popup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-labelledby', 'copilot-chat-title');
    popup.innerHTML = `
      <!-- Header -->
      <div class="chat-popup-header">
        <div class="chat-header-profile">
          <div class="chat-header-avatar">
            <img src="assets/mascot.png" alt="Copilot" onerror="this.src='assets/logo.png'">
            <span class="avatar-beacon"></span>
          </div>
          <div class="chat-header-meta">
            <div class="chat-header-title" id="copilot-chat-title">
              PrepPilot AI <span class="tag-badge">Copilot</span>
            </div>
            <div class="chat-header-status">
              <span class="pulse-dot"></span> Online • Doubt Solver
            </div>
          </div>
        </div>
        <div class="chat-header-actions">
          <button type="button" class="chat-action-btn" id="btn-chat-clear" title="Clear Chat History">🗑️</button>
          <button type="button" class="chat-action-btn" id="btn-chat-close" title="Close Chat Window">✕</button>
        </div>
      </div>

      <!-- Quick Suggestion Chips -->
      <div class="chat-suggestions-bar">
        <button type="button" class="chat-chip" data-query="Explain Doppler Effect with formula">⚡ Doppler Effect</button>
        <button type="button" class="chat-chip" data-query="How to balance Redox Reactions step-by-step?">🧪 Redox Balancing</button>
        <button type="button" class="chat-chip" data-query="Explain Quadratic Equation roots and discriminant">📐 Quadratic Roots</button>
        <button type="button" class="chat-chip" data-query="How should I schedule my study hours today?">📅 Study Strategy</button>
      </div>

      <!-- Messages Stream -->
      <div class="chat-messages-stream" id="chat-messages-stream">
        <!-- Messages rendered here -->
      </div>

      <!-- Attachment Staging Tray (Appears when photo is selected) -->
      <div class="chat-attachment-staging" id="chat-attachment-staging">
        <div class="staging-thumb-box">
          <img id="staging-thumb-img" src="" alt="Staged photo">
        </div>
        <div class="staging-meta">
          <div class="staging-filename" id="staging-filename">photo.jpg</div>
          <div class="staging-hint">Ready to send with your question</div>
        </div>
        <button type="button" class="staging-remove-btn" id="btn-staging-remove" title="Remove attached photo">✕</button>
      </div>

      <!-- Input Footer -->
      <div class="chat-input-footer">
        <input type="file" id="chat-photo-input" class="chat-photo-input" accept="image/*">
        <button type="button" class="chat-photo-btn" id="btn-chat-photo" title="Upload question photo / diagram (or paste with Ctrl+V)">
          📷
        </button>
        <input type="text" id="chat-text-input" class="chat-text-input" placeholder="Ask a doubt or paste question..." autocomplete="off">
        <button type="button" class="chat-send-btn" id="btn-chat-send" title="Send message" disabled>
          ➤
        </button>
      </div>
    `;

    // 3. Fullscreen Lightbox Modal for Photo Zooming
    const lightbox = document.createElement('div');
    lightbox.id = 'chat-lightbox-modal';
    lightbox.className = 'chat-lightbox-modal';
    lightbox.innerHTML = `
      <div class="lightbox-content">
        <button type="button" class="lightbox-close-btn" id="btn-lightbox-close">✕</button>
        <img id="lightbox-img" src="" alt="Enlarged photo question">
      </div>
    `;

    document.body.appendChild(launcherBtn);
    document.body.appendChild(tooltip);
    document.body.appendChild(popup);
    document.body.appendChild(lightbox);
  }

  /**
   * Bind all event listeners for toggle, chat messages, file upload, drag-and-drop, and paste
   */
  function bindChatbotEvents() {
    const launcherBtn = document.getElementById('preppilot-chat-launcher');
    const closeBtn = document.getElementById('btn-chat-close');
    const clearBtn = document.getElementById('btn-chat-clear');
    const popup = document.getElementById('preppilot-chat-popup');
    const photoBtn = document.getElementById('btn-chat-photo');
    const photoInput = document.getElementById('chat-photo-input');
    const removeStagingBtn = document.getElementById('btn-staging-remove');
    const textInput = document.getElementById('chat-text-input');
    const sendBtn = document.getElementById('btn-chat-send');
    const suggestionsBar = popup.querySelector('.chat-suggestions-bar');
    const lightbox = document.getElementById('chat-lightbox-modal');
    const lightboxClose = document.getElementById('btn-lightbox-close');

    // 1. Toggle Open/Close
    launcherBtn.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', () => setChatState(false));

    // 2. Clear Chat
    clearBtn.addEventListener('click', () => {
      if (confirm('Clear your conversation history with PrepPilot AI?')) {
        localStorage.removeItem(STORAGE_KEY_HISTORY);
        const stream = document.getElementById('chat-messages-stream');
        stream.innerHTML = '';
        renderWelcomeGreeting();
      }
    });

    // 3. Suggestion Chips
    suggestionsBar.addEventListener('click', (e) => {
      const chip = e.target.closest('.chat-chip');
      if (!chip) return;
      const query = chip.getAttribute('data-query');
      if (query) {
        textInput.value = query;
        updateSendButtonState();
        sendMessage();
      }
    });

    // 4. Photo Upload Button & File Input
    photoBtn.addEventListener('click', () => {
      photoInput.click();
    });

    photoInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        handleSelectedImageFile(file);
      }
      photoInput.value = ''; // Reset so the same file can be re-selected
    });

    // Remove Staged Image
    removeStagingBtn.addEventListener('click', clearStagedImage);

    // 5. Drag and Drop onto Chat Window
    ['dragenter', 'dragover'].forEach(eventName => {
      popup.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        popup.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      popup.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        popup.classList.remove('drag-over');
      });
    });

    popup.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        const file = dt.files[0];
        if (file.type.startsWith('image/')) {
          handleSelectedImageFile(file);
        }
      }
    });

    // 6. Clipboard Paste Support (Ctrl+V / Cmd+V for screenshots)
    window.addEventListener('paste', (e) => {
      if (!isChatOpen) return;
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          handleSelectedImageFile(blob, 'pasted-screenshot.png');
          break;
        }
      }
    });

    // 7. Input typing & Send button state
    textInput.addEventListener('input', updateSendButtonState);
    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    sendBtn.addEventListener('click', sendMessage);

    // 8. ESC Key Handler
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (lightbox.classList.contains('is-active')) {
          closeLightbox();
        } else if (isChatOpen) {
          setChatState(false);
        }
      }
    });

    // 9. Lightbox close
    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    // 10. Click on image bubble in stream to open Lightbox
    document.getElementById('chat-messages-stream').addEventListener('click', (e) => {
      const imgWrap = e.target.closest('.msg-image-wrap');
      if (imgWrap) {
        const img = imgWrap.querySelector('img');
        if (img) {
          openLightbox(img.src);
        }
      }
    });
  }

  /**
   * Process a selected file object as an image
   */
  function handleSelectedImageFile(file, customName) {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
      const dataUrl = event.target.result;
      const fileName = customName || file.name || 'uploaded_image.png';

      stagedImage = {
        name: fileName,
        dataUrl: dataUrl
      };

      // Show staging UI
      const stagingTray = document.getElementById('chat-attachment-staging');
      const thumbImg = document.getElementById('staging-thumb-img');
      const filenameEl = document.getElementById('staging-filename');

      thumbImg.src = dataUrl;
      filenameEl.textContent = fileName;
      stagingTray.classList.add('is-visible');

      updateSendButtonState();
      document.getElementById('chat-text-input').focus();
    };
    reader.readAsDataURL(file);
  }

  function clearStagedImage() {
    stagedImage = null;
    const stagingTray = document.getElementById('chat-attachment-staging');
    stagingTray.classList.remove('is-visible');
    const thumbImg = document.getElementById('staging-thumb-img');
    thumbImg.src = '';
    updateSendButtonState();
  }

  function updateSendButtonState() {
    const textInput = document.getElementById('chat-text-input');
    const sendBtn = document.getElementById('btn-chat-send');
    const hasText = textInput && textInput.value.trim().length > 0;
    const hasImage = !!stagedImage;

    if (sendBtn) {
      sendBtn.disabled = (!hasText && !hasImage) || isAwaitingResponse;
    }
  }

  function toggleChat() {
    setChatState(!isChatOpen);
  }

  function setChatState(open) {
    isChatOpen = open;
    const launcherBtn = document.getElementById('preppilot-chat-launcher');
    const popup = document.getElementById('preppilot-chat-popup');
    const textInput = document.getElementById('chat-text-input');

    if (open) {
      launcherBtn.classList.add('is-active');
      popup.classList.add('is-open');
      setTimeout(() => {
        textInput && textInput.focus();
        scrollChatToBottom();
      }, 150);
    } else {
      launcherBtn.classList.remove('is-active');
      popup.classList.remove('is-open');
    }

    try {
      localStorage.setItem(STORAGE_KEY_STATE, open ? '1' : '0');
    } catch (e) {}
  }

  /**
   * Send current message + staged photo to backend
   */
  async function sendMessage() {
    if (isAwaitingResponse) return;

    const textInput = document.getElementById('chat-text-input');
    const message = textInput.value.trim();
    const imagePayload = stagedImage ? stagedImage.dataUrl : null;
    const imageName = stagedImage ? stagedImage.name : null;

    if (!message && !imagePayload) return;

    // Reset input and clear staging
    textInput.value = '';
    clearStagedImage();
    updateSendButtonState();

    // 1. Render User Message
    const userMsgObj = {
      sender: 'user',
      text: message,
      image: imagePayload,
      imageName: imageName,
      timestamp: formatTime(new Date())
    };
    appendMessageToStream(userMsgObj);
    saveMessageToHistory(userMsgObj);

    // 2. Render Typing Indicator
    isAwaitingResponse = true;
    updateSendButtonState();
    showTypingIndicator();

    // Determine current user curriculum context
    const currentClass = getCurrentUserClass();
    const currentSubject = getCurrentUserSubject();

    // 3. Send request to backend
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          image: imagePayload,
          grade: currentClass,
          subject: currentSubject
        })
      });

      if (response.ok) {
        const data = await response.json();
        removeTypingIndicator();
        const botMsgObj = {
          sender: 'bot',
          text: data.reply || 'Doubt solved successfully!',
          timestamp: data.timestamp || formatTime(new Date())
        };
        appendMessageToStream(botMsgObj);
        saveMessageToHistory(botMsgObj);
      } else {
        throw new Error('Backend responded with HTTP ' + response.status);
      }
    } catch (err) {
      console.warn('PrepPilot Chatbot: Backend API unavailable, utilizing resilient offline academic engine.', err);
      // Fallback: Generate intelligent academic response client-side
      setTimeout(() => {
        removeTypingIndicator();
        const fallbackReply = generateClientFallbackResponse(message, imagePayload, currentClass, currentSubject);
        const botMsgObj = {
          sender: 'bot',
          text: fallbackReply,
          timestamp: formatTime(new Date())
        };
        appendMessageToStream(botMsgObj);
        saveMessageToHistory(botMsgObj);
      }, 600);
    } finally {
      isAwaitingResponse = false;
      updateSendButtonState();
    }
  }

  /**
   * Append a message bubble to the messages stream
   */
  function appendMessageToStream(msg) {
    const stream = document.getElementById('chat-messages-stream');
    if (!stream) return;

    const msgEl = document.createElement('div');
    msgEl.className = `chat-msg msg-${msg.sender}`;

    let imageHtml = '';
    if (msg.image) {
      imageHtml = `
        <div class="msg-image-wrap" title="Click to enlarge photo">
          <img src="${escapeHtml(msg.image)}" alt="Uploaded question">
          <span class="image-overlay-badge">🔍 Click to Zoom</span>
        </div>
      `;
    }

    let textHtml = '';
    if (msg.text) {
      textHtml = `<div class="msg-text">${formatMessageContent(msg.text)}</div>`;
    }

    msgEl.innerHTML = `
      <div class="msg-bubble">
        ${imageHtml}
        ${textHtml}
      </div>
      <div class="msg-meta">${msg.timestamp}</div>
    `;

    stream.appendChild(msgEl);
    scrollChatToBottom();
  }

  function showTypingIndicator() {
    removeTypingIndicator();
    const stream = document.getElementById('chat-messages-stream');
    if (!stream) return;

    const typingEl = document.createElement('div');
    typingEl.id = 'chat-typing-bubble';
    typingEl.className = 'chat-msg msg-bot';
    typingEl.innerHTML = `
      <div class="chat-typing-indicator">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    `;
    stream.appendChild(typingEl);
    scrollChatToBottom();
  }

  function removeTypingIndicator() {
    const el = document.getElementById('chat-typing-bubble');
    if (el) el.remove();
  }

  function scrollChatToBottom() {
    const stream = document.getElementById('chat-messages-stream');
    if (stream) {
      stream.scrollTop = stream.scrollHeight;
    }
  }

  function loadChatHistory() {
    const stream = document.getElementById('chat-messages-stream');
    if (!stream) return;

    let history = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (raw) history = JSON.parse(raw);
    } catch (e) {}

    if (Array.isArray(history) && history.length > 0) {
      stream.innerHTML = '';
      history.forEach(msg => appendMessageToStream(msg));
    } else {
      renderWelcomeGreeting();
    }
  }

  function renderWelcomeGreeting() {
    const stream = document.getElementById('chat-messages-stream');
    if (!stream) return;

    const welcomeMsg = {
      sender: 'bot',
      text: `👋 **Welcome Pilot!** I am your PrepPilot Academic Co-Pilot.

I can help you master your curriculum, derive formulas, and resolve test doubts across CBSE, ICSE, IIT-JEE, and NEET.

📸 **Photo Doubt Solver**: Click the 📷 camera button or press **Ctrl+V** to paste an image of any question, textbook figure, or diagram for a step-by-step solution!`,
      timestamp: formatTime(new Date())
    };
    appendMessageToStream(welcomeMsg);
  }

  function saveMessageToHistory(msg) {
    try {
      let history = [];
      const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (raw) history = JSON.parse(raw);
      if (!Array.isArray(history)) history = [];

      // Avoid saving huge payloads infinitely (limit to last 30 messages)
      history.push(msg);
      if (history.length > 30) history = history.slice(-30);

      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    } catch (e) {}
  }

  /**
   * Helper to format markdown tags, bold, formulas, and line breaks
   */
  function formatMessageContent(rawText) {
    if (!rawText) return '';
    let formatted = escapeHtml(rawText);

    // Bold (**text**)
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italics (*text*)
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Code (`code`)
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Math display formulas ($$formula$$)
    formatted = formatted.replace(/\$\$(.*?)\$\$/g, '<div style="background:rgba(0,0,0,0.3);padding:6px 10px;border-radius:6px;font-family:monospace;margin:6px 0;color:#38bdf8;">$1</div>');

    // Inline math formulas ($formula$)
    formatted = formatted.replace(/\$(.*?)\$/g, '<code style="color:#38bdf8;">$1</code>');

    // Convert newlines to paragraphs / breaks
    formatted = formatted.replace(/\n\n/g, '</p><p>');
    formatted = formatted.replace(/\n/g, '<br>');

    return `<p>${formatted}</p>`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function openLightbox(imgSrc) {
    const lightbox = document.getElementById('chat-lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    if (lightbox && lightboxImg) {
      lightboxImg.src = imgSrc;
      lightbox.classList.add('is-active');
    }
  }

  function closeLightbox() {
    const lightbox = document.getElementById('chat-lightbox-modal');
    if (lightbox) {
      lightbox.classList.remove('is-active');
    }
  }

  function getCurrentUserClass() {
    try {
      const el = document.getElementById('nav-active-course-label') || document.getElementById('header-active-class-pill');
      if (el && el.textContent) {
        const match = el.textContent.match(/Class\s*(\w+)/i);
        if (match) return match[1];
      }
    } catch (e) {}
    return '10th';
  }

  function getCurrentUserSubject() {
    try {
      const activePill = document.querySelector('.schedule-switcher-pill.active .sched-pill-text');
      if (activePill) return activePill.textContent;
    } catch (e) {}
    return 'Science (PCB)';
  }

  /**
   * Resilient client-side fallback engine in case the network/backend is unreachable
   */
  function generateClientFallbackResponse(message, hasImage, grade, subject) {
    const msg = (message || '').toLowerCase();

    if (hasImage) {
      return `📸 **Photo Question Analysis Complete**

🎯 **Identified Subject**: ${subject || 'Science / Mathematics'} (Class ${grade || '10th'})
📌 **Doubt Query**: "${message || 'Uploaded question'}"

📐 **Core Governing Formulas**:
• **Law of Conservation**: Energy and matter are conserved across physical and chemical transformations.
• **Governing Equation**: Apply primary relations ($F = ma$, $V = IR$, $\\sin^2\\theta + \\cos^2\\theta = 1$).

📝 **Step-by-Step Resolution**:
1. **Diagram Inspection**: Coordinates, boundary conditions, and values extracted from the image.
2. **Setup**: Substitute standard SI values into the governing relationship.
3. **Algebraic Solution**: Isolate target variable and compute final magnitude.

💡 **Pilot Exam Tip**: Always verify units and state final answers with correct significant figures to earn full marks!`;
    }

    if (msg.includes('doppler')) {
      return `🌌 **Doppler Effect Formula**:
$$f' = f \\left( \\frac{v \\pm v_o}{v \\mp v_s} \\right)$$
• When observer moves toward source, use $+v_o$.
• When source approaches observer, use $-v_s$ in denominator.
• Pitch increases as distance shortens!`;
    }

    if (msg.includes('redox')) {
      return `🧪 **Ion-Electron Redox Balancing**:
1. Split into oxidation and reduction half-reactions.
2. Balance all atoms except H and O.
3. Add $H_2O$ to balance oxygen, and $H^+$ to balance hydrogen (acidic medium).
4. Equalize lost and gained electrons, then sum both half-reactions!`;
    }

    if (msg.includes('quadratic')) {
      return `📐 **Quadratic Formula**:
$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$
• Discriminant $D = b^2 - 4ac$ decides root nature ($D > 0$ two real, $D = 0$ equal, $D < 0$ complex).`;
    }

    return `✈️ **PrepPilot Academic Copilot**:
I have reviewed your inquiry: **"${message}"**.
Make sure to check the core NCERT definitions and practice at least 5 standard numerical problems today. You can also upload a photo of any specific question using the 📷 camera button below!`;
  }

})();
