import Notification from '@typo3/backend/notification.js';
import Icons from '@typo3/backend/icons.js';

/**
 * Stateless helper functions shared across the workspace board components.
 */

// Escape a string for safe insertion into HTML.
export function escapeHtml(text) {
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}

// Build up-to-two-letter uppercase initials from a name.
export function getInitials(name) {
  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .substring(0, 2)
}

// Format a date value as "YYYY-MM-DD HH:mm".
export function formatDate(dateString) {
  const date = new Date(dateString)
  const pad = (n) => String(n).padStart(2, '0');
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// Map a card type to its Font Awesome icon class.
export function getTypeIcon(type) {
  const icons = {
    content: "fas fa-file-text",
    page: "fas fa-globe",
    template: "fas fa-layout",
    news: "fas fa-newspaper",
    form: "fas fa-wpforms",
  }
  return icons[type] || "fas fa-file"
}

// Debounce a function by the given wait in milliseconds.
export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Convert a TYPO3 "YYYY-MM-DD HH:mm" date string to an ISO string.
export function convertWorkspaceDate(dateString) {
  if (!dateString) return new Date().toISOString();

  try {
    // TYPO3 format is usually "YYYY-MM-DD HH:mm"
    const [datePart, timePart] = dateString.split(' ');
    const [year, month, day] = datePart.split('-');
    const [hour, minute] = timePart ? timePart.split(':') : ['00', '00'];

    const date = new Date(year, month - 1, day, hour, minute);
    return date.toISOString();
  } catch (error) {
    return new Date().toISOString();
  }
}

// Extract the last path segment of a TYPO3 page path as a readable name.
export function extractPageNameFromPath(path) {
  if (!path) return 'Home';

  const parts = path.split('/').filter(part => part.length > 0);
  return parts.length > 0 ? parts[parts.length - 1] : 'Home';
}

// Render a TYPO3 icon by identifier, replacing the placeholder once resolved.
export function renderT3Icon(iconIdentifier) {
  if (!iconIdentifier) {
    return '<span class="t3js-icon icon icon-size-small icon-state-default"><span class="icon-markup">🌐</span></span>';
  }
  // Use a placeholder that will be replaced by the actual icon
  const placeholderId = `icon-${iconIdentifier.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  // Fetch and inject the icon asynchronously
  setTimeout(() => {
    Icons.getIcon(iconIdentifier, Icons.sizes.small).then((iconMarkup) => {
      const placeholder = document.getElementById(placeholderId);
      if (placeholder) {
        placeholder.outerHTML = iconMarkup;
      }
    }).catch(() => {
      // Fallback on error
      const placeholder = document.getElementById(placeholderId);
      if (placeholder) {
        placeholder.outerHTML = '<span class="t3js-icon icon icon-size-small icon-state-default"><span class="icon-markup">🌐</span></span>';
      }
    });
  }, 0);
  return `<span id="${placeholderId}" class="t3js-icon icon icon-size-small icon-state-default"><span class="icon-markup">🌐</span></span>`;
}

// Show the board loading overlay, if present.
export function showLoading() {
  const overlay = document.getElementById("loadingOverlay")
  if (overlay) {
    overlay.style.display = "flex"
  }
}

// Hide the board loading overlay, if present.
export function hideLoading() {
  const overlay = document.getElementById("loadingOverlay")
  if (overlay) {
    overlay.style.display = "none"
  }
}

// Surface a message through the TYPO3 Notification API.
export function showToast(message, type = "info", duration = 5000) {
  // Map custom types to TYPO3 Notification severities
  const severityMap = {
    'success': 1, // OK
    'info': 0,    // INFO
    'warning': 2, // WARNING
    'error': 3    // ERROR
  };

  const severity = severityMap[type] || 0;
  const durationInSeconds = Math.floor(duration / 1000);

  if (typeof Notification !== 'undefined') {
    // Use TYPO3 Notification API
    switch (severity) {
      case 1: // success
        Notification.success('', message, durationInSeconds);
        break;
      case 2: // warning
        Notification.warning('', message, durationInSeconds);
        break;
      case 3: // error
        Notification.error('', message, durationInSeconds);
        break;
      default: // info
        Notification.info('', message, durationInSeconds);
    }
  }
}
