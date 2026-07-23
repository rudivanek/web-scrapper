import { useState, useRef, useEffect } from 'react';
import {
  scrapeForInteract,
  interactWithPrompt,
  interactWithCode,
  endInteractSession,
} from '../lib/firecrawl';
import {
  MousePointer2,
  Loader2,
  AlertCircle,
  Send,
  Code2,
  MessageSquare,
  Trash2,
  ExternalLink,
  MonitorPlay,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  CircleDot,
  Globe,
  RefreshCw,
  Terminal,
  Play,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type StepMode = 'prompt' | 'code';
type CodeLang = 'node' | 'python' | 'bash';

interface StepResult {
  id: string;
  mode: StepMode;
  lang?: CodeLang;
  input: string;
  output?: string;
  result?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  liveViewUrl?: string;
  interactiveLiveViewUrl?: string;
  killed?: boolean;
  error?: string;
  timestamp: Date;
}

interface SessionState {
  scrapeId: string;
  url: string;
  initialScreenshot?: string;
  liveViewUrl?: string;
  interactiveLiveViewUrl?: string;
}

// ─── Templates ────────────────────────────────────────────────────────────────

const CODE_TEMPLATES: Record<CodeLang, Array<{ label: string; code: string }>> = {
  node: [
    { label: 'Get page title', code: "const title = await page.title(); JSON.stringify({ title });" },
    { label: 'Click element', code: "await page.click('.selector');" },
    { label: 'Fill input', code: "await page.fill('input[name=\"email\"]', 'test@example.com');" },
    { label: 'Get text content', code: "const text = await page.$eval('h1', el => el.textContent); JSON.stringify({ text });" },
    { label: 'Get current URL', code: "page.url();" },
    { label: 'Navigate to URL', code: "await page.goto('https://example.com');" },
    { label: 'Wait for selector', code: "await page.waitForSelector('.my-class', { timeout: 5000 });" },
    { label: 'Get all links', code: "const links = await page.$$eval('a', els => els.map(e => ({ text: e.textContent?.trim(), href: e.href }))); JSON.stringify(links.slice(0, 20));" },
  ],
  python: [
    { label: 'Get page title', code: 'import json\ntitle = await page.title()\nprint(json.dumps({"title": title}))' },
    { label: 'Click element', code: "await page.click('.selector')" },
    { label: 'Fill input', code: 'await page.fill(\'input[name="email"]\', \'test@example.com\')' },
    { label: 'Get text', code: "import json\ntext = await page.inner_text('h1')\nprint(json.dumps({'text': text}))" },
    { label: 'Get all links', code: "import json\nlinks = await page.eval_on_selector_all('a', 'els => els.map(e => ({text: e.textContent?.trim(), href: e.href}))')\nprint(json.dumps(links[:20]))" },
  ],
  bash: [
    { label: 'Snapshot (all elements)', code: "agent-browser snapshot" },
    { label: 'Snapshot (interactive only)', code: "agent-browser snapshot -i" },
    { label: 'Get current URL', code: "agent-browser get url" },
    { label: 'Take screenshot', code: "agent-browser screenshot" },
    { label: 'Click element by ref', code: "agent-browser click @e1" },
    { label: 'Fill field by ref', code: 'agent-browser fill @e1 "your text here"' },
    { label: 'Press key', code: "agent-browser press Enter" },
    { label: 'Scroll down', code: "agent-browser scroll down 500" },
    { label: 'Find & click by text', code: 'agent-browser find text "Submit" click' },
    { label: 'Wait for network idle', code: "agent-browser wait --load networkidle" },
    { label: 'Get element text', code: "agent-browser get text @e1" },
    { label: 'Run JS in page', code: 'agent-browser eval "document.title"' },
  ],
};

const PROMPT_EXAMPLES = [
  "Click the first button on the page",
  "Fill in the search box with 'iPhone 15' and submit",
  "Extract all product names and prices",
  "Click the Login button",
  "What form fields are on this page?",
  "Navigate to the About page and extract the team members",
  "Find the pricing section and tell me the plan prices",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepCard({ step, index }: { step: StepResult; index: number }) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const copyOutput = () => {
    const text = step.output || step.result || step.stdout || step.error || '';
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isRunning = !step.output && !step.result && !step.stdout && !step.stderr && !step.error && step.exitCode === undefined;
  const hasError = !!step.error || (step.exitCode !== undefined && step.exitCode !== 0) || step.killed;
  const mainOutput = step.output || step.result;
  const hasOutput = mainOutput || step.stdout || step.stderr;

  return (
    <div className={`border rounded-lg overflow-hidden ${hasError ? 'border-red-200' : 'border-gray-200'}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
          hasError ? 'bg-red-50 hover:bg-red-100' : 'bg-gray-50 hover:bg-gray-100'
        }`}
      >
        <div className="flex items-center space-x-3 min-w-0">
          <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            hasError ? 'bg-red-200 text-red-700' : 'bg-gray-800 text-white'
          }`}>
            {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : index + 1}
          </span>
          <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
            step.mode === 'prompt'
              ? 'bg-blue-100 text-blue-700'
              : step.lang === 'bash'
                ? 'bg-green-100 text-green-700'
                : step.lang === 'python'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-orange-100 text-orange-700'
          }`}>
            {step.mode === 'prompt' ? 'Prompt' : step.lang ?? 'node'}
          </span>
          <span className="text-sm text-gray-700 truncate font-mono">{step.input}</span>
        </div>
        <div className="flex items-center space-x-2 shrink-0 ml-2">
          {step.exitCode !== undefined && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
              step.exitCode === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              exit {step.exitCode}
            </span>
          )}
          {step.killed && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">timeout</span>}
          <span className="text-xs text-gray-400">{step.timestamp.toLocaleTimeString()}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="p-4 space-y-4 bg-white">
          {/* Running indicator */}
          {isRunning && (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Executing...</span>
            </div>
          )}

          {/* Error */}
          {step.error && (
            <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-mono">{step.error}</p>
            </div>
          )}

          {/* AI Output (prompt mode) or result (code mode) */}
          {mainOutput && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {step.mode === 'prompt' ? 'AI Response' : 'Result'}
                </p>
                <button onClick={copyOutput} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-mono">
                {mainOutput}
              </div>
            </div>
          )}

          {/* stdout */}
          {step.stdout && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center space-x-1">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>stdout</span>
                </p>
                {!mainOutput && (
                  <button onClick={copyOutput} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
              <pre className="bg-gray-900 text-green-400 rounded-lg p-3 text-xs font-mono overflow-auto max-h-48 leading-relaxed whitespace-pre-wrap">
                {step.stdout}
              </pre>
            </div>
          )}

          {/* stderr */}
          {step.stderr && (
            <div>
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-1.5 flex items-center space-x-1">
                <Terminal className="w-3.5 h-3.5" />
                <span>stderr</span>
              </p>
              <pre className="bg-gray-900 text-red-400 rounded-lg p-3 text-xs font-mono overflow-auto max-h-32 leading-relaxed whitespace-pre-wrap">
                {step.stderr}
              </pre>
            </div>
          )}

          {/* Live view links */}
          {(step.liveViewUrl || step.interactiveLiveViewUrl) && (
            <div className="flex flex-wrap gap-3">
              {step.liveViewUrl && (
                <a
                  href={step.liveViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 text-xs text-gray-600 hover:text-gray-800 border border-gray-200 rounded px-2.5 py-1.5 hover:bg-gray-50 transition-colors"
                >
                  <MonitorPlay className="w-3.5 h-3.5" />
                  <span>Live View (read-only)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {step.interactiveLiveViewUrl && (
                <a
                  href={step.interactiveLiveViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-2.5 py-1.5 hover:bg-blue-50 transition-colors"
                >
                  <MousePointer2 className="w-3.5 h-3.5" />
                  <span>Interactive Live View</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          {/* No output placeholder */}
          {!isRunning && !hasError && !hasOutput && (
            <p className="text-xs text-gray-400 italic">Action completed — no output returned.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PageInteractor() {
  const [url, setUrl] = useState('');
  const [loadingSession, setLoadingSession] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);
  const [steps, setSteps] = useState<StepResult[]>([]);
  const [mode, setMode] = useState<StepMode>('prompt');
  const [lang, setLang] = useState<CodeLang>('node');
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  const stepsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (steps.length > 0) {
      stepsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [steps]);

  const handleStartSession = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const normalized = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    setLoadingSession(true);
    setSessionError(null);
    setSteps([]);

    try {
      const result = await scrapeForInteract(normalized);
      // scrapeId lives at data.metadata.scrapeId per Firecrawl v2 API
      const scrapeId =
        result?.data?.metadata?.scrapeId ??
        result?.data?.scrapeId ??
        result?.metadata?.scrapeId ??
        result?.scrapeId ??
        result?.id;
      if (!scrapeId) {
        const raw = JSON.stringify(result);
        throw new Error(`No scrapeId found in response. API returned: ${raw.slice(0, 200)}`);
      }
      setSession({
        scrapeId,
        url: normalized,
        initialScreenshot: result?.data?.screenshot ?? result?.screenshot,
        liveViewUrl: result?.data?.metadata?.liveViewUrl ?? result?.liveViewUrl,
        interactiveLiveViewUrl: result?.data?.metadata?.interactiveLiveViewUrl ?? result?.interactiveLiveViewUrl,
      });
    } catch (e: unknown) {
      setSessionError(e instanceof Error ? e.message : 'Failed to start session');
    } finally {
      setLoadingSession(false);
    }
  };

  const handleRunStep = async () => {
    if (!session || !input.trim() || running) return;
    const stepInput = input.trim();
    setInput('');
    setRunning(true);

    const stepId = crypto.randomUUID();
    const optimisticStep: StepResult = {
      id: stepId,
      mode,
      lang: mode === 'code' ? lang : undefined,
      input: stepInput,
      timestamp: new Date(),
    };
    setSteps(prev => [...prev, optimisticStep]);

    try {
      let res;
      if (mode === 'prompt') {
        res = await interactWithPrompt(session.scrapeId, stepInput);
      } else {
        res = await interactWithCode(session.scrapeId, stepInput, lang);
      }

      const completed: StepResult = {
        id: stepId,
        mode,
        lang: mode === 'code' ? lang : undefined,
        input: stepInput,
        output: res?.output ?? undefined,
        result: res?.result ?? undefined,
        stdout: res?.stdout ?? undefined,
        stderr: res?.stderr ?? undefined,
        exitCode: res?.exitCode ?? undefined,
        killed: res?.killed ?? undefined,
        liveViewUrl: res?.liveViewUrl ?? undefined,
        interactiveLiveViewUrl: res?.interactiveLiveViewUrl ?? undefined,
        timestamp: optimisticStep.timestamp,
      };
      setSteps(prev => prev.map(s => s.id === stepId ? completed : s));
    } catch (e: unknown) {
      setSteps(prev => prev.map(s => s.id === stepId ? {
        ...optimisticStep,
        error: e instanceof Error ? e.message : 'Action failed',
      } : s));
    } finally {
      setRunning(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleEndSession = async () => {
    if (!session) return;
    setEndingSession(true);
    try {
      await endInteractSession(session.scrapeId);
    } catch {
      // best-effort
    }
    setSession(null);
    setSteps([]);
    setEndingSession(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && mode === 'prompt') {
      e.preventDefault();
      handleRunStep();
    }
  };

  const templates = mode === 'prompt'
    ? PROMPT_EXAMPLES.map(p => ({ label: p, code: p }))
    : CODE_TEMPLATES[lang];

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Page Interactor</h2>
        <p className="text-sm text-gray-500">
          Scrape a page to open a live browser session, then control it with natural language prompts or code.
        </p>
      </div>

      {/* URL input / session header */}
      {!session ? (
        <div>
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loadingSession && handleStartSession()}
              placeholder="https://example.com"
              className="flex-1 border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600"
            />
            <button
              onClick={handleStartSession}
              disabled={loadingSession || !url.trim()}
              className="px-6 py-2.5 bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2 shrink-0"
            >
              {loadingSession ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Opening session...</span></>
              ) : (
                <><MousePointer2 className="w-4 h-4" /><span>Start Session</span></>
              )}
            </button>
          </div>

          {sessionError && (
            <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-mono whitespace-pre-wrap">{sessionError}</p>
            </div>
          )}

          {/* How it works */}
          <div className="mt-8 border border-gray-200 rounded-lg p-6 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">How it works</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: <Globe className="w-5 h-5" />, title: 'Scrape & Open', desc: 'Paste a URL and click Start Session. Firecrawl opens a live browser and keeps it active.' },
                { icon: <MousePointer2 className="w-5 h-5" />, title: 'Interact', desc: 'Send prompts in plain English, or write Node.js / Python / Bash code. Each step runs in the same session.' },
                { icon: <MonitorPlay className="w-5 h-5" />, title: 'See Results', desc: 'Every action returns AI output or code stdout, plus optional live view links to watch the browser.' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex items-start space-x-3">
                  <div className="shrink-0 w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center">
                    {icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">

          {/* Active session bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-3 min-w-0">
              <CircleDot className="w-4 h-4 text-green-500 shrink-0 animate-pulse" />
              <span className="text-sm font-semibold text-green-800">Live session</span>
              <span className="text-sm text-green-700 font-mono truncate">{session.url}</span>
              <span className="text-xs text-green-600 font-mono hidden sm:block">ID: {session.scrapeId.slice(0, 8)}…</span>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              {session.interactiveLiveViewUrl && (
                <a
                  href={session.interactiveLiveViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-green-300 text-green-700 hover:bg-green-50 rounded transition-colors"
                >
                  <MonitorPlay className="w-3.5 h-3.5" />
                  <span>Live View</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button
                onClick={handleEndSession}
                disabled={endingSession}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-red-300 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
              >
                {endingSession ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>End Session</span>
              </button>
            </div>
          </div>

          {/* Initial screenshot */}
          {session.initialScreenshot && steps.length === 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-3 py-1.5 flex items-center space-x-1.5 border-b border-gray-200">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="w-2 h-2 rounded-full bg-green-400" />
                <span className="ml-2 text-xs text-gray-400 font-mono truncate">{session.url}</span>
              </div>
              <img src={session.initialScreenshot} alt="Initial page state" className="w-full object-cover" />
              <p className="text-xs text-gray-400 text-center py-2 border-t border-gray-100">Initial page state</p>
            </div>
          )}

          {/* Steps */}
          {steps.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Session history — {steps.length} step{steps.length !== 1 ? 's' : ''}
              </p>
              {steps.map((step, i) => (
                <StepCard key={step.id} step={step} index={i} />
              ))}
              <div ref={stepsEndRef} />
            </div>
          )}

          {/* Input area */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Mode toggle */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setMode('prompt')}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium transition-colors ${
                  mode === 'prompt'
                    ? 'bg-white text-gray-900 border-b-2 border-gray-900'
                    : 'bg-gray-50 text-gray-500 hover:text-gray-700'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Prompt</span>
              </button>
              <button
                onClick={() => setMode('code')}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium transition-colors ${
                  mode === 'code'
                    ? 'bg-white text-gray-900 border-b-2 border-gray-900'
                    : 'bg-gray-50 text-gray-500 hover:text-gray-700'
                }`}
              >
                <Code2 className="w-4 h-4" />
                <span>Code</span>
              </button>
            </div>

            {/* Language picker (code mode only) */}
            {mode === 'code' && (
              <div className="flex border-b border-gray-100 bg-gray-50 px-3 py-2 space-x-2">
                {(['node', 'python', 'bash'] as CodeLang[]).map(l => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      lang === l
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {l === 'node' ? 'Node.js' : l === 'python' ? 'Python' : 'Bash (agent-browser)'}
                  </button>
                ))}
              </div>
            )}

            {/* Textarea */}
            <div className="p-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  mode === 'prompt'
                    ? 'Describe what to do... (Enter to send, Shift+Enter for newline)'
                    : lang === 'bash'
                      ? 'agent-browser snapshot -i'
                      : lang === 'python'
                        ? 'import json\ntitle = await page.title()\nprint(json.dumps({"title": title}))'
                        : 'const title = await page.title(); JSON.stringify({ title });'
                }
                rows={mode === 'code' ? 5 : 2}
                className={`w-full resize-none border-0 focus:outline-none text-sm text-gray-800 placeholder-gray-400 leading-relaxed ${
                  mode === 'code' ? 'font-mono bg-gray-50 rounded p-2' : ''
                }`}
                disabled={running}
              />
            </div>

            {/* Templates + send row */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                {/* Template picker */}
                <div className="relative">
                  <button
                    onClick={() => setShowTemplates(o => !o)}
                    className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700 transition-colors px-2 py-1 rounded hover:bg-gray-200"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{mode === 'prompt' ? 'Examples' : 'Templates'}</span>
                    {showTemplates ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {showTemplates && (
                    <div className="absolute bottom-full left-0 mb-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 max-h-72 overflow-y-auto">
                      {templates.map((t, i) => (
                        <button
                          key={i}
                          onClick={() => { setInput(t.code); setShowTemplates(false); inputRef.current?.focus(); }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                        >
                          <span className="text-gray-700 font-medium">{t.label}</span>
                          {mode === 'code' && (
                            <p className="text-gray-400 font-mono truncate mt-0.5">{t.code}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {steps.length > 0 && (
                  <span className="text-xs text-gray-400">{steps.length} action{steps.length !== 1 ? 's' : ''} run</span>
                )}
              </div>

              <button
                onClick={handleRunStep}
                disabled={running || !input.trim()}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded"
              >
                {running ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /><span>Running...</span></>
                ) : (
                  <>{mode === 'prompt' ? <Send className="w-4 h-4" /> : <Play className="w-4 h-4" />}<span>Run</span></>
                )}
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
