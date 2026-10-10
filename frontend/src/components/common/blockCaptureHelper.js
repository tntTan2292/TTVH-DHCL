import { toBlob } from 'html-to-image';

/**
 * Convert Vietnamese / accented text to clean ASCII slug for filenames.
 */
export function slugifyText(text) {
  if (!text) return '';
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-');
}

/**
 * Format a Date to Vietnamese format HH:mm:ss DD/MM/YYYY.
 */
export function formatCaptureTimestamp(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
}

/**
 * Build a human-readable file name for saving the capture.
 * Example: 'F1.1_Bang-dieu-hanh_2026-10-07.png'
 */
export function buildCaptureFileName({ indicator = 'F1.3', blockTitle = 'Bao-cao', dateOrPeriod = '' } = {}) {
  const cleanIndicator = String(indicator || 'F1.3').replace(/[^a-zA-Z0-9.]/g, '');
  const cleanTitle = slugifyText(blockTitle) || 'Bao-cao';
  const cleanDate = String(dateOrPeriod || '').trim().replace(/[^a-zA-Z0-9_-]/g, '-');
  const dateSuffix = cleanDate ? `_${cleanDate}` : '';
  return `${cleanIndicator}_${cleanTitle}${dateSuffix}.png`;
}

/**
 * Build capture caption metadata and text.
 */
export function buildCaptureCaption({ indicator = 'F1.3', blockTitle = '', dateOrPeriod = '', generatedAt = new Date() } = {}) {
  const formattedTime = formatCaptureTimestamp(generatedAt);
  const periodLabel = dateOrPeriod ? ` • Kỳ: ${dateOrPeriod}` : '';
  const captionText = `Chỉ số: ${indicator} • ${blockTitle}${periodLabel} • Xuất lúc: ${formattedTime}`;

  return {
    indicator,
    blockTitle,
    dateOrPeriod,
    formattedTime,
    captionText,
  };
}

/**
 * True when the async Clipboard API can write an image: only on https or localhost (a "secure context").
 * The system is also opened through plain-http network addresses, where the browser hides this API.
 */
export function canUseAsyncImageClipboard() {
  return typeof window !== 'undefined'
    && window.isSecureContext === true
    && typeof navigator !== 'undefined'
    && Boolean(navigator.clipboard?.write)
    && typeof ClipboardItem !== 'undefined';
}

/**
 * Copy an image with the async Clipboard API. Accepts a Blob or a Promise<Blob>: a promise lets the call
 * be made inside the click handler (while the browser still treats it as a user action) before the image
 * has finished rendering. Returns true on success, false if unsupported or refused.
 */
export async function copyBlobToClipboard(blobOrPromise) {
  if (!blobOrPromise || !canUseAsyncImageClipboard()) return false;
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blobOrPromise }),
    ]);
    return true;
  } catch (err) {
    console.warn('[BlockCapture] navigator.clipboard.write failed:', err);
    return false;
  }
}

/**
 * Trigger browser download for a Blob with a specific filename.
 */
export function downloadBlob(blob, filename) {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Capture an HTMLElement to PNG Blob with caption and 2x resolution,
 * expanding scrollable containers temporarily.
 */
export async function captureElementToBlob(element, { captionInfo } = {}) {
  if (!element) throw new Error('Target element for capture not found');

  // Filter out any elements marked with data-no-capture or no-capture class
  const filter = (node) => {
    if (!node || !node.getAttribute) return true;
    if (node.getAttribute('data-no-capture') === 'true') return false;
    if (node.classList?.contains('no-capture')) return false;
    return true;
  };

  // Find scrollable or max-height containers to temporarily expand
  const scrollContainers = [];
  try {
    const descendants = element.querySelectorAll('*');
    descendants.forEach((node) => {
      const computed = window.getComputedStyle(node);
      const hasOverflow = (computed.overflowY === 'auto' || computed.overflowY === 'scroll' || computed.overflowX === 'auto' || computed.overflowX === 'scroll');
      const hasMaxHeight = computed.maxHeight && computed.maxHeight !== 'none';
      if (hasOverflow || hasMaxHeight) {
        scrollContainers.push({
          node,
          prevMaxHeight: node.style.maxHeight,
          prevOverflow: node.style.overflow,
          prevOverflowY: node.style.overflowY,
          prevOverflowX: node.style.overflowX,
        });
        node.style.maxHeight = 'none';
        node.style.overflow = 'visible';
        node.style.overflowY = 'visible';
        node.style.overflowX = 'visible';
      }
    });
  } catch (e) {
    console.warn('[BlockCapture] error inspecting scroll containers:', e);
  }

  // Create temporary caption footer
  let captionElement = null;
  if (captionInfo) {
    captionElement = document.createElement('div');
    captionElement.className = 'block-capture-caption-banner';
    captionElement.style.padding = '10px 16px';
    captionElement.style.backgroundColor = '#f8fafc';
    captionElement.style.borderTop = '1px solid #cbd5e1';
    captionElement.style.marginTop = '12px';
    captionElement.style.display = 'flex';
    captionElement.style.justifyContent = 'space-between';
    captionElement.style.alignItems = 'center';
    captionElement.style.fontSize = '12px';
    captionElement.style.fontWeight = '600';
    captionElement.style.color = '#334155';
    captionElement.innerHTML = `
      <span><strong style="color: #003E7E;">${captionInfo.indicator}</strong> • ${captionInfo.blockTitle}${captionInfo.dateOrPeriod ? ` (${captionInfo.dateOrPeriod})` : ''}</span>
      <span style="font-size: 11px; color: #64748b; font-weight: normal;">Xuất lúc: ${captionInfo.formattedTime}</span>
    `;
    element.appendChild(captionElement);
  }

  try {
    const blob = await toBlob(element, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      filter,
      cacheBust: true,
    });
    return blob;
  } finally {
    // Restore containers
    scrollContainers.forEach(({ node, prevMaxHeight, prevOverflow, prevOverflowY, prevOverflowX }) => {
      node.style.maxHeight = prevMaxHeight;
      node.style.overflow = prevOverflow;
      node.style.overflowY = prevOverflowY;
      node.style.overflowX = prevOverflowX;
    });
    // Remove caption
    if (captionElement && captionElement.parentNode) {
      captionElement.parentNode.removeChild(captionElement);
    }
  }
}

/**
 * High-level capture function for UI triggers.
 */
// Resolves after the browser has painted the next frame (so a state change made just before a capture is on
// screen), with a short timeout for hidden tabs where animation frames pause.
export function waitForNextPaint(timeoutMs = 250) {
  return new Promise((resolve) => {
    const done = () => resolve();
    const timer = setTimeout(done, timeoutMs);
    if (typeof requestAnimationFrame !== 'function') return;
    requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(timer); done(); }));
  });
}

export async function executeBlockCapture({
  element,
  blockTitle = '',
  indicator = 'F1.3',
  dateOrPeriod = '',
  action = 'copy', // 'copy' (clipboard, or a preview to copy by hand) | 'save'
  beforeCapture = null, // async: lets a block shrink itself for the picture (e.g. only the top rows of a long table)
  afterCapture = null, // restores the block, always called
}) {
  const captionInfo = buildCaptureCaption({ indicator, blockTitle, dateOrPeriod });
  const filename = buildCaptureFileName({ indicator, blockTitle, dateOrPeriod });
  // Start rendering right away (no await before this line): the clipboard call below must still happen
  // inside the click that started the capture, or the browser refuses it.
  const blobPromise = (async () => {
    try {
      if (beforeCapture) await beforeCapture();
      return await captureElementToBlob(element, { captionInfo });
    } finally {
      if (afterCapture) afterCapture();
    }
  })();

  if (action === 'copy') {
    const clipboardCopied = canUseAsyncImageClipboard() ? await copyBlobToClipboard(blobPromise) : false;
    if (clipboardCopied) {
      return { success: true, action: 'copy', message: 'Đã sao chép ảnh. Bấm Ctrl+V để dán vào Zalo/Viber/email.', filename };
    }
    // Plain-http addresses (and refused permissions) cannot write an image to the clipboard from a page.
    // The browser's own "Copy image" command can, from any address, so show the picture for that.
    const blob = await blobPromise;
    if (!blob) throw new Error('Không thể tạo dữ liệu ảnh PNG');
    return {
      success: true,
      action: 'preview',
      message: 'Ảnh đã sẵn sàng: bấm chuột phải vào ảnh, chọn "Sao chép hình ảnh".',
      filename,
      blob,
    };
  }

  const blob = await blobPromise;
  if (!blob) {
    throw new Error('Không thể tạo dữ liệu ảnh PNG');
  }

  // action === 'save'
  downloadBlob(blob, filename);
  return {
    success: true,
    action: 'save',
    message: `Đã lưu tệp ${filename}`,
    filename,
  };
}
