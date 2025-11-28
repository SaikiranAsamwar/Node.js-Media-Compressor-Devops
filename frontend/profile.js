// Check authentication
const token = localStorage.getItem('token');
if (!token) {
  window.location.href = 'login.html';
}

let userData = null;

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

// Load user data
async function loadUserData() {
  try {
    const response = await fetch('/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
        return;
      }
      throw new Error('Failed to load user data');
    }

    userData = await response.json();
    displayUserData(userData);
    await loadStatistics();
  } catch (error) {
    console.error('Error loading user data:', error);
    showMessage('error', 'Failed to load user data');
  }
}

// Display user data
function displayUserData(user) {
  // Update navbar
  const navUsername = document.getElementById('navUsername');
  const userAvatar = document.getElementById('userAvatar');
  
  if (navUsername) navUsername.textContent = user.username;
  if (userAvatar) {
    if (user.profilePicture) {
      userAvatar.innerHTML = `<img src="http://localhost:3000${user.profilePicture}" alt="${user.username}">`;
    } else {
      userAvatar.textContent = user.username.charAt(0).toUpperCase();
    }
  }

  // Update profile display
  document.getElementById('displayUsername').textContent = user.username;
  document.getElementById('inputUsername').value = user.username;
  
  document.getElementById('displayEmail').textContent = user.email;
  document.getElementById('inputEmail').value = user.email;
  
  // Update account type badge
  const accountType = document.getElementById('accountType');
  accountType.textContent = user.role === 'admin' ? 'Admin' : 'Free';
  accountType.className = user.role === 'admin' ? 'badge badge-admin' : 'badge';
  
  // Update member since
  const memberDate = new Date(user.createdAt);
  document.getElementById('memberSince').textContent = memberDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Calculate membership days
  const daysSince = Math.floor((Date.now() - memberDate.getTime()) / (1000 * 60 * 60 * 24));
  document.getElementById('membershipDays').textContent = daysSince;

  // Update profile avatar
  const avatarInitial = document.getElementById('avatarInitial');
  const profileImage = document.getElementById('profileImage');
  
  if (user.profilePicture) {
    profileImage.src = `http://localhost:3000${user.profilePicture}`;
    profileImage.classList.remove('hidden');
    avatarInitial.classList.add('hidden');
  } else {
    avatarInitial.textContent = user.username.charAt(0).toUpperCase();
  }

  // Update Google connection status
  if (user.googleId) {
    document.getElementById('googleStatus').textContent = 'Connected';
    document.getElementById('connectGoogleBtn').textContent = 'Disconnect';
    document.getElementById('connectGoogleBtn').className = 'btn btn-sm btn-outline';
  }
}

// Load user statistics
async function loadStatistics() {
  try {
    const response = await fetch('http://localhost:3000/api/my-jobs', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to load statistics');

    const jobs = await response.json();
    
    // Calculate statistics
    const totalFiles = jobs.length;
    const totalSaved = jobs.reduce((sum, job) => {
      const saved = job.originalSize - job.compressedSize;
      return sum + (saved > 0 ? saved : 0);
    }, 0);

    // Files this month
    const now = new Date();
    const thisMonth = jobs.filter(job => {
      const jobDate = new Date(job.createdAt);
      return jobDate.getMonth() === now.getMonth() && jobDate.getFullYear() === now.getFullYear();
    }).length;

    // Update display
    document.getElementById('totalFilesProcessed').textContent = totalFiles;
    document.getElementById('totalSpaceSaved').textContent = (totalSaved / (1024 * 1024)).toFixed(2) + ' MB';
    document.getElementById('filesThisMonth').textContent = thisMonth;
  } catch (error) {
    console.error('Error loading statistics:', error);
  }
}

// Edit field (make it global)
window.editField = function(field) {
  document.querySelector(`#display${field.charAt(0).toUpperCase() + field.slice(1)}`).parentElement.classList.add('hidden');
  document.getElementById(`edit${field.charAt(0).toUpperCase() + field.slice(1)}`).classList.remove('hidden');
}

// Cancel edit (make it global)
window.cancelEdit = function(field) {
  document.getElementById(`edit${field.charAt(0).toUpperCase() + field.slice(1)}`).classList.add('hidden');
  document.querySelector(`#display${field.charAt(0).toUpperCase() + field.slice(1)}`).parentElement.classList.remove('hidden');
  
  // Reset input value
  if (field === 'username') {
    document.getElementById('inputUsername').value = userData.username;
  } else if (field === 'email') {
    document.getElementById('inputEmail').value = userData.email;
  }
}

// Save field (make it global)
window.saveField = async function(field) {
  const value = document.getElementById(`input${field.charAt(0).toUpperCase() + field.slice(1)}`).value.trim();
  
  if (!value) {
    showMessage('error', `${field.charAt(0).toUpperCase() + field.slice(1)} cannot be empty`);
    return;
  }

  if (field === 'email' && !isValidEmail(value)) {
    showMessage('error', 'Please enter a valid email address');
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ [field]: value })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update profile');
    }

    // Update local data
    userData[field] = value;
    document.getElementById(`display${field.charAt(0).toUpperCase() + field.slice(1)}`).textContent = value;
    
    if (field === 'username') {
      document.getElementById('navUsername').textContent = value;
      document.getElementById('userAvatar').textContent = value.charAt(0).toUpperCase();
      document.getElementById('avatarInitial').textContent = value.charAt(0).toUpperCase();
    }

    cancelEdit(field);
    showMessage('success', `${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully`);
  } catch (error) {
    console.error('Error updating profile:', error);
    showMessage('error', error.message);
  }
}

// Validate email
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Change photo
document.getElementById('changePhotoBtn')?.addEventListener('click', () => {
  document.getElementById('photoInput').click();
});

document.getElementById('photoInput')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    showMessage('error', 'Please select an image file');
    return;
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    showMessage('error', 'Image size must be less than 5MB');
    return;
  }

  const formData = new FormData();
  formData.append('profilePicture', file);

  try {
    const response = await fetch('http://localhost:3000/api/profile/picture', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to upload profile picture');
    }

    // Update profile picture display
    const profileImage = document.getElementById('profileImage');
    const avatarInitial = document.getElementById('avatarInitial');
    const userAvatar = document.getElementById('userAvatar');

    profileImage.src = `http://localhost:3000${data.profilePicture}`;
    profileImage.classList.remove('hidden');
    avatarInitial.classList.add('hidden');
    
    if (userAvatar) {
      userAvatar.innerHTML = `<img src="http://localhost:3000${data.profilePicture}" alt="${userData.username}">`;
    }

    userData.profilePicture = data.profilePicture;
    showMessage('success', 'Profile picture updated successfully');
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    showMessage('error', error.message);
  }
});

// Change password
document.getElementById('changePasswordForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  // Validate passwords match
  if (newPassword !== confirmPassword) {
    showPasswordMessage('error', 'New passwords do not match');
    return;
  }

  // Validate password length
  if (newPassword.length < 6) {
    showPasswordMessage('error', 'Password must be at least 6 characters long');
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/api/profile/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to change password');
    }

    // Clear form
    document.getElementById('changePasswordForm').reset();
    showPasswordMessage('success', 'Password changed successfully');
  } catch (error) {
    console.error('Error changing password:', error);
    showPasswordMessage('error', error.message);
  }
});

// Connect/disconnect Google
document.getElementById('connectGoogleBtn')?.addEventListener('click', async () => {
  if (userData.googleId) {
    // Disconnect Google
    if (!confirm('Are you sure you want to disconnect your Google account?')) return;
    
    try {
      const response = await fetch('http://localhost:3000/api/profile/disconnect-google', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to disconnect Google account');

      userData.googleId = null;
      document.getElementById('googleStatus').textContent = 'Not connected';
      document.getElementById('connectGoogleBtn').textContent = 'Connect';
      document.getElementById('connectGoogleBtn').className = 'btn btn-sm btn-primary';
      
      showMessage('success', 'Google account disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting Google:', error);
      showMessage('error', 'Failed to disconnect Google account');
    }
  } else {
    // Connect Google
    window.location.href = 'http://localhost:3000/auth/google';
  }
});

// Clear history (make it global)
window.clearHistory = async function() {
  if (!confirm('Are you sure you want to clear all your file history? This action cannot be undone.')) {
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/api/clear-history', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to clear history');

    showMessage('success', 'History cleared successfully');
    await loadStatistics(); // Refresh statistics
  } catch (error) {
    console.error('Error clearing history:', error);
    showMessage('error', 'Failed to clear history');
  }
}

// Delete account (make it global)
window.deleteAccount = async function() {
  const confirmation = prompt('This will permanently delete your account and all data. Type "DELETE" to confirm:');
  
  if (confirmation !== 'DELETE') {
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/api/profile', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to delete account');

    localStorage.removeItem('token');
    alert('Your account has been deleted successfully');
    window.location.href = 'login.html';
  } catch (error) {
    console.error('Error deleting account:', error);
    showMessage('error', 'Failed to delete account');
  }
}

// Show message
function showMessage(type, message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message message-${type}`;
  messageDiv.textContent = message;
  messageDiv.style.cssText = 'position: fixed; top: 80px; right: 20px; z-index: 1000; padding: 12px 20px; border-radius: 8px; font-size: 14px; animation: slideIn 0.3s ease;';
  
  if (type === 'success') {
    messageDiv.style.background = '#10b981';
    messageDiv.style.color = 'white';
  } else {
    messageDiv.style.background = '#ef4444';
    messageDiv.style.color = 'white';
  }

  document.body.appendChild(messageDiv);

  setTimeout(() => {
    messageDiv.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => messageDiv.remove(), 300);
  }, 3000);
}

// Show password message
function showPasswordMessage(type, message) {
  const messageDiv = document.getElementById('passwordMessage');
  messageDiv.textContent = message;
  messageDiv.className = `message ${type === 'success' ? 'success-message' : 'error-message'}`;
  messageDiv.classList.remove('hidden');

  setTimeout(() => {
    messageDiv.classList.add('hidden');
  }, 3000);
}

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  localStorage.removeItem('token');
  window.location.href = 'login.html';
});

// Initialize
loadUserData();
