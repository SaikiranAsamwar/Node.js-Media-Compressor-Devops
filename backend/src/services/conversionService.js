const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs/promises');
const path = require('path');

// Compression quality levels with accurate size reduction targets
const QUALITY_LEVELS = {
  low: { quality: 50, resize: 1280, targetReduction: 0.70 }, // ~70% size reduction
  medium: { quality: 65, resize: 1920, targetReduction: 0.50 }, // ~50% size reduction
  high: { quality: 80, resize: 2560, targetReduction: 0.30 }, // ~30% size reduction
  maximum: { quality: 95, resize: null, targetReduction: 0 } // No reduction, preserve quality
};

// Decompression/Quality restoration levels
const RESTORE_LEVELS = {
  enhance: { quality: 100, resize: null, upscale: 1.5 },
  restore: { quality: 100, resize: null, upscale: 1.0 },
  maximum: { quality: 100, resize: null, upscale: null }
};

// Estimate compressed size before actual compression
async function estimateCompressedSize(inputPath, options = {}) {
  const { level = 'medium', format } = options;
  
  const stats = await fs.stat(inputPath);
  const originalSize = stats.size;
  
  // Get metadata to understand image better
  const metadata = await sharp(inputPath).metadata();
  const inputFormat = format || metadata.format;
  
  const qualitySettings = QUALITY_LEVELS[level] || QUALITY_LEVELS.medium;
  
  // Estimate based on format and quality level
  let estimatedReduction = qualitySettings.targetReduction;
  
  // Adjust estimation based on format
  if (inputFormat === 'png' && format === 'png') {
    // PNG to PNG: less reduction possible
    estimatedReduction *= 0.6;
  } else if (inputFormat === 'jpeg' && format === 'jpeg') {
    // JPEG to JPEG: moderate reduction
    estimatedReduction *= 0.8;
  } else if (format === 'webp' || format === 'avif') {
    // Modern formats: better compression
    estimatedReduction *= 1.2;
  }
  
  // Consider resize factor
  if (qualitySettings.resize && metadata.width > qualitySettings.resize) {
    const resizeFactor = Math.pow(qualitySettings.resize / metadata.width, 2);
    estimatedReduction += (1 - resizeFactor) * 0.5;
  }
  
  // Cap at 0.95 (max 95% reduction)
  estimatedReduction = Math.min(estimatedReduction, 0.95);
  
  const estimatedSize = Math.floor(originalSize * (1 - estimatedReduction));
  
  return {
    originalSize,
    estimatedSize,
    estimatedReduction: Math.floor(estimatedReduction * 100)
  };
}

// Convert image with format conversion (preserves quality)
async function convertImage(inputPath, outputPath, options = {}) {
  const {
    format = 'jpeg',
    quality = 95, // High quality for conversion
    level = 'maximum',
    width,
    height
  } = options;

  // For conversion, use maximum quality unless specified
  const qualitySettings = level === 'maximum' 
    ? { quality: 95, resize: null }
    : QUALITY_LEVELS[level];

  let image = sharp(inputPath);
  
  // Only resize if explicitly requested
  const resizeWidth = width || qualitySettings.resize;
  if (resizeWidth) {
    image = image.resize({ 
      width: resizeWidth, 
      height: height || null,
      withoutEnlargement: true,
      fit: 'inside'
    });
  }

  // Apply format-specific options with high quality
  switch (format.toLowerCase()) {
    case 'jpeg':
    case 'jpg':
      image = image.jpeg({ 
        quality: qualitySettings.quality,
        mozjpeg: true // Better compression
      });
      break;
    case 'png':
      image = image.png({ 
        compressionLevel: 9,
        quality: 100 // PNG is lossless
      });
      break;
    case 'webp':
      image = image.webp({ 
        quality: qualitySettings.quality,
        effort: 6 // Better compression
      });
      break;
    case 'avif':
      image = image.avif({ 
        quality: qualitySettings.quality,
        effort: 9 // Maximum effort
      });
      break;
    case 'tiff':
      image = image.tiff({ 
        quality: qualitySettings.quality,
        compression: 'jpeg'
      });
      break;
    default:
      image = image.jpeg({ quality: qualitySettings.quality });
  }

  await image.toFile(outputPath);
  return { format, quality: qualitySettings.quality };
}

// Compress image (reduces file size, keeps format)
async function compressImage(inputPath, outputPath, options = {}) {
  const { level = 'medium' } = options;
  
  const qualitySettings = QUALITY_LEVELS[level] || QUALITY_LEVELS.medium;
  
  // Get input format
  const metadata = await sharp(inputPath).metadata();
  const format = metadata.format;
  
  let image = sharp(inputPath);
  
  // Apply resize if needed
  if (qualitySettings.resize && metadata.width > qualitySettings.resize) {
    image = image.resize({ 
      width: qualitySettings.resize,
      withoutEnlargement: true,
      fit: 'inside'
    });
  }
  
  // Compress based on original format
  switch (format.toLowerCase()) {
    case 'jpeg':
    case 'jpg':
      image = image.jpeg({ 
        quality: qualitySettings.quality,
        mozjpeg: true,
        progressive: true
      });
      break;
    case 'png':
      // PNG: convert to lossy format if needed for better compression
      if (level === 'low' || level === 'medium') {
        // Convert to WebP for better compression
        image = image.webp({ 
          quality: qualitySettings.quality,
          effort: 6
        });
      } else {
        image = image.png({ 
          compressionLevel: 9,
          quality: qualitySettings.quality,
          effort: 10
        });
      }
      break;
    case 'webp':
      image = image.webp({ 
        quality: qualitySettings.quality,
        effort: 6
      });
      break;
    case 'avif':
      image = image.avif({ 
        quality: qualitySettings.quality,
        effort: 9
      });
      break;
    default:
      // Convert to JPEG for unknown formats
      image = image.jpeg({ 
        quality: qualitySettings.quality,
        mozjpeg: true
      });
  }
  
  await image.toFile(outputPath);
  
  return { 
    format: format === 'png' && (level === 'low' || level === 'medium') ? 'webp' : format,
    quality: qualitySettings.quality 
  };
}

// Reverse compression / Quality restoration
async function restoreImage(inputPath, outputPath, options = {}) {
  const { level = 'restore' } = options;
  
  const restoreSettings = RESTORE_LEVELS[level] || RESTORE_LEVELS.restore;
  
  // Get input metadata
  const metadata = await sharp(inputPath).metadata();
  
  let image = sharp(inputPath);
  
  // Upscale if requested
  if (restoreSettings.upscale && restoreSettings.upscale > 1) {
    const newWidth = Math.floor(metadata.width * restoreSettings.upscale);
    image = image.resize({
      width: newWidth,
      kernel: sharp.kernel.lanczos3 // High quality upscaling
    });
  }
  
  // Apply sharpening and enhancement
  image = image.sharpen({ sigma: 0.5 });
  image = image.modulate({ brightness: 1.02, saturation: 1.05 });
  
  // Output in high quality format
  const format = metadata.format;
  switch (format.toLowerCase()) {
    case 'jpeg':
    case 'jpg':
      image = image.jpeg({ 
        quality: restoreSettings.quality,
        mozjpeg: true
      });
      break;
    case 'png':
      image = image.png({ 
        compressionLevel: 6, // Less compression for speed
        quality: 100
      });
      break;
    case 'webp':
      image = image.webp({ 
        quality: restoreSettings.quality,
        effort: 6
      });
      break;
    default:
      image = image.jpeg({ quality: restoreSettings.quality });
  }
  
  await image.toFile(outputPath);
  
  return { 
    format,
    quality: restoreSettings.quality,
    restored: true
  };
}

async function compressPdf(inputPath, outputPath, options = {}) {
  const { level = 'medium' } = options;
  
  // Simple approach: re-encode with compression
  const existing = await fs.readFile(inputPath);
  const pdfDoc = await PDFDocument.load(existing);
  
  // Compression options based on level
  const compressionOptions = {
    low: { useObjectStreams: true, addDefaultPage: false },
    medium: { useObjectStreams: true, addDefaultPage: false },
    high: { useObjectStreams: false, addDefaultPage: false },
    maximum: { useObjectStreams: false, addDefaultPage: false }
  };
  
  const saveOptions = compressionOptions[level] || compressionOptions.medium;
  const bytes = await pdfDoc.save(saveOptions);
  await fs.writeFile(outputPath, bytes);
  
  return { compressed: true };
}

module.exports = { 
  convertImage, 
  compressImage,
  restoreImage,
  estimateCompressedSize,
  compressPdf,
  QUALITY_LEVELS,
  RESTORE_LEVELS
};
