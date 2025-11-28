// Pricing Page JavaScript
const API_URL = 'http://localhost:3000';

// Check authentication
function checkAuth() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  
  if (!token || !user) {
    window.location.href = 'login.html';
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
  window.location.href = 'login.html';
});
