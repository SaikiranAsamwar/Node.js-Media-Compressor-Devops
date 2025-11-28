// Dashboard JavaScript
const API_URL = 'http://localhost:3000';

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }
  
  // Fetch user data and update dashboard username
  try {
    const response = await fetch('/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const user = await response.json();
      const dashboardUsername = document.getElementById('dashboardUsername');
      if (dashboardUsername) {
        dashboardUsername.textContent = user.username;
      }
      
      // Load user stats
      loadUserStats(token);
    } else {
      localStorage.removeItem('token');
      window.location.href = 'login.html';
    }
  } catch (error) {
    console.error('Error initializing dashboard:', error);
  }
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
