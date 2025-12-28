// ============================================
// DASHBOARD PAGE
// ============================================
const API_URL = 'http://localhost:5000';

// Wait for common.js to complete authentication
window.addEventListener('userAuthenticated', (event) => {
  console.log('→ Dashboard: User authenticated event received');
  const user = event.detail;
  
  // Update dashboard username
  const dashboardUsername = document.getElementById('dashboardUsername');
  if (dashboardUsername && user) {
    dashboardUsername.textContent = user.username;
    console.log('✓ Dashboard username set:', user.username);
  }
  
  // Load user stats
  const token = localStorage.getItem('token');
  if (token) {
    loadUserStats(token);
  }
});

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
  console.log('→ Dashboard: Page loaded');
  
  // Check if user is already authenticated (from common.js)
  const token = localStorage.getItem('token');
  if (!token) {
    console.log('✗ Dashboard: No token, redirecting to login');
    window.location.href = '/login';
    return;
  }
  
  console.log('✓ Dashboard: Token exists');
  
  // Fallback: If event doesn't fire in 2 seconds, try direct auth
  setTimeout(async () => {
    const dashboardUsername = document.getElementById('dashboardUsername');
    if (dashboardUsername && !dashboardUsername.textContent) {
      console.log('→ Dashboard: Event timeout, fetching user directly...');
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (response.ok) {
          const user = await response.json();
          dashboardUsername.textContent = user.username;
          loadUserStats(token);
          console.log('✓ Dashboard: Fallback auth successful');
        } else {
          console.error('✗ Dashboard: Fallback auth failed');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('✗ Dashboard: Fallback auth error:', error);
      }
    }
  }, 2000);
});

// Load user statistics
async function loadUserStats(token) {
  try {
    const response = await fetch(`${API_URL}/api/my-jobs`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include'
    });
    
    if (!response.ok) throw new Error('Failed to load stats');
    
    const jobs = await response.json();
    
    // Calculate stats
    const totalFiles = jobs.length;
    const totalSaved = jobs.reduce((sum, job) => {
      return sum + (job.originalSize - job.compressedSize);
    }, 0);
    const totalSavedMB = (totalSaved / (1024 * 1024)).toFixed(2);
    
    // Update UI
    const totalFilesEl = document.getElementById('totalFiles');
    const totalSavedEl = document.getElementById('totalSaved');
    const successRateEl = document.getElementById('successRate');
    
    if (totalFilesEl) totalFilesEl.textContent = totalFiles;
    if (totalSavedEl) totalSavedEl.textContent = totalSavedMB + ' MB';
    
    // Calculate success rate (all jobs are successful if they exist)
    const successRate = totalFiles > 0 ? 100 : 0;
    if (successRateEl) successRateEl.textContent = successRate + '%';
    
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

