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

export async function callClaude(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  images?: string[]
): Promise<string> {
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

  const doFetch = (content: unknown) =>
    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
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

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
    for (const line of lines) {
      const jsonStr = line.replace('data: ', '').trim();
      if (jsonStr === '[DONE]') continue;
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
          fullText += parsed.delta.text;
        }
      } catch (_) {}
    }
  }

  return fullText;
}
