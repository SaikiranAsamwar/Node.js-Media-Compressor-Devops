// Common functionality for all pages

// Theme Management - Optimized to prevent flickering
let currentTheme = localStorage.getItem('theme') || 'auto';
let themeInitialized = false;
let eventListenersAttached = false;

// Early theme application (called before DOM ready to prevent flash)
function applyThemeEarly() {
  if (themeInitialized) return;
  
  const theme = localStorage.getItem('theme') || 'auto';
  const html = document.documentElement;
  
  if (theme === 'dark') {
    html.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    html.setAttribute('data-theme', 'light');
  } else {
    html.removeAttribute('data-theme');
  }
  
  currentTheme = theme;
  themeInitialized = true;
}

// Apply theme immediately on load to prevent flickering
applyThemeEarly();

// Initialize theme (only updates icon, theme already applied)
function initializeTheme() {
  if (!themeInitialized) {
    applyThemeEarly();
  }
  requestAnimationFrame(updateThemeToggleIcon);
}

// Apply theme with optimization
function applyTheme(theme) {
  const html = document.documentElement;
  
  // Use requestAnimationFrame to batch DOM changes
  requestAnimationFrame(() => {
    if (theme === 'dark') {
      html.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      html.setAttribute('data-theme', 'light');
    } else {
      html.removeAttribute('data-theme');
    }
    
    localStorage.setItem('theme', theme);
    currentTheme = theme;
    updateThemeToggleIcon();
  });
}

// Toggle theme
function toggleTheme() {
  let newTheme;
  if (currentTheme === 'light') {
    newTheme = 'dark';
  } else if (currentTheme === 'dark') {
    newTheme = 'auto';
  } else {
    newTheme = 'light';
  }
  
  applyTheme(newTheme);
}

// Update theme toggle icon - optimized to prevent reflow
function updateThemeToggleIcon() {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (!themeToggleBtn) return;
  
  const sunIcon = themeToggleBtn.querySelector('.sun-icon');
  const moonIcon = themeToggleBtn.querySelector('.moon-icon');
  
  if (!sunIcon || !moonIcon) return;
  
  // Determine which icon to show based on current theme and system preference
  let showDarkIcon = false;
  
  if (currentTheme === 'dark') {
    showDarkIcon = true;
  } else if (currentTheme === 'light') {
    showDarkIcon = false;
  } else {
    // Auto mode - check system preference
    showDarkIcon = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  
  // Use CSS classes instead of inline styles to prevent reflow
  if (showDarkIcon) {
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('hidden');
  } else {
    sunIcon.classList.remove('hidden');
    moonIcon.classList.add('hidden');
  }
}

// Profile dropdown toggle - optimized to prevent duplicate listeners
function setupProfileDropdown() {
  if (eventListenersAttached) return; // Prevent duplicate listeners
  
  const profileBtn = document.getElementById('profileBtn');
  const profileMenu = document.getElementById('profileMenu');
  
  if (profileBtn && profileMenu) {
    // Use named functions for easier cleanup if needed
    const toggleMenu = (e) => {
      e.stopPropagation();
      profileMenu.classList.toggle('show');
    };
    
    const closeMenu = () => {
      profileMenu.classList.remove('show');
    };
    
    profileBtn.addEventListener('click', toggleMenu, { once: false });
    document.addEventListener('click', closeMenu, { once: false });
  }
}

// Initialize user data in navbar
async function initializeNavUser() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      // Only redirect to login if we're not already on login or signup page
      const currentPage = window.location.pathname.split('/').pop();
      if (currentPage !== 'login.html' && currentPage !== 'signup.html' && currentPage !== 'index.html' && currentPage !== '') {
        console.log('→ Common: No token found, redirecting to login');
        window.location.href = '/login';
      }
      return;
    }

    console.log('→ Common: Authenticating user...');
    const response = await fetch('http://localhost:5000/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    console.log('→ Common: Auth response status:', response.status);

    if (response.ok) {
      const user = await response.json();
      console.log('✓ Common: User authenticated:', user.username);
      
      // Update navbar
      const navUsername = document.getElementById('navUsername');
      if (navUsername) {
        navUsername.textContent = user.username;
      }
      
      const avatar = document.getElementById('userAvatar');
      if (avatar) {
        if (user.profilePicture) {
          avatar.style.backgroundImage = `url(${user.profilePicture})`;
          avatar.style.backgroundSize = 'cover';
          avatar.style.backgroundPosition = 'center';
          avatar.textContent = '';
        } else {
          avatar.textContent = user.username.charAt(0).toUpperCase();
        }
      }
      
      // Dispatch event for page-specific handlers
      window.dispatchEvent(new CustomEvent('userAuthenticated', { 
        detail: user 
      }));
      
    } else {
      console.error('✗ Common: Auth failed with status:', response.status);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      const currentPage = window.location.pathname.split('/').pop();
      if (currentPage !== 'login.html' && currentPage !== 'signup.html' && currentPage !== 'index.html' && currentPage !== '') {
        console.log('→ Common: Invalid token, redirecting to login');
        window.location.href = '/login';
      }
    }
  } catch (error) {
    console.error('✗ Common: Error fetching user:', error);
    console.error('Error details:', error.message);
    // Don't redirect on network errors, but dispatch a failed event
    window.dispatchEvent(new CustomEvent('userAuthFailed', { 
      detail: error 
    }));
  }
}

// Logout function
function logout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
}

// Setup logout button
function setupLogoutButton() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
}

// Initialize everything on page load - optimized to prevent duplicate listeners
document.addEventListener('DOMContentLoaded', () => {
  if (eventListenersAttached) return; // Prevent re-initialization
  
  // Theme is already applied early, just update icon
  requestAnimationFrame(updateThemeToggleIcon);
  
  // Initialize components
  initializeNavUser();
  setupProfileDropdown();
  setupLogoutButton();
  
  // Setup theme toggle button - single listener
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme, { once: false });
  }
  
  // Listen for system theme changes when in auto mode - single listener
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemThemeChange = () => {
    if (currentTheme === 'auto') {
      requestAnimationFrame(updateThemeToggleIcon);
    }
  };
  
  // Modern browsers
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleSystemThemeChange);
  } else {
    // Fallback for older browsers
    mediaQuery.addListener(handleSystemThemeChange);
  }
  
  eventListenersAttached = true;
  
  // Remove loading class to show content smoothly
  document.body.classList.remove('loading');
});

// Export functions for use in other scripts
window.initializeTheme = initializeTheme;
window.applyTheme = applyTheme;
window.toggleTheme = toggleTheme;
window.logout = logout;

