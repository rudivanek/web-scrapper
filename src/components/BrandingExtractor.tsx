import { useState } from 'react';
import { scrapeBranding, extractFontFileUrls, extractCssData, type FontFileInfo, type CssExtractResult } from '../lib/firecrawl';
import { generateBrandingMarkdown } from '../lib/markdownFormatters';
import { ApiKeyModal } from './ApiKeyModal';
import { Palette, Type, Image, Loader2, ExternalLink, Copy, Check, ChevronDown, ChevronUp, AlertCircle, Layers, LayoutGrid as Layout, Sparkles, Sun, Moon, Zap, Box, FileDown, Download, Code2, Variable, Film, Monitor } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BrandingFont {
  family?: string;
  [key: string]: string | undefined;
}

interface BrandingTypography {
  fontFamilies?: Record<string, string>;
  fontSizes?: Record<string, string>;
  fontWeights?: Record<string, string | number>;
  lineHeights?: Record<string, string | number>;
}

interface BrandingSpacing {
  baseUnit?: string | number;
  borderRadius?: string;
  padding?: string | Record<string, string>;
  margins?: string | Record<string, string>;
  scale?: Record<string, string>;
  [key: string]: unknown;
}

interface BrandingImages {
  logo?: string;
  favicon?: string;
  ogImage?: string;
  [key: string]: string | undefined;
}

interface BrandingComponentStyle {
  background?: string;
  backgroundColor?: string;
  textColor?: string;
  color?: string;
  borderRadius?: string;
  borderColor?: string;
  border?: string;
  fontSize?: string;
  fontWeight?: string | number;
  padding?: string;
  [key: string]: string | number | undefined;
}

interface BrandingComponents {
  [componentName: string]: BrandingComponentStyle | unknown;
}

interface BrandingAnimations {
  [key: string]: string | number | unknown;
}

interface BrandingLayout {
  [key: string]: string | number | unknown;
}

interface BrandingPersonality {
  [key: string]: string | string[] | unknown;
}

interface BrandingData {
  colorScheme?: 'light' | 'dark' | string;
  logo?: string;
  favicon?: string;
  ogImage?: string;
  colors?: Record<string, string> | Array<{ name?: string; value?: string; hex?: string; [k: string]: string | undefined }>;
  fonts?: BrandingFont[];
  typography?: BrandingTypography;
  spacing?: BrandingSpacing;
  components?: BrandingComponents;
  images?: BrandingImages;
  animations?: BrandingAnimations;
  layout?: BrandingLayout;
  personality?: BrandingPersonality;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isHexLike(v: string): boolean {
  return v.startsWith('#') || /^[0-9a-fA-F]{3,6}$/.test(v);
}

function normalizeHex(v: string): string {
  return v.startsWith('#') ? v : `#${v}`;
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length !== 3 && h.length !== 6) return '';
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return isNaN(r) ? '' : `rgb(${r}, ${g}, ${b})`;
}

function isLightColor(hex: string): boolean {
  const h = hex.replace('#', '');
  if (h.length !== 6 && h.length !== 3) return true;
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

function resolveColorEntries(
  colors: BrandingData['colors']
): Array<{ name: string; value: string }> {
  if (!colors) return [];
  if (Array.isArray(colors)) {
    return colors.flatMap((c, i) => {
      const name = c.name || c.label || `Color ${i + 1}`;
      const value =
        c.value || c.hex || c.color ||
        Object.values(c).find(v => v && typeof v === 'string' && (isHexLike(v) || v.startsWith('rgb'))) || '';
      return value ? [{ name: String(name), value: String(value) }] : [];
    });
  }
  return Object.entries(colors).flatMap(([name, value]) =>
    value ? [{ name, value }] : []
  );
}

// ─── Google Fonts alternative map ────────────────────────────────────────────

const GOOGLE_FONT_ALTERNATIVES: Record<string, { name: string; slug: string }> = {
  'sf pro': { name: 'Inter', slug: 'Inter' },
  'sf ns': { name: 'Inter', slug: 'Inter' },
  'sf compact': { name: 'Inter', slug: 'Inter' },
  '-apple-system': { name: 'Inter', slug: 'Inter' },
  'blinkmacsystemfont': { name: 'Inter', slug: 'Inter' },
  'new york': { name: 'Lora', slug: 'Lora' },
  'segoe ui': { name: 'Open Sans', slug: 'Open+Sans' },
  'helvetica neue': { name: 'Inter', slug: 'Inter' },
  'helvetica': { name: 'Roboto', slug: 'Roboto' },
  'arial': { name: 'Roboto', slug: 'Roboto' },
  'georgia': { name: 'Merriweather', slug: 'Merriweather' },
  'times new roman': { name: 'Merriweather', slug: 'Merriweather' },
  'times': { name: 'Lora', slug: 'Lora' },
  'tahoma': { name: 'Noto Sans', slug: 'Noto+Sans' },
  'verdana': { name: 'Inter', slug: 'Inter' },
  'trebuchet ms': { name: 'Roboto', slug: 'Roboto' },
  'impact': { name: 'Bebas Neue', slug: 'Bebas+Neue' },
  'courier new': { name: 'Courier Prime', slug: 'Courier+Prime' },
  'courier': { name: 'IBM Plex Mono', slug: 'IBM+Plex+Mono' },
  'system-ui': { name: 'Inter', slug: 'Inter' },
};

function getGoogleFontsAlternative(fontFamily: string): { name: string; slug: string } | null {
  const key = fontFamily.toLowerCase().replace(/['"]/g, '').split(',')[0].trim();
  return GOOGLE_FONT_ALTERNATIVES[key] ?? null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ColorSwatch({ name, value }: { name: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const displayValue = isHexLike(value) ? normalizeHex(value) : value;
  const isLight = isHexLike(value) ? isLightColor(normalizeHex(value)) : true;
  const rgb = isHexLike(value) ? hexToRgb(normalizeHex(value)) : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(displayValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="group flex flex-col rounded-lg overflow-hidden border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5"
      onClick={handleCopy}
      title={`Click to copy ${displayValue}`}
    >
      <div
        className="h-14 w-full flex items-center justify-center relative"
        style={{ backgroundColor: displayValue }}
      >
        <span className={`text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity ${isLight ? 'text-gray-800' : 'text-white'}`}>
          {copied ? '✓ copied' : 'click to copy'}
        </span>
      </div>
      <div className="px-2 py-2 bg-white">
        <p className="text-xs font-medium text-gray-700 truncate capitalize">{name}</p>
        <p className="text-xs text-gray-500 font-mono truncate">{displayValue}</p>
        {rgb && <p className="text-xs text-gray-300 font-mono truncate">{rgb}</p>}
      </div>
    </div>
  );
}

function Section({
  title, icon, children, defaultOpen = true, badge,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <span className="text-gray-500">{icon}</span>
          <span className="font-semibold text-gray-800">{title}</span>
          {badge && (
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{badge}</span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 w-36 shrink-0">{label}</span>
      <span className="text-sm text-gray-800 font-mono flex-1 mr-2 truncate">{value}</span>
      <button
        onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="p-1 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

function ColorDot({ value }: { value: string }) {
  const displayValue = isHexLike(value) ? normalizeHex(value) : value;
  return (
    <span
      className="inline-block w-3 h-3 rounded-full border border-gray-200 mr-1.5 shrink-0"
      style={{ backgroundColor: displayValue }}
    />
  );
}

function ComponentCard({ name, styles }: { name: string; styles: unknown }) {
  const entries = styles && typeof styles === 'object' && !Array.isArray(styles)
    ? Object.entries(styles as Record<string, unknown>).filter(([, v]) => v !== null && v !== undefined)
    : [];

  const colorKeys = ['background', 'backgroundColor', 'textColor', 'color', 'borderColor'];

  return (
    <div className="border border-gray-100 rounded-lg p-4 bg-white">
      <div className="flex items-center space-x-2 mb-3">
        <Box className="w-3.5 h-3.5 text-gray-400" />
        <p className="text-sm font-semibold text-gray-700 capitalize">{name.replace(/([A-Z])/g, ' $1').trim()}</p>
      </div>
      {/* Mini preview for button-like components */}
      {entries.length > 0 && (
        <div className="mb-3">
          {(() => {
            const bg = (styles as Record<string, string>)?.background || (styles as Record<string, string>)?.backgroundColor;
            const text = (styles as Record<string, string>)?.textColor || (styles as Record<string, string>)?.color;
            const br = (styles as Record<string, string>)?.borderRadius;
            const bc = (styles as Record<string, string>)?.borderColor;
            if (bg || text) {
              return (
                <div
                  className="inline-flex items-center px-4 py-2 text-xs font-medium border"
                  style={{
                    backgroundColor: bg || 'transparent',
                    color: text || '#333',
                    borderRadius: br || '4px',
                    borderColor: bc || (bg ? 'transparent' : '#ccc'),
                  }}
                >
                  Preview
                </div>
              );
            }
            return null;
          })()}
        </div>
      )}
      <div className="space-y-1">
        {entries.map(([prop, val]) => (
          <div key={prop} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
            <span className="text-xs text-gray-400 w-28 shrink-0 capitalize">{prop.replace(/([A-Z])/g, ' $1').trim()}</span>
            <span className="text-xs text-gray-700 font-mono flex items-center">
              {colorKeys.includes(prop) && typeof val === 'string' && (isHexLike(val) || val.startsWith('rgb')) && (
                <ColorDot value={val} />
              )}
              {String(val)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KVGrid({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {Object.entries(data).map(([k, v]) => (
        v !== null && v !== undefined ? (
          <div key={k} className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-400 capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</p>
            <p className="text-sm font-mono text-gray-700 truncate">{String(v)}</p>
          </div>
        ) : null
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BrandingExtractor({ anthropicKey }: { anthropicKey?: string }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [fontFiles, setFontFiles] = useState<FontFileInfo[]>([]);
  const [cssData, setCssData] = useState<CssExtractResult | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawExpanded, setRawExpanded] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [exportingMd, setExportingMd] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [localApiKey, setLocalApiKey] = useState<string | null>(null);

  const resolvedApiKey = localApiKey || anthropicKey || null;

  const handleExtract = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const normalized = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    setLoading(true);
    setError(null);
    setBranding(null);
    setScreenshot(null);
    setFontFiles([]);
    setCssData(null);

    try {
      const [result, fontUrls, cssResult] = await Promise.allSettled([
        scrapeBranding(normalized),
        extractFontFileUrls(normalized),
        extractCssData(normalized),
      ]);

      if (result.status === 'rejected') throw result.reason;
      const data: BrandingData = result.value?.data?.branding ?? result.value?.branding ?? null;
      if (!data) throw new Error('No branding data returned. The site may not have detectable brand assets.');
      setBranding(data);
      const shot = result.value?.data?.screenshot ?? result.value?.screenshot ?? null;
      if (shot) setScreenshot(shot);
      if (fontUrls.status === 'fulfilled') setFontFiles(fontUrls.value);
      if (cssResult.status === 'fulfilled' && cssResult.value) setCssData(cssResult.value);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to extract branding');
    } finally {
      setLoading(false);
    }
  };

  const runExportWithKey = async (key: string) => {
    if (!branding) return;
    setExportingMd(true);
    setExportError(null);
    try {
      const hostname = (() => { try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, ''); } catch { return url; } })();
      const siteName = hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
      const md = await generateBrandingMarkdown(branding, siteName, url, key, fontFiles, cssData);
      const blob = new Blob([md], { type: 'text/markdown' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${hostname}-brand-system.md`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e: unknown) {
      setExportError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExportingMd(false);
    }
  };

  const handleExportMarkdown = () => {
    if (!branding) return;
    if (!resolvedApiKey) {
      setShowApiKeyModal(true);
      return;
    }
    runExportWithKey(resolvedApiKey);
  };

  const handleApiKeyConfirmed = (key: string) => {
    setLocalApiKey(key);
    setShowApiKeyModal(false);
    runExportWithKey(key);
  };

  const colorEntries = resolveColorEntries(branding?.colors);

  // Resolve images — may be in branding.images or top-level
  const logoUrl = branding?.images?.logo ?? branding?.logo;
  const faviconUrl = branding?.images?.favicon ?? branding?.favicon;
  const ogImageUrl = branding?.images?.ogImage ?? branding?.ogImage;
  const hasAssets = logoUrl || faviconUrl || ogImageUrl;

  // Fonts: deduplicate from both fonts[] and typography.fontFamilies
  const fontFamilies: string[] = [];
  (branding?.fonts ?? []).forEach(f => {
    if (f.family && !fontFamilies.includes(f.family)) fontFamilies.push(f.family);
  });
  Object.values(branding?.typography?.fontFamilies ?? {}).forEach(fam => {
    if (fam && !fontFamilies.includes(fam)) fontFamilies.push(fam);
  });

  const components = branding?.components ?? {};
  const hasComponents = Object.keys(components).length > 0;

  const spacing = branding?.spacing;
  const hasSpacing = spacing && Object.keys(spacing).length > 0;

  const animations = branding?.animations;
  const hasAnimations = animations && Object.keys(animations).length > 0;

  const layout = branding?.layout;
  const hasLayout = layout && Object.keys(layout).length > 0;

  const personality = branding?.personality;
  const hasPersonality = personality && Object.keys(personality).length > 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {showApiKeyModal && (
        <ApiKeyModal
          onKeyConfirmed={handleApiKeyConfirmed}
          onSkip={() => setShowApiKeyModal(false)}
        />
      )}

      {/* Header */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Brand Identity Extractor</h2>
        <p className="text-sm text-gray-500">
          Extract a complete brand profile from any website — colors, typography, logos, components, and more.
        </p>
      </div>

      {/* Input */}
      <div className="mb-8 flex gap-3">
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !loading && handleExtract()}
          placeholder="https://example.com"
          className="flex-1 border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600"
        />
        <button
          onClick={handleExtract}
          disabled={loading || !url.trim()}
          className="px-6 py-2.5 bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2 shrink-0"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /><span>Extracting...</span></>
          ) : (
            <><Palette className="w-4 h-4" /><span>Extract Branding</span></>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {branding && (
        <div className="space-y-4">

          {/* Export action bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs text-gray-400">Branding extracted successfully.</p>
            <div className="flex items-center gap-2">
              {exportError && (
                <span className="text-xs text-red-600 flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{exportError}</span>
                </span>
              )}
              <button
                onClick={handleExportMarkdown}
                disabled={exportingMd}
                title="Export brand design system as .md"
                className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded"
              >
                {exportingMd ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /><span>Generating .md...</span></>
                ) : (
                  <><FileDown className="w-4 h-4" /><span>Export as .md</span></>
                )}
              </button>
            </div>
          </div>

          {/* Color scheme badge + screenshot */}
          <div className="flex flex-col sm:flex-row gap-4">
            {branding.colorScheme && (
              <div className="flex items-center space-x-2 px-4 py-3 border border-gray-200 rounded-lg bg-white shrink-0">
                {branding.colorScheme === 'dark'
                  ? <Moon className="w-4 h-4 text-gray-600" />
                  : <Sun className="w-4 h-4 text-amber-500" />
                }
                <span className="text-sm font-medium text-gray-700 capitalize">{branding.colorScheme} theme</span>
              </div>
            )}
            {screenshot && (
              <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-3 py-1.5 flex items-center space-x-1.5 border-b border-gray-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  <span className="ml-2 text-xs text-gray-400 font-mono truncate">{url}</span>
                </div>
                <img src={screenshot} alt="Site screenshot" className="w-full object-cover max-h-48" />
              </div>
            )}
          </div>

          {/* Brand Assets */}
          {hasAssets && (
            <Section title="Brand Assets" icon={<Image className="w-4 h-4" />}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {logoUrl && (
                  <AssetCard label="Logo" src={logoUrl} />
                )}
                {faviconUrl && (
                  <AssetCard label="Favicon" src={faviconUrl} />
                )}
                {ogImageUrl && (
                  <AssetCard label="OG Image" src={ogImageUrl} />
                )}
              </div>
            </Section>
          )}

          {/* Color Palette */}
          {colorEntries.length > 0 && (
            <Section
              title="Color Palette"
              icon={<Palette className="w-4 h-4" />}
              badge={`${colorEntries.length} colors`}
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {colorEntries.map((c, i) => (
                  <ColorSwatch key={i} name={c.name} value={c.value} />
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-400">Click any swatch to copy the color value.</p>
            </Section>
          )}

          {/* Typography */}
          {(fontFamilies.length > 0 || branding.typography) && (
            <Section title="Typography" icon={<Type className="w-4 h-4" />}>
              {/* Font family previews */}
              {fontFamilies.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Font Families</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {fontFamilies.map((fam, i) => {
                      const famLower = fam.toLowerCase().replace(/['"]/g, '');
                      // Google Fonts check
                      const googleFontsUrl = `https://fonts.google.com/specimen/${encodeURIComponent(fam.replace(/\s+/g, '+'))}`;
                      // Self-hosted font files matching this family
                      const selfHosted = fontFiles.filter(f =>
                        f.family.toLowerCase().replace(/['"]/g, '') === famLower
                      );
                      const isSystemFont = /^(arial|helvetica|georgia|times(?: new roman)?|verdana|trebuchet(?: ms)?|courier(?: new)?|impact|tahoma|sf pro|sf ns|sf compact|new york|system-ui|-apple-system|blinkmacsystemfont|segoe ui|roboto|ubuntu|cantarell|noto sans|droid sans|pingfang|hiragino|lucida grande|monaco|menlo|consolas)$/i.test(fam.trim().replace(/,.*$/, '').trim());

                      return (
                        <div key={i} className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                          <p className="text-xs text-gray-400 mb-1">
                            {(() => {
                              const entries = Object.entries(branding.typography?.fontFamilies ?? {});
                              const match = entries.find(([, v]) => v === fam);
                              return match ? match[0] : `Font ${i + 1}`;
                            })()}
                          </p>
                          <p className="text-2xl text-gray-800 truncate" style={{ fontFamily: fam }}>
                            Aa Bb Cc 123
                          </p>
                          <p className="text-xs text-gray-500 font-mono mt-1 mb-3">{fam}</p>

                          {/* Download / use links */}
                          <div className="flex flex-col gap-1.5">
                            {isSystemFont ? (
                              <>
                                <span className="text-xs text-gray-400 italic">
                                  {/^(sf |new york|blinkmacsystemfont|-apple-system)/i.test(fam.trim())
                                    ? 'Apple system font — built into macOS/iOS, not available for download'
                                    : 'System font — pre-installed on most devices, no download needed'}
                                </span>
                                {(() => {
                                  const alt = getGoogleFontsAlternative(fam);
                                  if (!alt) return null;
                                  return (
                                    <div className="mt-1 pt-1.5 border-t border-gray-200">
                                      <p className="text-xs text-gray-400 mb-1">Similar on Google Fonts:</p>
                                      <a
                                        href={`https://fonts.google.com/specimen/${alt.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center space-x-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        <span>{alt.name}</span>
                                      </a>
                                    </div>
                                  );
                                })()}
                              </>
                            ) : selfHosted.length > 0 ? (
                              <>
                                <p className="text-xs font-semibold text-gray-500 mb-0.5">Self-hosted font files:</p>
                                {selfHosted.map((ff, j) => (
                                  <a
                                    key={j}
                                    href={ff.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center space-x-1.5 text-xs text-blue-600 hover:text-blue-800 font-mono truncate"
                                    title={ff.url}
                                  >
                                    <Download className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{ff.url.split('/').pop()?.split('?')[0]}</span>
                                    <span className="text-gray-400 shrink-0 uppercase">.{ff.format}</span>
                                  </a>
                                ))}
                                {(() => {
                                  const alt = getGoogleFontsAlternative(fam);
                                  if (!alt) return null;
                                  return (
                                    <div className="mt-1 pt-1.5 border-t border-gray-200">
                                      <p className="text-xs text-gray-400 mb-1">Similar on Google Fonts:</p>
                                      <a
                                        href={`https://fonts.google.com/specimen/${alt.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center space-x-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        <span>{alt.name}</span>
                                      </a>
                                    </div>
                                  );
                                })()}
                              </>
                            ) : (
                              <a
                                href={googleFontsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>View on Google Fonts</span>
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Font sizes */}
              {branding.typography?.fontSizes && Object.keys(branding.typography.fontSizes).length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Font Sizes</p>
                  <div className="space-y-1">
                    {Object.entries(branding.typography.fontSizes).map(([k, v]) => (
                      <div key={k} className="flex items-center py-2 border-b border-gray-100 last:border-0">
                        <span className="w-16 text-xs text-gray-400">{k}</span>
                        <span className="flex-1 font-mono text-gray-700" style={{ fontSize: v }}>{v}</span>
                        <span className="text-xs text-gray-400 font-mono">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Font weights */}
              {branding.typography?.fontWeights && Object.keys(branding.typography.fontWeights).length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Font Weights</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(branding.typography.fontWeights).map(([k, v]) => (
                      <div key={k} className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-xs text-gray-400">{k}</p>
                        <p className="text-sm font-mono text-gray-700" style={{ fontWeight: Number(v) || undefined }}>
                          {String(v)} — Aa
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Line heights */}
              {branding.typography?.lineHeights && Object.keys(branding.typography.lineHeights).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Line Heights</p>
                  <KVGrid data={branding.typography.lineHeights as Record<string, unknown>} />
                </div>
              )}
            </Section>
          )}

          {/* Spacing */}
          {hasSpacing && (
            <Section title="Spacing" icon={<Layout className="w-4 h-4" />} defaultOpen={false}>
              <div className="space-y-4">
                {spacing!.baseUnit !== undefined && (
                  <CopyRow label="Base Unit" value={String(spacing!.baseUnit)} />
                )}
                {spacing!.borderRadius && typeof spacing!.borderRadius === 'string' && (
                  <div className="flex items-center space-x-4 py-2">
                    <span className="text-sm text-gray-500 w-36 shrink-0">Border Radius</span>
                    <div
                      className="w-12 h-12 bg-gray-200 border border-gray-300"
                      style={{ borderRadius: spacing!.borderRadius }}
                    />
                    <span className="text-sm font-mono text-gray-700">{spacing!.borderRadius}</span>
                  </div>
                )}
                {spacing!.padding && typeof spacing!.padding === 'string' && (
                  <CopyRow label="Padding" value={spacing!.padding} />
                )}
                {spacing!.margins && typeof spacing!.margins === 'string' && (
                  <CopyRow label="Margins" value={spacing!.margins} />
                )}
                {spacing!.scale && Object.keys(spacing!.scale).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Scale</p>
                    <div className="space-y-1">
                      {Object.entries(spacing!.scale).map(([k, v]) => (
                        <div key={k} className="flex items-center py-1.5 border-b border-gray-100 last:border-0">
                          <span className="text-xs text-gray-400 w-16">{k}</span>
                          <div className="flex items-center flex-1 space-x-3">
                            <div className="bg-blue-200 h-3 rounded" style={{ width: v }} />
                            <span className="text-xs font-mono text-gray-600">{v}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Any remaining spacing keys */}
                {Object.entries(spacing!).filter(([k]) =>
                  !['baseUnit', 'borderRadius', 'padding', 'margins', 'scale'].includes(k)
                ).map(([k, v]) => v !== null && v !== undefined && typeof v === 'string' ? (
                  <CopyRow key={k} label={k} value={v} />
                ) : null)}
              </div>
            </Section>
          )}

          {/* UI Components */}
          {hasComponents && (
            <Section
              title="UI Components"
              icon={<Layers className="w-4 h-4" />}
              badge={`${Object.keys(components).length}`}
              defaultOpen={false}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(components).map(([name, styles]) => (
                  <ComponentCard key={name} name={name} styles={styles} />
                ))}
              </div>
            </Section>
          )}

          {/* Animations */}
          {hasAnimations && (
            <Section title="Animations & Transitions" icon={<Zap className="w-4 h-4" />} defaultOpen={false}>
              <div className="space-y-1">
                {Object.entries(animations!).map(([k, v]) =>
                  v !== null && v !== undefined ? (
                    <CopyRow key={k} label={k} value={String(v)} />
                  ) : null
                )}
              </div>
            </Section>
          )}

          {/* Layout */}
          {hasLayout && (
            <Section title="Layout System" icon={<Layout className="w-4 h-4" />} defaultOpen={false}>
              <div className="space-y-1">
                {Object.entries(layout!).map(([k, v]) =>
                  v !== null && v !== undefined ? (
                    typeof v === 'object' ? (
                      <div key={k} className="mb-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{k}</p>
                        <KVGrid data={v as Record<string, unknown>} />
                      </div>
                    ) : (
                      <CopyRow key={k} label={k} value={String(v)} />
                    )
                  ) : null
                )}
              </div>
            </Section>
          )}

          {/* Personality */}
          {hasPersonality && (
            <Section title="Brand Personality" icon={<Sparkles className="w-4 h-4" />} defaultOpen={false}>
              <div className="space-y-3">
                {Object.entries(personality!).map(([k, v]) => {
                  if (v === null || v === undefined) return null;
                  if (Array.isArray(v)) {
                    return (
                      <div key={k}>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{k}</p>
                        <div className="flex flex-wrap gap-2">
                          {(v as string[]).map((item, i) => (
                            <span key={i} className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-full border border-gray-200">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={k} className="py-2 border-b border-gray-100 last:border-0">
                      <p className="text-xs text-gray-400 capitalize mb-0.5">{k}</p>
                      <p className="text-sm text-gray-700">{String(v)}</p>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* CSS Inspector */}
          {cssData && <CssInspector data={cssData} />}

          {/* Raw JSON */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setRawExpanded(o => !o)}
              className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="font-semibold text-gray-800 text-sm">Raw JSON Response</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(JSON.stringify(branding, null, 2));
                    setCopiedRaw(true);
                    setTimeout(() => setCopiedRaw(false), 1500);
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {copiedRaw ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
                {rawExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>
            {rawExpanded && (
              <pre className="p-5 text-xs font-mono bg-gray-900 text-green-400 overflow-auto max-h-96 leading-relaxed">
                {JSON.stringify(branding, null, 2)}
              </pre>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

// ─── CSS Inspector ────────────────────────────────────────────────────────────

function CssColorSwatch({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const isLight = (() => {
    const hex = value.replace('#', '');
    if (hex.length === 3 || hex.length === 6) {
      const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
      const r = parseInt(full.slice(0, 2), 16);
      const g = parseInt(full.slice(2, 4), 16);
      const b = parseInt(full.slice(4, 6), 16);
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
    }
    return true;
  })();

  return (
    <div
      className="group flex flex-col rounded-lg overflow-hidden border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5"
      onClick={handleCopy}
      title={`Click to copy ${value}`}
    >
      <div
        className="h-12 w-full flex items-center justify-center relative"
        style={{ backgroundColor: value }}
      >
        <span className={`text-xs opacity-0 group-hover:opacity-100 transition-opacity ${isLight ? 'text-gray-800' : 'text-white'}`}>
          {copied ? '✓' : 'copy'}
        </span>
      </div>
      <div className="px-2 py-1.5 bg-white">
        <p className="text-xs font-mono text-gray-600 truncate">{value}</p>
      </div>
    </div>
  );
}

function CssInspector({ data }: { data: CssExtractResult }) {
  const [activeTab, setActiveTab] = useState<'tokens' | 'colors' | 'fonts' | 'keyframes' | 'media' | 'raw'>('tokens');
  const [copiedSheet, setCopiedSheet] = useState<string | null>(null);
  const [expandedSheet, setExpandedSheet] = useState<string | null>(null);

  const totalSize = data.sheets.reduce((s, sh) => s + sh.size, 0);
  const fmtKb = (n: number) => `${(n / 1024).toFixed(1)} KB`;

  const tabs = [
    { id: 'tokens' as const, label: `Tokens (${data.customProperties.length})`, icon: <Variable className="w-3.5 h-3.5" /> },
    { id: 'colors' as const, label: `Colors (${data.colors.length})`, icon: <Palette className="w-3.5 h-3.5" /> },
    { id: 'fonts' as const, label: `Fonts (${data.fonts.length})`, icon: <Type className="w-3.5 h-3.5" /> },
    { id: 'keyframes' as const, label: `Keyframes (${data.keyframes.length})`, icon: <Film className="w-3.5 h-3.5" /> },
    { id: 'media' as const, label: `Media (${data.mediaQueries.length})`, icon: <Monitor className="w-3.5 h-3.5" /> },
    { id: 'raw' as const, label: `Raw CSS (${data.sheets.length} sheets)`, icon: <Code2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <Section
      title="CSS Inspector"
      icon={<Code2 className="w-4 h-4" />}
      badge={`${fmtKb(totalSize)} total`}
      defaultOpen={false}
    >
      {/* Sheet summary */}
      <div className="mb-4 flex flex-wrap gap-2">
        {data.sheets.map((sh, i) => (
          <span key={i} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded font-mono truncate max-w-xs" title={sh.url}>
            {sh.isInline ? `inline-${i + 1}` : sh.url.split('/').pop()?.split('?')[0] || sh.url} — {fmtKb(sh.size)}
          </span>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-4 border-b border-gray-200 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              activeTab === tab.id
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'tokens' && (
        <div>
          {data.customProperties.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No CSS custom properties found.</p>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {data.customProperties.map((cp, i) => (
                <div key={i} className="flex items-start py-1.5 border-b border-gray-100 last:border-0 gap-3">
                  <code className="text-xs text-blue-700 font-mono w-48 shrink-0 truncate" title={cp.name}>{cp.name}</code>
                  <code className="text-xs text-gray-700 font-mono flex-1 truncate" title={cp.value}>{cp.value}</code>
                  <span className="text-xs text-gray-400 shrink-0 truncate max-w-[140px]" title={cp.selector}>{cp.selector}</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(`${cp.name}: ${cp.value};`); }}
                    className="p-1 text-gray-400 hover:text-gray-600 shrink-0"
                    title="Copy declaration"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'colors' && (
        <div>
          {data.colors.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No color values found.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {data.colors.map((c, i) => (
                <div key={i} className="flex flex-col">
                  <CssColorSwatch value={c.value} />
                  <p className="text-xs text-gray-400 mt-1 text-center">×{c.count}</p>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-gray-400">Sorted by frequency. Click any swatch to copy.</p>
        </div>
      )}

      {activeTab === 'fonts' && (
        <div>
          {data.fonts.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No font declarations found.</p>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {data.fonts.map((f, i) => (
                <div key={i} className="flex items-start py-1.5 border-b border-gray-100 last:border-0 gap-3">
                  <code className="text-xs text-emerald-700 font-mono w-36 shrink-0">{f.property}</code>
                  <code className="text-xs text-gray-700 font-mono flex-1 truncate" title={f.value}>{f.value}</code>
                  <span className="text-xs text-gray-400 shrink-0 truncate max-w-[140px]" title={f.selector}>{f.selector}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'keyframes' && (
        <div>
          {data.keyframes.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No keyframe animations found.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {data.keyframes.map((kf, i) => (
                <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <code className="text-xs font-semibold text-gray-700">@keyframes {kf.name}</code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(kf.raw); }}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <pre className="p-3 text-xs font-mono text-gray-600 bg-gray-900 text-green-400 overflow-auto max-h-48">{kf.raw}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'media' && (
        <div>
          {data.mediaQueries.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No media queries found.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data.mediaQueries.map((mq, i) => (
                <div key={i} className="border border-gray-100 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
                    <code className="text-xs font-semibold text-gray-700 truncate flex-1 mr-2" title={mq.query}>@media {mq.query}</code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(mq.raw); }}
                      className="p-1 text-gray-400 hover:text-gray-600 shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'raw' && (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {Object.entries(data.rawCss).map(([sheetUrl, css]) => (
            <div key={sheetUrl} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                <span className="text-xs text-gray-600 font-mono truncate flex-1 mr-2" title={sheetUrl}>
                  {sheetUrl.startsWith('inline') ? sheetUrl : (sheetUrl.split('/').pop()?.split('?')[0] || sheetUrl)}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(css);
                      setCopiedSheet(sheetUrl);
                      setTimeout(() => setCopiedSheet(null), 1500);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Copy CSS"
                  >
                    {copiedSheet === sheetUrl ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => setExpandedSheet(expandedSheet === sheetUrl ? null : sheetUrl)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    {expandedSheet === sheetUrl ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              {expandedSheet === sheetUrl && (
                <pre className="p-4 text-xs font-mono bg-gray-900 text-green-400 overflow-auto max-h-80 leading-relaxed whitespace-pre-wrap break-all">
                  {css}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ─── Asset Card helper ────────────────────────────────────────────────────────

function AssetCard({ label, src }: { label: string; src: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 w-full flex items-center justify-center min-h-[100px] mb-2">
        <img src={src} alt={label} className="max-h-16 max-w-full object-contain" />
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        <a href={src} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
