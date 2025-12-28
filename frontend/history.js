// History Page JavaScript
const API_URL = 'http://localhost:5000';

// Check authentication
function checkAuth() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  
  if (!token || !user) {
    window.location.href = '/login';
    return null;
  }
  
  return { token, user };
}

// Initialize
const auth = checkAuth();
if (auth) {
  const username = auth.user.username;
  document.getElementById('navUsername').textContent = username;
  document.getElementById('userAvatar').textContent = username.charAt(0).toUpperCase();
}

// Profile dropdown
const profileBtn = document.getElementById('profileBtn');
const profileMenu = document.getElementById('profileMenu');

profileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  profileMenu.classList.toggle('show');
});

document.addEventListener('click', () => {
  profileMenu.classList.remove('show');
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
  } catch (error) {
    console.error('Logout error:', error);
  }
  
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
});

// Utility functions
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function getTypeIcon(type) {
  const icons = {
    'image-convert': 'IC',
    'image-compress': 'COM',
    'image-restore': 'RES',
    'pdf': 'PDF',
    'image': 'IMG'
  };
  return icons[type] || 'FILE';
}

function getTypeName(type) {
  const names = {
    'image-convert': 'Image Convert',
    'image-compress': 'Image Compress',
    'image-restore': 'Image Restore',
    'pdf': 'PDF Compress',
    'image': 'Image Process'
  };
  return names[type] || 'File Process';
}

// Load history
let allJobs = [];

async function loadHistory() {
  const historyContent = document.getElementById('historyContent');
  
  try {
    const response = await fetch(`${API_URL}/api/my-jobs`, {
      headers: {
        'Authorization': `Bearer ${auth.token}`
      },
      credentials: 'include'
    });
    
    if (!response.ok) throw new Error('Failed to load history');
    
    allJobs = await response.json();
    displayJobs(allJobs);
    
  } catch (error) {
    console.error('Error loading history:', error);
    historyContent.innerHTML = `
      <div class="error-message">
        <p>❌ Failed to load history</p>
        <button onclick="loadHistory()" class="btn btn-primary">Retry</button>
      </div>
    `;
  }
}

function displayJobs(jobs) {
  const historyContent = document.getElementById('historyContent');
  
  if (jobs.length === 0) {
    historyContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>No files processed yet</h3>
        <p>Start processing files to see your history here</p>
        <a href="dashboard.html" class="btn btn-primary">Go to Dashboard</a>
      </div>
    `;
    return;
  }
  
  historyContent.innerHTML = jobs.map(job => `
    <div class="history-item">
      <div class="history-icon">${getTypeIcon(job.type)}</div>
      <div class="history-details">
        <div class="history-title">${job.inputName}</div>
        <div class="history-meta">
          <span class="history-type">${getTypeName(job.type)}</span>
          <span class="history-date">${formatDate(job.createdAt)}</span>
        </div>
      </div>
      <div class="history-stats">
        <div class="stat-item">
          <span class="stat-label">Original:</span>
          <span class="stat-value">${formatFileSize(job.originalSize)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Processed:</span>
          <span class="stat-value">${formatFileSize(job.compressedSize)}</span>
        </div>
        <div class="stat-item savings">
          <span class="stat-label">Saved:</span>
          <span class="stat-value">${((job.originalSize - job.compressedSize) / job.originalSize * 100).toFixed(1)}%</span>
        </div>
      </div>
      <div class="history-actions">
        <a href="${API_URL}${job.outputPath}" download="${job.outputName}" class="btn btn-sm btn-success">
          Download
        </a>
      </div>
    </div>
  `).join('');
}

// Filter and search
document.getElementById('filterType').addEventListener('change', (e) => {
  const filterValue = e.target.value;
  const filtered = filterValue === 'all' 
    ? allJobs 
    : allJobs.filter(job => job.type === filterValue);
  displayJobs(filtered);
});

document.getElementById('searchHistory').addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const filtered = allJobs.filter(job => 
    job.inputName.toLowerCase().includes(searchTerm) ||
    job.outputName.toLowerCase().includes(searchTerm)
  );
  displayJobs(filtered);
});

// Load on page load
loadHistory();

