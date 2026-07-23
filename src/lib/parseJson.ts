export function extractAndRepairJson(raw: string): any {
  let text = raw.replace(/```json\s*/gi, '').replace(/`{1,3}/g, '').trim();
  text = text.replace(/,\s*([}\]])/g, '$1');

  try { return JSON.parse(text); } catch (_) {}

  const start = text.indexOf('{');
  if (start === -1) throw new Error('No JSON object found in response');

  let depth = 0, end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end !== -1) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch (_) {}
  }

  let partial = text.slice(start);

  const quoteCount = (partial.match(/(?<!\\)"/g) || []).length;
  if (quoteCount % 2 !== 0) partial += '"';

  partial = partial.replace(/,\s*"[^"]*"\s*:\s*"[^"]*$/, '');
  partial = partial.replace(/,\s*"[^"]*"\s*:\s*\[[^\]]*$/, '');
  partial = partial.replace(/,\s*"[^"]*"\s*:\s*[^,}\]]*$/, '');
  partial = partial.replace(/,\s*"[^"]*"\s*:\s*$/, '');
  partial = partial.replace(/,\s*"[^"]*"\s*$/, '');
  partial = partial.replace(/,\s*$/, '');

  let openBraces = 0, openBrackets = 0;
  let inString = false, escaped = false;
  for (let i = 0; i < partial.length; i++) {
    const ch = partial[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') openBraces++;
    else if (ch === '}') openBraces--;
    else if (ch === '[') openBrackets++;
    else if (ch === ']') openBrackets--;
  }

  for (let i = 0; i < openBrackets; i++) partial += ']';
  for (let i = 0; i < openBraces; i++) partial += '}';

  partial = partial.replace(/,\s*([}\]])/g, '$1');

  try { return JSON.parse(partial); } catch (_) {}

  const sanitized = partial.replace(/[\x00-\x1F\x7F]/g, ' ');
  try { return JSON.parse(sanitized); } catch (_) {}

  console.log('[DEBUG] Failed to parse. Raw length:', raw.length);
  console.log('[DEBUG] Raw ending (last 200 chars):', raw.slice(-200));
  throw new Error('No valid JSON found in response: ' + raw.slice(0, 300));
}

function extractBalancedJson(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0, inString = false, escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return null;
}

function stripCodeFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

function removeTrailingCommas(raw: string): string {
  return raw.replace(/,(\s*[}\]])/g, '$1');
}

function sanitizeJsonStrings(raw: string): string {
  let result = '', inString = false, escaped = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i], code = raw.charCodeAt(i);
    if (escaped) { escaped = false; result += ch; continue; }
    if (ch === '\\' && inString) { escaped = true; result += ch; continue; }
    if (ch === '"') { inString = !inString; result += ch; continue; }
    if (inString) {
      if (ch === '\n') { result += '\\n'; continue; }
      if (ch === '\r') { result += '\\r'; continue; }
      if (ch === '\t') { result += '\\t'; continue; }
      if (code < 0x20) { result += `\\u${code.toString(16).padStart(4, '0')}`; continue; }
    }
    result += ch;
  }
  return result;
}

function repairTruncatedJson(raw: string): string {
  let result = raw, inString = false, escaped = false;
  const stack: string[] = [];
  for (let i = 0; i < result.length; i++) {
    const ch = result[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') stack.pop();
  }
  if (inString) result += '"';
  while (stack.length > 0) result += stack.pop();
  return result;
}

export function parseClaudeJson(content: string, wasTruncated = false): any {
  const cleaned = stripCodeFences(content);
  const candidates: string[] = [];
  const balanced = extractBalancedJson(cleaned);
  if (balanced) candidates.push(balanced);
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const slice = cleaned.slice(firstBrace, lastBrace + 1);
    if (slice !== balanced) candidates.push(slice);
  }
  const regexMatch = cleaned.match(/\{[\s\S]*\}/)?.[0];
  if (regexMatch && regexMatch !== balanced) candidates.push(regexMatch);
  if (wasTruncated) {
    const repaired = repairTruncatedJson(removeTrailingCommas(sanitizeJsonStrings(cleaned)));
    candidates.push(repaired);
  }
  for (const candidate of candidates) {
    try { return JSON.parse(candidate); } catch { }
    try { return JSON.parse(removeTrailingCommas(candidate)); } catch { }
    try { return JSON.parse(sanitizeJsonStrings(candidate)); } catch { }
    try { return JSON.parse(sanitizeJsonStrings(removeTrailingCommas(candidate))); } catch { }
  }
  const preview = cleaned.slice(0, 500);
  throw new Error(`JSON_PARSE_FAILED::${preview}`);
}
