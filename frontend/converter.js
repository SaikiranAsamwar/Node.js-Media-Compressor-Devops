// Image Converter Page JavaScript
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

// Initialize auth
const auth = checkAuth();

// NOTE: Profile dropdown, theme toggle, and logout are handled by common.js
// No need to duplicate event listeners here

// Utility functions
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Image Converter Handler
class ImageConverter {
  file = null;
  fileFormat = null;
  downloadUrl = null;
  filename = null;
  
  constructor() {
    
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
    
    const ext = file.name.split('.').pop().toLowerCase();
    this.fileFormat = ext === 'jpg' ? 'jpeg' : ext;
    
    this.fileInfo.textContent = `${file.name} (${formatFileSize(file.size)})`;
    this.fileInfo.classList.remove('hidden');
    
    this.formatInfo.textContent = `Current format: ${this.fileFormat.toUpperCase()}`;
    this.formatInfo.classList.remove('hidden');
    
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
    
    this.formatSelect.innerHTML = '<option value="">Select output format...</option>';
    
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
    formData.append('level', 'maximum');
    
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

// Initialize converter
const converter = new ImageConverter();

