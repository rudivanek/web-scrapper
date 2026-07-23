import JSZip from 'jszip';
import { MutableRefObject } from 'react';
import { scrapeFullPage } from './firecrawl';

// Tunable constants
const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 1500;
const MAX_RETRIES = 3;
// Backoff delays per attempt index (0-based): 2s, 4s, 8s
const RETRY_DELAYS_MS = [2000, 4000, 8000];

export interface DownloadProgress {
  current: number;
  total: number;
  succeeded: number;
  failed: number;
  retrying: number; // how many URLs are currently in a retry wait
  done: boolean;
  summary?: string;
}

function isRateLimitError(err: unknown): boolean {
  if (!err) return false;
  const msg = String(err instanceof Error ? err.message : err).toLowerCase();
  return msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests');
}

function urlToFilename(url: string, usedNames: Set<string>): string {
  try {
    const parsed = new URL(url);
    let path = parsed.pathname.replace(/^\/+|\/+$/g, '');
    if (!path) path = 'index';
    let slug = path.replace(/\//g, '-').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
    if (!slug.endsWith('.html')) slug += '.html';

    if (!usedNames.has(slug)) {
      usedNames.add(slug);
      return slug;
    }
    let counter = 2;
    while (true) {
      const candidate = slug.replace(/\.html$/, `-${counter}.html`);
      if (!usedNames.has(candidate)) {
        usedNames.add(candidate);
        return candidate;
      }
      counter++;
    }
  } catch {
    const fallback = `page-${Date.now()}.html`;
    usedNames.add(fallback);
    return fallback;
  }
}

function triggerDownload(blob: Blob, filename: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

async function fetchWithRetry(
  url: string,
  onRetrying: (active: boolean) => void,
  maxRetries: number = MAX_RETRIES
): Promise<string | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await scrapeFullPage(url);
      const html = result?.data?.rawHtml || result?.data?.html || null;

      // Treat a missing html + rate-limit signal in result as a 429
      if (!html && result?.error && isRateLimitError(result.error)) {
        throw new Error(String(result.error));
      }

      onRetrying(false);
      return html;
    } catch (err) {
      const isRateLimit = isRateLimitError(err);
      if (attempt < maxRetries && isRateLimit) {
        onRetrying(true);
        await new Promise(r => setTimeout(r, RETRY_DELAYS_MS[attempt] ?? 8000));
        continue;
      }
      onRetrying(false);
      return null;
    }
  }
  onRetrying(false);
  return null;
}

async function downloadHtmlFiles(
  urls: string[],
  domain: string,
  onProgress: (p: DownloadProgress) => void,
  cancelRef: MutableRefObject<boolean>
): Promise<void> {
  const total = urls.length;
  if (total === 0) return;

  let succeeded = 0;
  let failed = 0;
  let retrying = 0;

  const emit = (current: number, done: boolean, summary?: string) =>
    onProgress({ current, total, succeeded, failed, retrying, done, summary });

  // Single URL — download directly as .html, no ZIP
  if (total === 1) {
    emit(0, false);
    const html = await fetchWithRetry(urls[0], active => {
      retrying = active ? 1 : 0;
      emit(0, false);
    });
    if (html) {
      const usedNames = new Set<string>();
      triggerDownload(new Blob([html], { type: 'text/html' }), urlToFilename(urls[0], usedNames));
      succeeded = 1;
      emit(1, true, 'Downloaded 1 page.');
    } else {
      failed = 1;
      emit(1, true, 'Failed to download page.');
    }
    return;
  }

  // Multiple URLs — build ZIP in streaming fashion
  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (let i = 0; i < total; i += BATCH_SIZE) {
    if (cancelRef.current) {
      emit(i, true,
        `Cancelled. Downloaded ${succeeded} of ${total}.${failed > 0 ? ` ${failed} failed.` : ''}`);
      return;
    }

    const batch = urls.slice(i, i + BATCH_SIZE);
    emit(i, false);

    const batchResults = await Promise.allSettled(
      batch.map(url =>
        fetchWithRetry(url, active => {
          retrying += active ? 1 : -1;
          emit(i, false);
        }).then(html => ({ url, html }))
      )
    );

    for (const settled of batchResults) {
      if (settled.status === 'fulfilled') {
        const { url, html } = settled.value;
        if (html) {
          zip.file(urlToFilename(url, usedNames), html);
          succeeded++;
        } else {
          failed++;
        }
      } else {
        failed++;
      }
    }

    retrying = 0;
    emit(Math.min(i + BATCH_SIZE, total), false);

    // Delay between batches to avoid rate-limiting; skip delay after the last batch
    if (i + BATCH_SIZE < total) {
      if (cancelRef.current) {
        emit(Math.min(i + BATCH_SIZE, total), true,
          `Cancelled. Downloaded ${succeeded} of ${total}.${failed > 0 ? ` ${failed} failed.` : ''}`);
        return;
      }
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  emit(total, false);

  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(zipBlob, `${domain}-html-${timestamp}.zip`);

  emit(total, true,
    `Downloaded ${succeeded} of ${total}.${failed > 0 ? ` ${failed} failed.` : ''}`);
}

export { downloadHtmlFiles }