// Theme Management
const API_URL = 'http://localhost:3000';
let currentTheme = localStorage.getItem('theme') || 'auto';

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', () => {
  // Check token first
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login';
    return;
  }
  
  initializeTheme();
  initializeSettings();
  setupEventListeners();
});

// User auth is handled by common.js, no need to duplicate

// Initialize theme
function initializeTheme() {
  currentTheme = localStorage.getItem('theme') || 'auto';
  applyTheme(currentTheme);
  updateThemeButtons();
}

// Apply theme
function applyTheme(theme) {
  const html = document.documentElement;
  
  if (theme === 'dark') {
    html.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    html.setAttribute('data-theme', 'light');
  } else {
    html.removeAttribute('data-theme');
  }
  
  localStorage.setItem('theme', theme);
  currentTheme = theme;
}

// Update theme button states
function updateThemeButtons() {
  const buttons = document.querySelectorAll('.theme-option-btn');
  buttons.forEach(btn => {
    if (btn.dataset.theme === currentTheme) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Initialize settings from localStorage
function initializeSettings() {
  // Load saved settings
  const settings = {
    defaultQuality: localStorage.getItem('defaultQuality') || 'medium',
    autoDownload: localStorage.getItem('autoDownload') === 'true',
    keepOriginal: localStorage.getItem('keepOriginal') !== 'false',
    emailNotifications: localStorage.getItem('emailNotifications') !== 'false',
    compressionAlerts: localStorage.getItem('compressionAlerts') !== 'false'
  };

  // Apply settings to UI
  document.getElementById('defaultQuality').value = settings.defaultQuality;
  document.getElementById('autoDownload').checked = settings.autoDownload;
  document.getElementById('keepOriginal').checked = settings.keepOriginal;
  document.getElementById('emailNotifications').checked = settings.emailNotifications;
  document.getElementById('compressionAlerts').checked = settings.compressionAlerts;
}

// Setup event listeners
function setupEventListeners() {
  // Profile dropdown
  const profileBtn = document.getElementById('profileBtn');
  const profileMenu = document.getElementById('profileMenu');
  
  if (profileBtn && profileMenu) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      profileMenu.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      profileMenu.classList.remove('show');
    });
  }

  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  // Theme toggle buttons
  const themeButtons = document.querySelectorAll('.theme-option-btn');
  themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      applyTheme(theme);
      updateThemeButtons();
      showNotification('Theme updated successfully', 'success');
    });
  });

  // Settings change listeners
  const settingsInputs = document.querySelectorAll('#defaultQuality, #autoDownload, #keepOriginal, #emailNotifications, #compressionAlerts');
  settingsInputs.forEach(input => {
    input.addEventListener('change', () => {
      // Auto-save on change
      const saveBtn = document.querySelector('.settings-actions .btn-primary');
      if (saveBtn) {
        saveBtn.classList.add('unsaved-changes');
      }
    });
  });
}

// Save settings
async function saveSettings() {
  try {
    const settings = {
      defaultQuality: document.getElementById('defaultQuality').value,
      autoDownload: document.getElementById('autoDownload').checked,
      keepOriginal: document.getElementById('keepOriginal').checked,
      emailNotifications: document.getElementById('emailNotifications').checked,
      compressionAlerts: document.getElementById('compressionAlerts').checked
    };

    // Save to localStorage
    Object.keys(settings).forEach(key => {
      localStorage.setItem(key, settings[key]);
    });

    // Save to backend
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/api/user/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(settings)
    });

    if (response.ok) {
      showNotification('Settings saved successfully!', 'success');
      const saveBtn = document.querySelector('.settings-actions .btn-primary');
      if (saveBtn) {
        saveBtn.classList.remove('unsaved-changes');
      }
    } else {
      throw new Error('Failed to save settings');
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    showNotification('Failed to save settings. Please try again.', 'error');
  }
}

// Reset settings to default
function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to default?')) {
    document.getElementById('defaultQuality').value = 'medium';
    document.getElementById('autoDownload').checked = false;
    document.getElementById('keepOriginal').checked = true;
    document.getElementById('emailNotifications').checked = true;
    document.getElementById('compressionAlerts').checked = true;
    
    applyTheme('auto');
    updateThemeButtons();
    
    showNotification('Settings reset to default', 'success');
  }
}

// Clear all history
async function clearAllHistory() {
  if (!confirm('Are you sure you want to clear all your compression history? This action cannot be undone.')) {
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/api/history`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      showNotification('History cleared successfully!', 'success');
    } else {
      throw new Error('Failed to clear history');
    }
  } catch (error) {
    console.error('Error clearing history:', error);
    showNotification('Failed to clear history. Please try again.', 'error');
  }
}

// Delete account
async function deleteAccount() {
  const confirmation = prompt('This will permanently delete your account and all data. Type "DELETE" to confirm:');
  
  if (confirmation !== 'DELETE') {
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/api/user/account`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      localStorage.clear();
      showNotification('Account deleted successfully', 'success');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } else {
      throw new Error('Failed to delete account');
    }
  } catch (error) {
    console.error('Error deleting account:', error);
    showNotification('Failed to delete account. Please try again.', 'error');
  }
}

// Export data
async function exportData() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/api/user/export`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `filecompressor-data-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showNotification('Data exported successfully!', 'success');
    } else {
      throw new Error('Failed to export data');
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    showNotification('Failed to export data. Please try again.', 'error');
  }
}

// Logout
function logout() {
  localStorage.removeItem('token');
  showNotification('Logged out successfully', 'success');
  setTimeout(() => {
    window.location.href = '/login';
  }, 1000);
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#4f46e5'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

