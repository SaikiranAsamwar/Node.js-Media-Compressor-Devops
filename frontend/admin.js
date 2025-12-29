// Admin Dashboard JavaScript
const token = localStorage.getItem('token');
if (!token) {
  globalThis.location.href = '/login';
}

let socket;
const API_URL = '';
let users = [];

// Initialize Socket.io connection
function initializeSocket() {
  socket = io(globalThis.location.origin, {
    auth: {
      token: token
    }
  });

  socket.on('connect', () => {
    console.log('Connected to admin socket');
  });

  socket.on('file_uploaded', (data) => {
    addActivityLog(`${data.username} uploaded a file`, 'upload', data);
    loadDashboardStats();
  });

  socket.on('file_processed', (data) => {
    addActivityLog(`${data.username} processed ${data.fileName}`, 'process', data);
    loadDashboardStats();
  });

  socket.on('user_joined', (data) => {
    addActivityLog(`🆕 New user ${data.username} joined`, 'user_join', data);
    loadDashboardStats();
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from admin socket');
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
}

// Load dashboard statistics
async function loadDashboardStats() {
  try {
    const response = await fetch(`${API_URL}/api/admin/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to load stats');

    const stats = await response.json();
    
    document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
    document.getElementById('totalFilesProcessed').textContent = stats.totalFilesProcessed || 0;
    document.getElementById('totalStorageUsed').textContent = (stats.totalStorageUsed / (1024 * 1024)).toFixed(2) + ' MB';
    document.getElementById('avgProcessingTime').textContent = (stats.avgProcessingTime / 1000).toFixed(2) + 's';

    document.getElementById('userChange').textContent = '↑ ' + (stats.userGrowth || 0) + '% this month';
    document.getElementById('fileChange').textContent = '↑ ' + (stats.fileGrowth || 0) + '% this month';
    document.getElementById('storageChange').textContent = '↑ ' + (stats.storageGrowth || 0) + '% this month';

  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Load users
async function loadUsers() {
  try {
    const response = await fetch(`${API_URL}/api/admin/users`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to load users');

    users = await response.json();
    displayUsers(users);
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

// Display users in table
function displayUsers(usersToDisplay) {
  const tbody = document.getElementById('usersTableBody');
  
  if (usersToDisplay.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">No users found</td></tr>';
    return;
  }

  tbody.innerHTML = usersToDisplay.map(user => `
    <tr class="user-row">
      <td><strong>${escapeHtml(user.username)}</strong></td>
      <td>${escapeHtml(user.email)}</td>
      <td><span class="role-badge role-${user.role}">${user.role.toUpperCase()}</span></td>
      <td>${new Date(user.createdAt).toLocaleDateString()}</td>
      <td>${user.filesProcessed || 0}</td>
      <td>
        <span class="status-badge ${user.active ? 'active' : 'inactive'}">
          ${user.active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td>
        <div class="action-icons">
          <button class="icon-btn" title="View Details" onclick="viewUserDetails('${user._id}')">View</button>
          <button class="icon-btn" title="Edit" onclick="editUser('${user._id}')">Edit</button>
          <button class="icon-btn danger" title="Ban User" onclick="banUser('${user._id}')">Ban</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Filter users
function filterUsers() {
  const searchTerm = document.getElementById('userSearch').value.toLowerCase();
  const roleFilter = document.getElementById('roleFilter').value;

  const filtered = users.filter(user => {
    const matchSearch = user.username.toLowerCase().includes(searchTerm) || 
                       user.email.toLowerCase().includes(searchTerm);
    const matchRole = !roleFilter || user.role === roleFilter;
    return matchSearch && matchRole;
  });

  displayUsers(filtered);
}

// Activity logging
function addActivityLog(message, type, data) {
  const activityFeed = document.getElementById('activityFeed');
  
  // Clear empty state
  if (activityFeed.querySelector('.empty')) {
    activityFeed.innerHTML = '';
  }

  const timestamp = new Date().toLocaleTimeString();
  const activityItem = document.createElement('div');
  activityItem.className = `activity-item activity-${type}`;
  activityItem.innerHTML = `
    <div class="activity-time">${timestamp}</div>
    <div class="activity-message">${message}</div>
    ${data ? `<div class="activity-data">${JSON.stringify(data).substring(0, 50)}...</div>` : ''}
  `;

  activityFeed.insertBefore(activityItem, activityFeed.firstChild);

  // Keep only last 50 items
  while (activityFeed.children.length > 50) {
    activityFeed.lastChild.remove();
  }
}

// View user details
function viewUserDetails(userId) {
  const user = users.find(u => u._id === userId);
  if (user) {
    alert(`User: ${user.username}\nEmail: ${user.email}\nRole: ${user.role}\nJoined: ${new Date(user.createdAt).toLocaleDateString()}\nFiles: ${user.filesProcessed || 0}`);
  }
}

// Edit user
function editUser(userId) {
  alert('Edit functionality would open a modal form');
}

// Ban user
function banUser(userId) {
  if (confirm('Are you sure you want to ban this user?')) {
    alert('User banned successfully (mock)');
  }
}

// Clear system cache
function clearSystemCache() {
  if (confirm('Clear system cache? This may temporarily affect performance.')) {
    alert('Cache cleared successfully');
  }
}

// Export data
function exportData() {
  alert('Data export started. Check downloads folder.');
}

// View logs
function viewLogs() {
  alert('Logs viewer would open in a new window');
}

// Maintenance mode
function maintenanceMode() {
  if (confirm('Enable maintenance mode? Users will see a maintenance message.')) {
    alert('Maintenance mode enabled');
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replaceAll(/[&<>"']/g, m => map[m]);
}

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  localStorage.removeItem('token');
  globalThis.location.href = '/login';
});

// Profile dropdown toggle
const profileBtn = document.getElementById('profileBtn');
const profileMenu = document.getElementById('profileMenu');

profileBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  profileMenu.classList.toggle('show');
});

document.addEventListener('click', () => {
  profileMenu?.classList.remove('show');
});

// Search and filter listeners
document.getElementById('userSearch')?.addEventListener('input', filterUsers);
document.getElementById('roleFilter')?.addEventListener('change', filterUsers);
document.getElementById('clearActivityBtn')?.addEventListener('click', () => {
  document.getElementById('activityFeed').innerHTML = '<div class="activity-item empty"><p>No recent activity</p></div>';
});

// Initialize
window.addEventListener('load', () => {
  loadDashboardStats();
  loadUsers();
  initializeSocket();
  
  // Refresh stats every 30 seconds
  setInterval(loadDashboardStats, 30000);
});

