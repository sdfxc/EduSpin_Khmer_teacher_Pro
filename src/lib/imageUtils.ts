/**
 * Utilities for client-side image compression and processing.
 * Efficiently resizes smartphone camera pictures (often 5-15MB) 
 * down to clean, lightweight avatars (30-60KB) suitable for 
 * localStorage and Firestore.
 */

export function compressAndResizeImage(
  file: File,
  maxDimension: number = 512,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;

        // Calculate aspect ratio preserving bounds
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(readerEvent.target?.result as string);
          return;
        }

        // Draw image smoothly
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to high-efficiency JPEG or WebP data URL
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch {
          resolve(canvas.toDataURL('image/png'));
        }
      };

      if (typeof readerEvent.target?.result === 'string') {
        img.src = readerEvent.target.result;
      } else {
        reject(new Error('Failed to read image file.'));
      }
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Removes white/light background from the outer edges of an image,
 * converting it to a transparent PNG while keeping all interior white 
 * elements (such as white text, emblems, and open book pages) completely intact.
 */
export function removeWhiteBackgroundFromDataUrl(dataUrl: string, tolerance: number = 28): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      if (!width || !height) {
        resolve(dataUrl);
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0);
      let imgData: ImageData;
      try {
        imgData = ctx.getImageData(0, 0, width, height);
      } catch {
        // Cross-origin restriction fallback
        resolve(dataUrl);
        return;
      }

      const data = imgData.data;
      const totalPixels = width * height;
      const visited = new Uint8Array(totalPixels);
      const queue: number[] = [];

      // Seed floodfill with all pixels along the 4 outer borders
      for (let x = 0; x < width; x++) {
        queue.push(x, 0);
        queue.push(x, height - 1);
      }
      for (let y = 0; y < height; y++) {
        queue.push(0, y);
        queue.push(width - 1, y);
      }

      const minWhiteVal = Math.max(0, 255 - tolerance);

      const isNearWhite = (idx: number): boolean => {
        const a = data[idx + 3];
        if (a === 0) return true; // Already transparent
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        return r >= minWhiteVal && g >= minWhiteVal && b >= minWhiteVal;
      };

      let head = 0;
      while (head < queue.length) {
        const x = queue[head++];
        const y = queue[head++];
        const pos = y * width + x;
        if (visited[pos]) continue;
        visited[pos] = 1;

        const dataIdx = pos * 4;
        if (isNearWhite(dataIdx)) {
          data[dataIdx + 3] = 0; // Turn transparent

          // Check 4-connected neighbors
          if (x > 0 && !visited[pos - 1]) {
            queue.push(x - 1, y);
          }
          if (x < width - 1 && !visited[pos + 1]) {
            queue.push(x + 1, y);
          }
          if (y > 0 && !visited[pos - width]) {
            queue.push(x, y - 1);
          }
          if (y < height - 1 && !visited[pos + width]) {
            queue.push(x, y + 1);
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

