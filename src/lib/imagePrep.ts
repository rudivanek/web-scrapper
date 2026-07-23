const MAX_WORKING_WIDTH = 1400;
const MAX_SEGMENT_HEIGHT = 1600;
const OVERLAP = 100;
const MAX_SEGMENTS = 4;
const MAX_DIM = 8000;
const MAX_BASE64_BYTES = 5 * 1024 * 1024;

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

async function fetchAsBlobUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

function canvasToBase64(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
}

function validateSegment(base64: string, width: number, height: number): boolean {
  if (width > MAX_DIM || height > MAX_DIM) {
    console.warn(`Segment dropped: dimensions ${width}x${height} exceed ${MAX_DIM}px limit`);
    return false;
  }
  if (base64.length > MAX_BASE64_BYTES) {
    console.warn(`Segment dropped: base64 length ${base64.length} exceeds ${MAX_BASE64_BYTES} bytes`);
    return false;
  }
  return true;
}

export async function prepareScreenshot(base64OrUrl: string): Promise<string[]> {
  try {
    let imgSrc: string;
    if (base64OrUrl.startsWith('http')) {
      imgSrc = await fetchAsBlobUrl(base64OrUrl);
    } else if (base64OrUrl.startsWith('data:')) {
      imgSrc = base64OrUrl;
    } else {
      imgSrc = `data:image/png;base64,${base64OrUrl}`;
    }

    const img = await loadImage(imgSrc);

    const scale = Math.min(1, MAX_WORKING_WIDTH / img.naturalWidth);
    const workingWidth = Math.round(img.naturalWidth * scale);
    const workingHeight = Math.round(img.naturalHeight * scale);

    if (workingHeight <= MAX_SEGMENT_HEIGHT) {
      const canvas = document.createElement('canvas');
      canvas.width = workingWidth;
      canvas.height = workingHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, workingWidth, workingHeight);
      const b64 = canvasToBase64(canvas);
      return validateSegment(b64, workingWidth, workingHeight) ? [b64] : [];
    }

    const usableHeight = MAX_SEGMENT_HEIGHT - OVERLAP;
    const idealSegmentCount = Math.ceil(workingHeight / usableHeight);

    let segments: Array<{ sy: number; sh: number }>;

    if (idealSegmentCount <= MAX_SEGMENTS) {
      segments = [];
      let y = 0;
      while (y < workingHeight) {
        const sh = Math.min(MAX_SEGMENT_HEIGHT, workingHeight - y);
        segments.push({ sy: y, sh });
        if (y + sh >= workingHeight) break;
        y += sh - OVERLAP;
      }
    } else {
      const topH = MAX_SEGMENT_HEIGHT;
      const bottomH = MAX_SEGMENT_HEIGHT;
      const middleSpace = workingHeight - topH - bottomH;
      const mid1Start = topH - OVERLAP;
      const mid2Start = topH - OVERLAP + Math.max(0, middleSpace / 2 - MAX_SEGMENT_HEIGHT / 2 + OVERLAP / 2);
      segments = [
        { sy: 0, sh: topH },
        { sy: Math.round(mid1Start), sh: MAX_SEGMENT_HEIGHT },
        { sy: Math.round(mid2Start), sh: MAX_SEGMENT_HEIGHT },
        { sy: workingHeight - bottomH, sh: bottomH },
      ];
    }

    const results: string[] = [];
    for (const seg of segments) {
      const canvas = document.createElement('canvas');
      canvas.width = workingWidth;
      canvas.height = seg.sh;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(
        img,
        0, seg.sy, workingWidth, seg.sh,
        0, 0, workingWidth, seg.sh
      );
      const b64 = canvasToBase64(canvas);
      if (validateSegment(b64, workingWidth, seg.sh)) {
        results.push(b64);
      }
    }

    return results;
  } catch (e) {
    console.warn('prepareScreenshot failed:', e);
    return [];
  }
}
