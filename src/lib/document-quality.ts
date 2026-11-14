// Pure document utilities shared by the parser, review workflow and regression tests.
export type DocumentPage = { number: number; text: string };
export const normalizeText = (text: string) => text.normalize("NFKC").replace(/\s+/g, "");
export const hasReadableText = (text: string) => /[\p{L}\p{N}]{2}/u.test(
  normalizeText(text).replaceAll("[无法辨认]", ""),
);

export const PAGE_MARKER = /^[ \t]*\[第[ \t]*(\d+)[ \t]*页\][ \t]*(?:\r?\n|$)/gm;

export function readPages(content: string): DocumentPage[] {
  const sections = content.split(PAGE_MARKER);
  if (sections.length === 1) return [];
  return Array.from({ length: (sections.length - 1) / 2 }, (_, i) => ({
    number: Number(sections[i * 2 + 1]), text: sections[i * 2 + 2].trim(),
  }));
}

export function documentQuality(content: string | null, isPdf: boolean, expectedPages?: number) {
  const pages = readPages(content ?? "");
  const emptyPages = pages.filter((page) => !hasReadableText(page.text)).map((page) => page.number);
  const characters = normalizeText(pages.length ? pages.map((p) => p.text).join("") : content ?? "").length;
  const sequential = pages.length > 0 && pages.every((page, index) => page.number === index + 1)
    && (expectedPages === undefined || expectedPages === pages.length);
  return { pages: pages.length, emptyPages, characters,
    readable: characters > 0 && (!isPdf || sequential),
    complete: characters > 0 && (!isPdf || (sequential && !emptyPages.length)),
  };
}

export type TextChunk = { text: string; location: string; index: number };

// Overlap prevents a requirement split across pages or paragraph boundaries from disappearing.
export function chunkDocument(content: string, maxCharacters = 14000, overlap = 1200): TextChunk[] {
  if (maxCharacters < 100 || overlap < 0 || overlap >= maxCharacters) throw new Error("Invalid chunk limits");
  const pages = readPages(content);
  const body = pages.length ? pages.map((p) => p.text).join("\n\n") : content;
  const boundaries: { start: number; end: number; page: number }[] = [];
  let cursor = 0;
  for (const page of pages) {
    boundaries.push({ start: cursor, end: cursor + page.text.length, page: page.number });
    cursor += page.text.length + 2;
  }
  const chunks: TextChunk[] = [];
  for (let start = 0; start < body.length;) {
    const end = Math.min(start + maxCharacters, body.length);
    const included = boundaries.filter((p) => p.end > start && p.start < end);
    const text = included.length ? included.map((p) =>
      `[第 ${p.page} 页]\n${body.slice(Math.max(start, p.start), Math.min(end, p.end))}`,
    ).join("\n\n") : body.slice(start, end);
    if (text.trim()) chunks.push({ text, index: chunks.length + 1,
      location: included.length ? `第 ${included[0].page}–${included.at(-1)!.page} 页` : `字符 ${start + 1}–${end}` });
    if (end === body.length) break;
    start = end - overlap;
  }
  return chunks;
}

// Resolve locations from the actual quotation, never trust a model-generated page number.
export function locateQuote(content: string, quote: string): string | null {
  const needle = normalizeText(quote);
  if (!needle) return null;
  const pages = readPages(content);
  if (pages.length) {
    const matches = pages.filter((p) => normalizeText(p.text).includes(needle));
    if (matches.length === 1) return `第 ${matches[0].number} 页`;
    if (matches.length > 1) return `多处出现：第 ${matches.map((p) => p.number).join("、")} 页，待复核`;
    for (let i = 0; i < pages.length - 1; i++) {
      if (pages[i + 1].number === pages[i].number + 1 &&
          normalizeText(pages[i].text + pages[i + 1].text).includes(needle)) return `第 ${pages[i].number}–${pages[i + 1].number} 页`;
    }
    return null;
  }
  const lines = content.split(/\r?\n/);
  const normalized = lines.map(normalizeText);
  const offset = normalized.join("").indexOf(needle);
  if (offset < 0) return null;
  let position = 0, first = 0, last = 0;
  for (const [index, line] of normalized.entries()) {
    if (position <= offset && offset < position + line.length) first = index + 1;
    if (position < offset + needle.length && offset + needle.length <= position + line.length) { last = index + 1; break; }
    position += line.length;
  }
  return first === last ? `第 ${first} 行` : `第 ${first}–${last} 行`;
}
