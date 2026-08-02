export async function screenshotToBase64(screenshot: string): Promise<string | null> {
  if (screenshot.startsWith('data:image/')) {
    return screenshot.replace(/^data:image\/[^;]+;base64,/, '');
  }
  try {
    const res = await fetch(screenshot);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.replace(/^data:image\/[^;]+;base64,/, ''));
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export interface ClaudeResult {
  text: string;
  stopReason: string | null;
}

export async function callClaudeWithMeta(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  images?: string[]
): Promise<ClaudeResult> {
  const safeImages = (images ?? []).filter(Boolean).slice(0, 4);

  const userContent: unknown = safeImages.length > 0
    ? [
        ...safeImages.map(data => ({
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data },
        })),
        { type: 'text', text: userPrompt },
      ]
    : userPrompt;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase no está configurado: faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY.');
  }

  const doFetch = (content: unknown) =>
    fetch(`${supabaseUrl}/functions/v1/anthropic-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content }],
        stream: true,
      }),
    });

  let response = await doFetch(userContent);

  if (!response.ok && safeImages.length > 0) {
    const errorText = await response.text();
    if (/image/i.test(errorText)) {
      console.warn('Claude rejected image payload — retrying without images. Extraction will run without visual verification.');
      response = await doFetch(userPrompt);
    } else {
      throw new Error(`Anthropic API error: ${errorText}`);
    }
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${error}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let stopReason: string | null = null;
  let buffer = '';
  let droppedEvents = 0;

  /** Parse one complete SSE line. Only ever called with a whole line. */
  const handleLine = (rawLine: string) => {
    const line = rawLine.trimEnd();
    if (!line.startsWith('data:')) return;
    const jsonStr = line.slice(5).trim();
    if (jsonStr === '' || jsonStr === '[DONE]') return;
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
        fullText += parsed.delta.text;
      }
      if (parsed.type === 'message_delta' && parsed.delta?.stop_reason) {
        stopReason = parsed.delta.stop_reason;
      }
      if (parsed.type === 'error') {
        console.error('[stream] API error event:', parsed.error);
      }
    } catch {
      // A complete SSE line that will not parse is a genuine problem, not a
      // chunk-boundary artifact. Never swallow it silently.
      droppedEvents++;
      console.error('[stream] dropped an unparseable SSE event:', jsonStr.slice(0, 200));
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Everything up to the last newline is complete. Whatever follows it is a
    // partial line and MUST stay in the buffer until the rest of it arrives.
    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      handleLine(line);
    }
  }

  // Flush the decoder and whatever is left in the buffer — the final event may
  // arrive without a trailing newline.
  buffer += decoder.decode();
  if (buffer.trim() !== '') handleLine(buffer);

  if (droppedEvents > 0) {
    console.error(`[stream] ${droppedEvents} SSE event(s) were dropped — output may be incomplete.`);
  }

  return { text: fullText, stopReason };
}

export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  images?: string[]
): Promise<string> {
  const result = await callClaudeWithMeta(systemPrompt, userPrompt, maxTokens, images);
  return result.text;
}

export interface ContinuationResult {
  text: string;
  stopReason: string | null;
  continuations: number;
  truncated: boolean;
}

export async function callWithContinuation(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  images: string[] | undefined,
  segmentLabel: string,
): Promise<ContinuationResult> {
  const safeImages = images ?? [];
  let text = '';
  let stopReason: string | null = null;
  let continuations = 0;
  const maxContinuations = 2;

  const baseResult = await callClaudeWithMeta(systemPrompt, userPrompt, maxTokens, images);
  text = baseResult.text;
  stopReason = baseResult.stopReason;

  while (stopReason === 'max_tokens' && continuations < maxContinuations) {
    continuations++;
    console.warn(`[BUILD.md] ${segmentLabel} continuation ${continuations} (stop_reason=${stopReason})`);
    const continuationUserPrompt = 'Continue exactly where you left off. Do not repeat any content already written. Do not add a preamble. Resume mid-sentence if necessary.';
    const contResult = await callClaudeWithMeta(systemPrompt, continuationUserPrompt, maxTokens, safeImages.length > 0 ? safeImages : undefined);
    text += contResult.text;
    stopReason = contResult.stopReason;
  }

  const truncated = stopReason === 'max_tokens';
  return { text, stopReason, continuations, truncated };
}
