import { htmlEscape, buildHtmlPage, triggerHtmlDownload, fileDate } from './shared';

type Priority = 'Alta' | 'Media';
type SourceTag = 'CRO' | 'SEO' | 'Copy';

interface PromptCard {
  id: string;
  label: string;
  priority: Priority;
  sources: SourceTag[];
  promptText: string;
  combinedText?: string;
}

function sourceColor(tag: SourceTag): string {
  if (tag === 'CRO') return 'background:#FFF7ED;color:#C2410C;border:1px solid #FED7AA;';
  if (tag === 'SEO') return 'background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE;';
  return 'background:#ECFDF5;color:#065F46;border:1px solid #A7F3D0;';
}

function priorityStyle(priority: Priority): string {
  return priority === 'Alta'
    ? 'background:#FEE2E2;color:#991B1B;border:1px solid #FECACA;'
    : 'background:#FEF9C3;color:#854D0E;border:1px solid #FDE68A;';
}

function buildCardsHtml(cards: PromptCard[], offset = 0): string {
  return cards.map((card, idx) => {
    const preId = `cz-pre-${offset + idx}`;
    const btnId = `cz-btn-${offset + idx}`;
    return `
    <div data-card style="border:1px solid #e5e5e5;border-radius:8px;padding:18px 20px;margin:14px 0;background:#fafafa;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          ${card.sources.map(s => `<span style="display:inline-block;padding:2px 9px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:0.04em;${sourceColor(s)}">${htmlEscape(s)}</span>`).join('')}
          <span style="font-size:14px;font-weight:700;color:#111;">${htmlEscape(card.label)}</span>
        </div>
        <span style="display:inline-block;padding:3px 11px;border-radius:20px;font-size:12px;font-weight:700;white-space:nowrap;flex-shrink:0;${priorityStyle(card.priority)}">${htmlEscape(card.priority)}</span>
      </div>
      <div style="position:relative;">
        <div style="background:#f4f4f4;border-left:4px solid #2563EB;border-radius:0 6px 6px 0;padding:14px 16px;padding-right:90px;">
          <pre id="${preId}" style="font-family:'Courier New',monospace;font-size:13px;color:#1e293b;white-space:pre-wrap;word-break:break-word;margin:0;line-height:1.6;">${htmlEscape(card.promptText)}</pre>
        </div>
        <button id="${btnId}" onclick="(function(){var t=document.getElementById('${preId}').textContent;var b=document.getElementById('${btnId}');navigator.clipboard.writeText(t).then(function(){b.textContent='Copiado';setTimeout(function(){b.textContent='Copiar';},2000)}).catch(function(){b.textContent='Error';setTimeout(function(){b.textContent='Copiar';},2000)});})()" style="position:absolute;top:10px;right:10px;padding:5px 12px;font-size:11px;font-weight:700;border:1px solid #d1d5db;border-radius:4px;background:#fff;cursor:pointer;color:#374151;">Copiar</button>
      </div>
    </div>`;
  }).join('');
}

export function buildCopyZapHtmlBody(
  cards: PromptCard[],
  combinedPrompt: string,
  targetUrl: string,
  reportSources: { label: string; available: boolean }[],
): string {
  const sourceStatusHtml = reportSources.map(({ label, available }) => `
    <span style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;${
      available
        ? 'background:#DCFCE7;border:1px solid #BBF7D0;color:#166534;'
        : 'background:#F3F4F6;border:1px solid #E5E7EB;color:#9CA3AF;'
    }">
      ${available ? '✓' : '—'} ${htmlEscape(label)}
    </span>`).join('');

  const altaCards = cards.filter(c => c.priority === 'Alta');
  const mediaCards = cards.filter(c => c.priority === 'Media');

  return `
    <h1 style="font-size:28px;font-weight:800;margin:32px 0 4px;color:#111;">Acciones de Copy</h1>
    <p style="color:#666;font-size:14px;margin:0 0 20px;">${htmlEscape(targetUrl)}</p>

    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:28px;">
      ${sourceStatusHtml}
    </div>

    ${cards.length === 0 ? `
      <div style="padding:40px;text-align:center;border:1px solid #e5e5e5;border-radius:8px;color:#888;font-size:14px;">
        No se detectaron problemas de copy relevantes en los análisis disponibles.
      </div>
    ` : `
      ${altaCards.length > 0 ? `
        <h2 style="font-size:18px;font-weight:700;margin:32px 0 8px;color:#111;border-bottom:1px solid #e5e5e5;padding-bottom:8px;">
          Prioridad Alta <span style="font-size:13px;font-weight:500;color:#888;">(${altaCards.length} elemento${altaCards.length !== 1 ? 's' : ''})</span>
        </h2>
        ${buildCardsHtml(altaCards, 0)}
      ` : ''}

      ${mediaCards.length > 0 ? `
        <h2 style="font-size:18px;font-weight:700;margin:32px 0 8px;color:#111;border-bottom:1px solid #e5e5e5;padding-bottom:8px;">
          Prioridad Media <span style="font-size:13px;font-weight:500;color:#888;">(${mediaCards.length} elemento${mediaCards.length !== 1 ? 's' : ''})</span>
        </h2>
        ${buildCardsHtml(mediaCards, altaCards.length)}
      ` : ''}

      <div style="border:2px solid #111;border-radius:8px;padding:24px;margin-top:36px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
          <h3 style="font-size:16px;font-weight:700;margin:0;color:#111;">Prompt completo</h3>
          <button id="cz-combined-btn" onclick="(function(){var b=document.getElementById('cz-combined-btn');var t=document.getElementById('cz-combined-pre').textContent;navigator.clipboard.writeText(t).then(function(){b.textContent='Copiado';setTimeout(function(){b.textContent='Copiar todo';},2000)}).catch(function(){b.textContent='Error';setTimeout(function(){b.textContent='Copiar todo';},2000)});})()" style="padding:6px 14px;font-size:12px;font-weight:700;border:1px solid #d1d5db;border-radius:4px;background:#fff;cursor:pointer;color:#374151;">Copiar todo</button>
        </div>
        <div style="background:#f9fafb;border-left:4px solid #111;border-radius:0 6px 6px 0;padding:18px 20px;">
          <pre id="cz-combined-pre" style="font-family:'Courier New',monospace;font-size:13px;color:#1e293b;white-space:pre-wrap;word-break:break-word;margin:0;line-height:1.65;">${htmlEscape(combinedPrompt)}</pre>
        </div>
      </div>
    `}
  `;
}

export function exportCopyZapToHtml(
  cards: PromptCard[],
  combinedPrompt: string,
  targetUrl: string,
  reportSources: { label: string; available: boolean }[],
  brandName = '',
): void {
  const body = buildCopyZapHtmlBody(cards, combinedPrompt, targetUrl, reportSources);
  const html = buildHtmlPage('Acciones de Copy', 'Acciones de Copy', targetUrl, body);
  const slug = (brandName || 'report').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  triggerHtmlDownload(html, `copyzap-send-${slug}-${fileDate()}.html`);
}
