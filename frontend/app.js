// Main Application JavaScript
const API_URL = '';

// Check authentication
function checkAuth() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  
  if (!token || !user) {
    globalThis.location.href = '/login';
    return null;
  }
  
  return { token, user };
}

// Handle card filtering based on URL hash - optimized to prevent layout shifts
function handleCardFiltering() {
  const hash = globalThis.location.hash.substring(1);
  const cards = document.querySelectorAll('.card[data-card]');
  
  // Update page title based on hash
  const titles = {
    'converter': 'Image Converter - Convert Between Formats | FileCompressor Pro',
    'compressor': 'Image Compressor - Reduce File Size | FileCompressor Pro',
    'restore': 'Image Restore - Enhance Quality | FileCompressor Pro',
    'pdf': 'PDF Compressor - Reduce PDF Size | FileCompressor Pro'
  };
  
  // Update hero section based on hash
  const heroContent = {
    'converter': {
      title: 'Image Format Converter',
      subtitle: 'Convert images between JPG, PNG, WebP, and AVIF formats'
    },
    'compressor': {
      title: 'Image Compressor',
      subtitle: 'Reduce image file sizes while maintaining quality'
    },
    'restore': {
      title: 'Image Restore',
      subtitle: 'Enhance and restore compressed images to better quality'
    },
    'pdf': {
      title: 'PDF Compressor',
      subtitle: 'Compress PDF documents and reduce file size'
    }
  };
  
  const heroTitle = document.getElementById('heroTitle');
  const heroSubtitle = document.getElementById('heroSubtitle');
  
  // Use requestAnimationFrame to batch DOM updates
  requestAnimationFrame(() => {
    if (hash && titles[hash]) {
      document.title = titles[hash];
      if (heroTitle && heroContent[hash]) {
        heroTitle.textContent = heroContent[hash].title;
        heroSubtitle.textContent = heroContent[hash].subtitle;
      }
    } else {
      document.title = 'File Tools - FileCompressor Pro';
      if (heroTitle) {
        heroTitle.textContent = 'Compress & Convert Files';
        heroSubtitle.textContent = 'Simple, fast, and professional file compression';
      }
    }
    
    if (hash && cards.length > 0) {
      // Hide all cards
      cards.forEach(card => {
        card.style.display = 'none';
      });
      
      // Show only the selected card
      const selectedCard = document.getElementById(`card-${hash}`);
      if (selectedCard) {
        selectedCard.style.display = 'block';
        // Smooth scroll to the card
        selectedCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      // Show all cards if no hash
      cards.forEach(card => {
        card.style.display = 'block';
      });
    }
  });
}

// Call on page load and hash change
globalThis.addEventListener('load', handleCardFiltering);
globalThis.addEventListener('hashchange', handleCardFiltering);

// Initialize app - auth check only, UI handled by common.js
const auth = checkAuth();

// NOTE: Profile dropdown, logout, and theme toggle are handled by common.js
// No duplicate event listeners needed here

// Utility functions
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function calculateSavings(original, compressed) {
  const savings = ((original - compressed) / original * 100).toFixed(1);
  return savings + '%';
}

// Image Converter Handler
class ImageConverter {
  file = null;
  fileFormat = null;
  downloadUrl = null;
  filename = null;
  
  constructor() {
    
    // Elements
    this.dropZone = document.getElementById('convertDropZone');
    this.input = document.getElementById('convertInput');
    this.fileInfo = document.getElementById('convertFileInfo');
    this.formatInfo = document.getElementById('convertFormatInfo');
    this.formatSelect = document.getElementById('convertFormat');
    this.progress = document.getElementById('convertProgress');
    this.progressFill = document.getElementById('convertProgressFill');
    this.result = document.getElementById('convertResult');
    this.downloadBtn = document.getElementById('convertDownloadBtn');
    this.convertBtn = document.getElementById('convertBtn');
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    this.dropZone.addEventListener('click', () => this.input.click());
    this.input.addEventListener('change', (e) => {
      if (e.target.files.length > 0) this.handleFile(e.target.files[0]);
    });
    
    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropZone.classList.add('dragover');
    });
    
    this.dropZone.addEventListener('dragleave', () => {
      this.dropZone.classList.remove('dragover');
    });
    
    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) this.handleFile(e.dataTransfer.files[0]);
    });
    
    this.convertBtn.addEventListener('click', () => this.convert());
    this.downloadBtn.addEventListener('click', () => this.download());
  }
  
  handleFile(file) {
    this.file = file;
    
    // Detect file format
    const ext = file.name.split('.').pop().toLowerCase();
    this.fileFormat = ext === 'jpg' ? 'jpeg' : ext;
    
    this.fileInfo.textContent = `${file.name} (${formatFileSize(file.size)})`;
    this.fileInfo.classList.remove('hidden');
    
    this.formatInfo.textContent = `Current format: ${this.fileFormat.toUpperCase()}`;
    this.formatInfo.classList.remove('hidden');
    
    // Populate format options (exclude current format)
    this.populateFormats();
    
    this.convertBtn.disabled = false;
    this.result.classList.add('hidden');
  }
  
  populateFormats() {
    const formats = [
      { value: 'jpeg', label: 'JPEG' },
      { value: 'png', label: 'PNG' },
      { value: 'webp', label: 'WebP' },
      { value: 'avif', label: 'AVIF' }
    ];
    
    this.formatSelect.innerHTML = '<option value="">Select format...</option>';
    
    formats.forEach(format => {
      if (format.value !== this.fileFormat) {
        const option = document.createElement('option');
        option.value = format.value;
        option.textContent = format.label;
        this.formatSelect.appendChild(option);
      }
    });
  }
  
  async convert() {
    if (!this.file || !this.formatSelect.value) {
      alert('Please select an output format');
      return;
    }
    
    this.convertBtn.disabled = true;
    this.convertBtn.textContent = 'Converting...';
    this.progress.classList.remove('hidden');
    this.progressFill.style.width = '0%';
    this.result.classList.add('hidden');
    
    const formData = new FormData();
    formData.append('file', this.file);
    formData.append('format', this.formatSelect.value);
    formData.append('level', 'maximum'); // Use best quality for conversion
    
    try {
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 5;
        if (progress <= 90) this.progressFill.style.width = progress + '%';
      }, 100);
      
      const response = await fetch(`${API_URL}/api/upload-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${auth.token}` },
        credentials: 'include',
        body: formData
      });
      
      clearInterval(progressInterval);
      this.progressFill.style.width = '100%';
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Conversion failed');
      }
      
      const data = await response.json();
      this.downloadUrl = `${API_URL}${data.downloadUrl}`;
      this.filename = data.filename;
      
      document.getElementById('convertOriginalSize').textContent = formatFileSize(data.originalSize);
      document.getElementById('convertConvertedSize').textContent = formatFileSize(data.compressedSize);
      document.getElementById('convertNewFormat').textContent = this.formatSelect.value.toUpperCase();
      
      setTimeout(() => {
        this.progress.classList.add('hidden');
        this.result.classList.remove('hidden');
        this.convertBtn.disabled = false;
        this.convertBtn.textContent = 'Convert Format';
        loadHistory();
      }, 500);
      
    } catch (error) {
      console.error('Conversion error:', error);
      alert('Error: ' + error.message);
      this.convertBtn.disabled = false;
      this.convertBtn.textContent = 'Convert Format';
      this.progress.classList.add('hidden');
    }
  }
  
  download() {
    if (!this.downloadUrl) return;
    const a = document.createElement('a');
    a.href = this.downloadUrl;
    a.download = this.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

// Image Compressor Handler
class ImageCompressor {
  file = null;
  downloadUrl = null;
  filename = null;
  
  constructor() {
    
    // Elements
    this.dropZone = document.getElementById('imageDropZone');
    this.input = document.getElementById('imageInput');
    this.fileInfo = document.getElementById('imageFileInfo');
    this.levelSelect = document.getElementById('imageLevel');
    this.progress = document.getElementById('imageProgress');
    this.progressFill = document.getElementById('imageProgressFill');
    this.result = document.getElementById('imageResult');
    this.downloadBtn = document.getElementById('imageDownloadBtn');
    this.compressBtn = document.getElementById('imageCompressBtn');
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    this.dropZone.addEventListener('click', () => this.input.click());
    this.input.addEventListener('change', (e) => {
      if (e.target.files.length > 0) this.handleFile(e.target.files[0]);
    });
    
    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropZone.classList.add('dragover');
    });
    
    this.dropZone.addEventListener('dragleave', () => {
      this.dropZone.classList.remove('dragover');
    });
    
    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) this.handleFile(e.dataTransfer.files[0]);
    });
    
    this.compressBtn.addEventListener('click', () => this.compress());
    this.downloadBtn.addEventListener('click', () => this.download());
  }
  
  handleFile(file) {
    this.file = file;
    this.fileInfo.textContent = `${file.name} (${formatFileSize(file.size)})`;
    this.fileInfo.classList.remove('hidden');
    this.compressBtn.disabled = false;
    this.result.classList.add('hidden');
  }
  
  async compress() {
    if (!this.file) return;
    
    this.compressBtn.disabled = true;
    this.compressBtn.textContent = 'Analyzing...';
    
    // Hide old results, show estimate
    document.getElementById('imageResult').classList.add('hidden');
    document.getElementById('imageEstimate').classList.remove('hidden');
    
    const formData = new FormData();
    formData.append('file', this.file);
    formData.append('level', this.levelSelect.value);
    
    try {
      // Show estimated size (calculate on frontend for immediate feedback)
      const level = this.levelSelect.value;
      const reductions = { low: 70, medium: 50, high: 30, maximum: 0 };
      const estimatedReduction = reductions[level] || 50;
      const estimatedSize = this.file.size * (1 - estimatedReduction / 100);
      
      document.getElementById('imageEstimatedSize').textContent = formatFileSize(estimatedSize);
      document.getElementById('imageEstimatedReduction').textContent = estimatedReduction;
      
      // Start compression
      this.compressBtn.textContent = 'Compressing...';
      this.progress.classList.remove('hidden');
      this.progressFill.style.width = '0%';
      
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 5;
        if (progress <= 90) this.progressFill.style.width = progress + '%';
      }, 100);
      
      const response = await fetch(`${API_URL}/api/compress-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${auth.token}` },
        credentials: 'include',
        body: formData
      });
      
      clearInterval(progressInterval);
      this.progressFill.style.width = '100%';
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Compression failed');
      }
      
      const data = await response.json();
      this.downloadUrl = `${API_URL}${data.downloadUrl}`;
      this.filename = data.filename;
      
      document.getElementById('imageOriginalSize').textContent = formatFileSize(data.originalSize);
      document.getElementById('imageCompressedSize').textContent = formatFileSize(data.compressedSize);
      document.getElementById('imageSavings').textContent = data.actualReduction + '%';
      document.getElementById('imageAccuracy').textContent = data.accuracyPercent || '95.0';
      
      setTimeout(() => {
        this.progress.classList.add('hidden');
        document.getElementById('imageEstimate').classList.add('hidden');
        document.getElementById('imageResult').classList.remove('hidden');
        this.compressBtn.disabled = false;
        this.compressBtn.textContent = 'Compress Image';
        loadHistory();
      }, 500);
      
    } catch (error) {
      console.error('Compression error:', error);
      alert('Error: ' + error.message);
      this.compressBtn.disabled = false;
      this.compressBtn.textContent = 'Compress Image';
      this.progress.classList.add('hidden');
      document.getElementById('imageEstimate').classList.add('hidden');
    }
  }
  
  download() {
    if (!this.downloadUrl) return;
    const a = document.createElement('a');
    a.href = this.downloadUrl;
    a.download = this.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

// Image Restorer Handler (Reverse Compression)
class ImageRestorer {
  file = null;
  downloadUrl = null;
  filename = null;
  
  constructor() {
    
    // Elements
    this.dropZone = document.getElementById('restoreDropZone');
    this.input = document.getElementById('restoreInput');
    this.fileInfo = document.getElementById('restoreFileInfo');
    this.levelSelect = document.getElementById('restoreLevel');
    this.progress = document.getElementById('restoreProgress');
    this.progressFill = document.getElementById('restoreProgressFill');
    this.result = document.getElementById('restoreResult');
    this.downloadBtn = document.getElementById('restoreDownloadBtn');
    this.restoreBtn = document.getElementById('restoreBtn');
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    this.dropZone.addEventListener('click', () => this.input.click());
    this.input.addEventListener('change', (e) => {
      if (e.target.files.length > 0) this.handleFile(e.target.files[0]);
    });
    
    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropZone.classList.add('dragover');
    });
    
    this.dropZone.addEventListener('dragleave', () => {
      this.dropZone.classList.remove('dragover');
    });
    
    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) this.handleFile(e.dataTransfer.files[0]);
    });
    
    this.restoreBtn.addEventListener('click', () => this.restore());
    this.downloadBtn.addEventListener('click', () => this.download());
  }
  
  handleFile(file) {
    this.file = file;
    this.fileInfo.textContent = `${file.name} (${formatFileSize(file.size)})`;
    this.fileInfo.classList.remove('hidden');
    this.restoreBtn.disabled = false;
    this.result.classList.add('hidden');
  }
  
  async restore() {
    if (!this.file) return;
    
    this.restoreBtn.disabled = true;
    this.restoreBtn.textContent = 'Restoring...';
    this.progress.classList.remove('hidden');
    this.progressFill.style.width = '0%';
    this.result.classList.add('hidden');
    
    const formData = new FormData();
    formData.append('file', this.file);
    formData.append('level', this.levelSelect.value);
    
    try {
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 5;
        if (progress <= 90) this.progressFill.style.width = progress + '%';
      }, 150); // Slower for restore (takes longer)
      
      const response = await fetch(`${API_URL}/api/restore-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${auth.token}` },
        credentials: 'include',
        body: formData
      });
      
      clearInterval(progressInterval);
      this.progressFill.style.width = '100%';
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Restoration failed');
      }
      
      const data = await response.json();
      this.downloadUrl = `${API_URL}${data.downloadUrl}`;
      this.filename = data.filename;
      
      document.getElementById('restoreOriginalSize').textContent = formatFileSize(data.originalSize);
      document.getElementById('restoreRestoredSize').textContent = formatFileSize(data.compressedSize);
      
      setTimeout(() => {
        this.progress.classList.add('hidden');
        this.result.classList.remove('hidden');
        this.restoreBtn.disabled = false;
        this.restoreBtn.textContent = 'Restore Quality';
        loadHistory();
      }, 500);
      
    } catch (error) {
      console.error('Restoration error:', error);
      alert('Error: ' + error.message);
      this.restoreBtn.disabled = false;
      this.restoreBtn.textContent = 'Restore Quality';
      this.progress.classList.add('hidden');
    }
  }
  
  download() {
    if (!this.downloadUrl) return;
    const a = document.createElement('a');
    a.href = this.downloadUrl;
    a.download = this.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

// PDF Compressor Handler
class PdfCompressor {
  file = null;
  downloadUrl = null;
  filename = null;
  
  constructor() {
    
    // Elements
    this.dropZone = document.getElementById('pdfDropZone');
    this.input = document.getElementById('pdfInput');
    this.fileInfo = document.getElementById('pdfFileInfo');
    this.levelSelect = document.getElementById('pdfLevel');
    this.progress = document.getElementById('pdfProgress');
    this.progressFill = document.getElementById('pdfProgressFill');
    this.result = document.getElementById('pdfResult');
    this.downloadBtn = document.getElementById('pdfDownloadBtn');
    this.compressBtn = document.getElementById('pdfCompressBtn');
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    this.dropZone.addEventListener('click', () => this.input.click());
    this.input.addEventListener('change', (e) => {
      if (e.target.files.length > 0) this.handleFile(e.target.files[0]);
    });
    
    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropZone.classList.add('dragover');
    });
    
    this.dropZone.addEventListener('dragleave', () => {
      this.dropZone.classList.remove('dragover');
    });
    
    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) this.handleFile(e.dataTransfer.files[0]);
    });
    
    this.compressBtn.addEventListener('click', () => this.compress());
    this.downloadBtn.addEventListener('click', () => this.download());
  }
  
  handleFile(file) {
    this.file = file;
    this.fileInfo.textContent = `${file.name} (${formatFileSize(file.size)})`;
    this.fileInfo.classList.remove('hidden');
    this.compressBtn.disabled = false;
    this.result.classList.add('hidden');
  }
  
  async compress() {
    if (!this.file) return;
    
    this.compressBtn.disabled = true;
    this.compressBtn.textContent = 'Compressing...';
    this.progress.classList.remove('hidden');
    this.progressFill.style.width = '0%';
    this.result.classList.add('hidden');
    
    const formData = new FormData();
    formData.append('file', this.file);
    formData.append('level', this.levelSelect.value);
    
    try {
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 5;
        if (progress <= 90) this.progressFill.style.width = progress + '%';
      }, 100);
      
      const response = await fetch(`${API_URL}/api/upload-pdf`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${auth.token}` },
        credentials: 'include',
        body: formData
      });
      
      clearInterval(progressInterval);
      this.progressFill.style.width = '100%';
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Compression failed');
      }
      
      const data = await response.json();
      this.downloadUrl = `${API_URL}${data.downloadUrl}`;
      this.filename = data.filename;
      
      document.getElementById('pdfOriginalSize').textContent = formatFileSize(data.originalSize);
      document.getElementById('pdfCompressedSize').textContent = formatFileSize(data.compressedSize);
      document.getElementById('pdfSavings').textContent = calculateSavings(data.originalSize, data.compressedSize);
      
      setTimeout(() => {
        this.progress.classList.add('hidden');
        this.result.classList.remove('hidden');
        this.compressBtn.disabled = false;
        this.compressBtn.textContent = 'Compress PDF';
        loadHistory();
      }, 500);
      
    } catch (error) {
      console.error('Compression error:', error);
      alert('Error: ' + error.message);
      this.compressBtn.disabled = false;
      this.compressBtn.textContent = 'Compress PDF';
      this.progress.classList.add('hidden');
    }
  }
  
  download() {
    if (!this.downloadUrl) return;
    const a = document.createElement('a');
    a.href = this.downloadUrl;
    a.download = this.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

// Initialize handlers
const imageConverter = new ImageConverter();
const imageCompressor = new ImageCompressor();
const imageRestorer = new ImageRestorer();
const pdfCompressor = new PdfCompressor();

// Load history
async function loadHistory() {
  const historyList = document.getElementById('historyList');
  
  try {
    const response = await fetch(`${API_URL}/api/my-jobs`, {
      headers: {
        'Authorization': `Bearer ${auth.token}`
      },
      credentials: 'include'
    });
    
    if (!response.ok) throw new Error('Failed to load history');
    
    const jobs = await response.json();
    
    if (jobs.length === 0) {
      historyList.innerHTML = '<p style="text-align: center; color: #9ca3af;">No compression history yet. Start by uploading a file!</p>';
      return;
    }
    
    historyList.innerHTML = jobs.map(job => `
      <div class="history-item">
        <div class="history-info">
          <div class="history-name">${job.inputName}</div>
          <div class="history-meta">
            ${formatFileSize(job.originalSize || 0)} → ${formatFileSize(job.compressedSize || 0)} • 
            ${new Date(job.createdAt).toLocaleDateString()}
          </div>
        </div>
        <div class="history-actions">
          ${job.originalSize && job.compressedSize ? calculateSavings(job.originalSize, job.compressedSize) : '-'}
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('History error:', error);
    historyList.innerHTML = '<p class="loading">Failed to load history</p>';
  }
}

// Load history on page load
loadHistory();

