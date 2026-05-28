/**
 * Image Processor Engine
 * Handles resize, crop, and compression using the Canvas API.
 * All processing happens client-side — no data leaves the browser.
 */

class ImageProcessor {
  /**
   * Loads an image file and returns an HTMLImageElement.
   * @param {File} file
   * @returns {Promise<HTMLImageElement>}
   */
  static loadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Resizes an image to target dimensions, fitting/covering as needed.
   * @param {HTMLImageElement} img
   * @param {number} targetWidth - Target width in pixels
   * @param {number} targetHeight - Target height in pixels
   * @param {'cover'|'contain'|'stretch'} mode
   * @returns {HTMLCanvasElement}
   */
  static resize(img, targetWidth, targetHeight, mode = 'cover') {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');

    // Fill with white background (for JPEG transparency handling)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    const srcRatio = img.naturalWidth / img.naturalHeight;
    const tgtRatio = targetWidth / targetHeight;

    let sx, sy, sw, sh;

    if (mode === 'cover') {
      // Crop to fill — no letterboxing
      if (srcRatio > tgtRatio) {
        sh = img.naturalHeight;
        sw = sh * tgtRatio;
        sx = (img.naturalWidth - sw) / 2;
        sy = 0;
      } else {
        sw = img.naturalWidth;
        sh = sw / tgtRatio;
        sx = 0;
        sy = (img.naturalHeight - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
    } else if (mode === 'contain') {
      // Fit entire image with letterboxing
      let dw, dh;
      if (srcRatio > tgtRatio) {
        dw = targetWidth;
        dh = targetWidth / srcRatio;
      } else {
        dh = targetHeight;
        dw = targetHeight * srcRatio;
      }
      const dx = (targetWidth - dw) / 2;
      const dy = (targetHeight - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
    } else {
      // Stretch
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    }

    return canvas;
  }

  /**
   * Resizes with a custom crop region applied first.
   * @param {HTMLImageElement} img
   * @param {Object} cropRegion - { x, y, width, height } in 0-1 normalized coords
   * @param {number} targetWidth
   * @param {number} targetHeight
   * @returns {HTMLCanvasElement}
   */
  static resizeWithCrop(img, cropRegion, targetWidth, targetHeight) {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    const sx = cropRegion.x * img.naturalWidth;
    const sy = cropRegion.y * img.naturalHeight;
    const sw = cropRegion.width * img.naturalWidth;
    const sh = cropRegion.height * img.naturalHeight;

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
    return canvas;
  }

  /**
   * Compresses a canvas to a JPEG blob within a target file size range.
   * Uses binary search on JPEG quality to converge quickly.
   * @param {HTMLCanvasElement} canvas
   * @param {number} minKB - Minimum file size in KB
   * @param {number} maxKB - Maximum file size in KB
   * @param {number} maxIterations - Max compression attempts
   * @returns {Promise<{blob: Blob, quality: number, sizeKB: number}>}
   */
  static async compress(canvas, minKB, maxKB, maxIterations = 15) {
    let lo = 0.01;
    let hi = 1.0;
    let bestBlob = null;
    let bestQuality = 0.85;
    let bestSize = 0;

    // First try at a reasonable starting quality
    const startQuality = 0.85;
    let blob = await this._canvasToBlob(canvas, startQuality);
    let sizeKB = blob.size / 1024;

    if (sizeKB >= minKB && sizeKB <= maxKB) {
      return { blob, quality: startQuality, sizeKB };
    }

    // Binary search
    if (sizeKB > maxKB) {
      hi = startQuality;
    } else {
      lo = startQuality;
    }

    for (let i = 0; i < maxIterations; i++) {
      const mid = (lo + hi) / 2;
      blob = await this._canvasToBlob(canvas, mid);
      sizeKB = blob.size / 1024;

      if (sizeKB >= minKB && sizeKB <= maxKB) {
        return { blob, quality: mid, sizeKB };
      }

      if (sizeKB > maxKB) {
        hi = mid;
      } else {
        lo = mid;
      }

      // Track closest result
      if (!bestBlob || Math.abs(sizeKB - (minKB + maxKB) / 2) < Math.abs(bestSize - (minKB + maxKB) / 2)) {
        bestBlob = blob;
        bestQuality = mid;
        bestSize = sizeKB;
      }
    }

    // If we couldn't hit the range exactly, try extreme values
    if (bestSize > maxKB) {
      // Try minimum quality
      blob = await this._canvasToBlob(canvas, 0.01);
      sizeKB = blob.size / 1024;
      if (sizeKB <= maxKB) {
        bestBlob = blob;
        bestQuality = 0.01;
        bestSize = sizeKB;
      }
    }

    return { blob: bestBlob, quality: bestQuality, sizeKB: bestSize };
  }

  /**
   * Converts a canvas to a JPEG Blob at a given quality.
   * @param {HTMLCanvasElement} canvas
   * @param {number} quality - 0 to 1
   * @returns {Promise<Blob>}
   */
  static _canvasToBlob(canvas, quality) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
    });
  }

  /**
   * Full processing pipeline: load → resize → compress.
   * @param {File} file - Input image file
   * @param {Object} preset - Document preset from EXAM_PRESETS
   * @param {Object|null} cropRegion - Optional crop region
   * @returns {Promise<{blob: Blob, quality: number, sizeKB: number, width: number, height: number, originalWidth: number, originalHeight: number, originalSizeKB: number, previewUrl: string}>}
   */
  static async process(file, preset, cropRegion = null) {
    const img = await this.loadImage(file);
    const target = getTargetPixels(preset);

    let canvas;
    if (cropRegion) {
      canvas = this.resizeWithCrop(img, cropRegion, target.width, target.height);
    } else {
      canvas = this.resize(img, target.width, target.height, 'cover');
    }

    const result = await this.compress(canvas, preset.fileSize.min, preset.fileSize.max);
    const previewUrl = URL.createObjectURL(result.blob);

    return {
      ...result,
      width: target.width,
      height: target.height,
      originalWidth: img.naturalWidth,
      originalHeight: img.naturalHeight,
      originalSizeKB: file.size / 1024,
      previewUrl,
    };
  }

  /**
   * Creates a downloadable file from a blob.
   * @param {Blob} blob
   * @param {string} filename
   */
  static download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
