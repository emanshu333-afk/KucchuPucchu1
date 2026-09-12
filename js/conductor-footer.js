/**
 * PrepPilot - Conductor-Style Theme Interactive Controller
 * Handles newsletter subscription, legal consent validation, toast feedback, and smooth navigation.
 */

(function () {
  'use strict';

  function initConductorTheme() {
    const newsletterForm = document.getElementById('conductor-newsletter-form');
    const emailInput = document.getElementById('conductor-newsletter-email');
    const consentCheckbox = document.getElementById('conductor-newsletter-consent');

    if (newsletterForm) {
      newsletterForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const email = (emailInput && emailInput.value) ? emailInput.value.trim() : '';

        // 1. Email format check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
          showThemeToast('⚠️ Please enter a valid email address.');
          if (emailInput) {
            emailInput.focus();
            highlightError(emailInput.closest('.footer-pill-input-wrap'));
          }
          return;
        }

        // 2. Consent checkbox check
        if (consentCheckbox && !consentCheckbox.checked) {
          showThemeToast('⚠️ Please agree to the Terms of Service & Privacy Policy.');
          consentCheckbox.focus();
          highlightError(consentCheckbox);
          return;
        }

        // 3. Success state
        try {
          localStorage.setItem('preppilot_newsletter_subscribed', JSON.stringify({
            email: email,
            timestamp: new Date().toISOString()
          }));
        } catch (err) {
          console.warn('Could not persist newsletter email:', err);
        }

        if (emailInput) emailInput.value = '';
        if (consentCheckbox) consentCheckbox.checked = false;

        showThemeToast('✓ Welcome aboard! Weekly high-yield study dispatches will arrive at ' + email);
      });
    }

    // Smooth toast notification helper
    function showThemeToast(msg) {
      let toast = document.getElementById('site-toast') || document.getElementById('cockpit-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'theme-floating-toast';
        toast.style.cssText = [
          'position: fixed',
          'bottom: 24px',
          'right: 24px',
          'background: #0f172a',
          'color: #ffffff',
          'border: 1px solid rgba(255, 255, 255, 0.15)',
          'padding: 12px 20px',
          'border-radius: 999px',
          'font-size: 0.85rem',
          'font-weight: 600',
          'box-shadow: 0 10px 30px rgba(0,0,0,0.5)',
          'z-index: 99999',
          'transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          'transform: translateY(20px)',
          'opacity: 0',
          'pointer-events: none'
        ].join(';');
        document.body.appendChild(toast);
      }

      toast.textContent = msg;
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
      toast.classList.add('active');

      if (window._themeToastTimeout) clearTimeout(window._themeToastTimeout);
      window._themeToastTimeout = setTimeout(function () {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        toast.classList.remove('active');
      }, 4000);
    }

    function highlightError(element) {
      if (!element) return;
      element.style.transition = 'outline 0.15s ease, box-shadow 0.15s ease';
      element.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.5)';
      setTimeout(function () {
        element.style.boxShadow = '';
      }, 1800);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConductorTheme);
  } else {
    initConductorTheme();
  }
})();
