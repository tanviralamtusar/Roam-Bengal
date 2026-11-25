// Client-side SEO + readability analysis (English heuristic).
export type CheckStatus = "good" | "ok" | "bad" | "info";
export type Check = {
  id: string;
  label: string;
  status: CheckStatus;
  message: string;
  /** How to fix it. Shown only while the check is not green. */
  fix?: string;
  /** The exact passages behind the problem (long sentences, long paragraphs...). */
  examples?: string[];
};

/** First `max` characters of a passage, with its word count, for an example line. */
const excerpt = (s: string, max = 110) => {
  const t = s.replace(/\s+/g, " ").trim();
  const cut = t.length > max ? `${t.slice(0, max).replace(/\s+\S*$/, "")}…` : t;
  return `“${cut}” (${words(t).length} words)`;
};

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, " ");
const norm = (s: string) =>
  stripHtml(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
const words = (s: string) =>
  norm(s)
    .split(/[^a-z0-9']+/i)
    .filter(Boolean);
// A line break always ends a sentence: list items and headings rarely carry a full stop.
const sentences = (s: string) =>
  stripHtml(s)
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-Z0-9"'(\[])/))
    .map((x) => x.trim())
    .filter(Boolean);

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  const h = norm(haystack);
  const n = norm(needle);
  if (!n) return 0;
  let i = 0,
    count = 0;
  while ((i = h.indexOf(n, i)) !== -1) {
    count++;
    i += n.length;
  }
  return count;
}

// Rough syllable heuristic for English
function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const clean = w.replace(/e$/, "").replace(/[aeiouy]{2,}/g, "a");
  const m = clean.match(/[aeiouy]/g);
  return Math.max(1, m ? m.length : 1);
}

export type KeyphraseInput = {
  keyphrase: string;
  title: string;
  metaDescription: string;
  slug: string;
  h1?: string;
  /** The page's visible copy. Omit when there is none to analyze (the body checks are
   *  skipped rather than scored as an empty page). */
  body?: string;
  firstParagraph?: string;
  imageAlts?: string[];
  url?: string;
};

export function analyzeKeyphrase(i: KeyphraseInput): Check[] {
  const checks: Check[] = [];
  const kp = i.keyphrase.trim();
  if (!kp) {
    return [
      {
        id: "kp-missing",
        label: "Focus keyphrase",
        status: "bad",
        message: "Set a focus keyphrase to score this page.",
      },
    ];
  }
  const kpWords = words(kp);

  // Length
  checks.push(
    kpWords.length === 0
      ? {
          id: "kp-length",
          label: "Keyphrase length",
          status: "bad",
          message: "Focus keyphrase is empty.",
        }
      : kpWords.length > 4
        ? {
            id: "kp-length",
            label: "Keyphrase length",
            status: "ok",
            message: `Your keyphrase is ${kpWords.length} words. Under 5 words is easier to rank.`,
          }
        : {
            id: "kp-length",
            label: "Keyphrase length",
            status: "good",
            message: `Good — ${kpWords.length} word${kpWords.length > 1 ? "s" : ""}.`,
          },
  );

  // Title
  const inTitle = countOccurrences(i.title, kp) > 0;
  checks.push({
    id: "kp-title",
    label: "Keyphrase in SEO title",
    status: inTitle ? "good" : "bad",
    message: inTitle
      ? "Keyphrase appears in the title."
      : "Add the focus keyphrase to your SEO title.",
    fix: `Put "${kp}" in the SEO title, ideally near the start.`,
  });

  // Title length
  const tl = i.title.length;
  checks.push({
    id: "title-length",
    label: "SEO title length",
    status: tl >= 40 && tl <= 60 ? "good" : tl > 0 ? "ok" : "bad",
    message: tl === 0 ? "Set an SEO title." : `Title is ${tl} chars. Aim for 40–60.`,
    fix:
      tl > 60
        ? `Shorten it by ${tl - 60}+ characters, or Google cuts it off with "…".`
        : `Add ${40 - tl}+ characters, e.g. a benefit or "| Roam Bengal".`,
  });

  // Meta description
  const inMeta = countOccurrences(i.metaDescription, kp) > 0;
  checks.push({
    id: "kp-meta",
    label: "Keyphrase in meta description",
    status: inMeta ? "good" : "bad",
    message: inMeta
      ? "Keyphrase found in meta description."
      : "Include the keyphrase in the meta description.",
    fix: `Use "${kp}" once in the meta description. Google bolds it in search results.`,
  });
  const ml = i.metaDescription.length;
  checks.push({
    id: "meta-length",
    label: "Meta description length",
    status: ml >= 120 && ml <= 160 ? "good" : ml > 0 ? "ok" : "bad",
    message:
      ml === 0 ? "Write a meta description." : `Meta description is ${ml} chars. Aim for 120–160.`,
    fix:
      ml > 160
        ? `Cut ${ml - 160}+ characters, or Google truncates it.`
        : "Write 1–2 sentences on what the visitor gets, and end with a reason to click.",
  });

  // Slug
  const inSlug = i.slug.toLowerCase().includes(norm(kp).replace(/\s+/g, "-"));
  checks.push({
    id: "kp-slug",
    label: "Keyphrase in URL slug",
    status: inSlug ? "good" : "ok",
    message: inSlug
      ? "Slug contains the keyphrase."
      : "Consider including the keyphrase in the slug.",
    fix: "Only change the URL if the page is new. Changing a live URL needs a redirect from the old one.",
  });

  // H1
  if (i.h1 !== undefined) {
    const inH1 = countOccurrences(i.h1, kp) > 0;
    checks.push({
      id: "kp-h1",
      label: "Keyphrase in H1",
      status: inH1 ? "good" : "ok",
      message: inH1 ? "Keyphrase found in H1." : "H1 does not contain the keyphrase.",
      fix: `The H1 is the page title in the editor. Work "${kp}" into it.`,
    });
  }

  // First paragraph
  if (i.firstParagraph !== undefined) {
    const inFirst = countOccurrences(i.firstParagraph, kp) > 0;
    checks.push({
      id: "kp-first",
      label: "Keyphrase in intro",
      status: inFirst ? "good" : "ok",
      message: inFirst
        ? "Keyphrase appears in the first paragraph."
        : "Mention the keyphrase in the first paragraph.",
      fix: `Use "${kp}" in the first sentence of the Summary (tours) or the first paragraph (posts).`,
      examples: i.firstParagraph ? [excerpt(i.firstParagraph)] : undefined,
    });
  }

  if (i.body !== undefined) {
    // Density
    const bodyWordCount = words(i.body).length;
    const occ = countOccurrences(i.body, kp);
    const density = bodyWordCount > 0 ? (occ * kpWords.length * 100) / bodyWordCount : 0;
    checks.push({
      id: "kp-density",
      label: "Keyphrase density",
      status: density >= 0.5 && density <= 2.5 ? "good" : occ > 0 ? "ok" : "bad",
      message: `Keyphrase appears ${occ} time${occ === 1 ? "" : "s"} (${density.toFixed(2)}%). Aim for 0.5–2.5%.`,
      fix: (() => {
        const per = kpWords.length * 100;
        const min = Math.ceil((0.5 * bodyWordCount) / per);
        const max = Math.floor((2.5 * bodyWordCount) / per);
        return density > 2.5
          ? `Use the exact phrase "${kp}" at most ${max} times. Swap the rest for natural variations.`
          : `Use the exact phrase "${kp}" ${min - occ} more time${min - occ === 1 ? "" : "s"} (${min}+ in total), spread across the overview, itinerary and FAQ answers. Only the exact phrase counts.`;
      })(),
    });

    // Body length
    checks.push({
      id: "body-length",
      label: "Content length",
      status: bodyWordCount >= 300 ? "good" : bodyWordCount >= 150 ? "ok" : "bad",
      message: `Page has ${bodyWordCount} words. Aim for 300+.`,
      fix: `Add about ${300 - bodyWordCount} more words: what visitors see, practical details, and answers to common questions.`,
    });
  }

  // Image alts
  if (i.imageAlts && i.imageAlts.length) {
    const hasAlt = i.imageAlts.some((a) => a && countOccurrences(a, kp) > 0);
    checks.push({
      id: "kp-img-alt",
      label: "Keyphrase in image alt",
      status: hasAlt ? "good" : "ok",
      message: hasAlt
        ? "At least one image alt contains the keyphrase."
        : "Add the keyphrase to at least one image alt.",
      fix: `In the editor's Images section, describe one photo honestly and include "${kp}", e.g. "Rickshaws in Old Dhaka on a ${kp}".`,
    });
  }

  return checks;
}

export function analyzeReadability(body: string): Check[] {
  const checks: Check[] = [];
  const text = stripHtml(body).trim();
  if (!text)
    return [
      {
        id: "read-empty",
        label: "Readability",
        status: "info",
        message: "No content to analyze yet.",
      },
    ];

  const wordArr = words(text);
  const sents = sentences(text);
  const wordCount = wordArr.length;
  const sentCount = Math.max(1, sents.length);
  const syllCount = wordArr.reduce((s, w) => s + syllables(w), 0);
  const asl = wordCount / sentCount;
  const asw = syllCount / Math.max(1, wordCount);
  const flesch = 206.835 - 1.015 * asl - 84.6 * asw;

  checks.push({
    id: "flesch",
    label: "Flesch Reading Ease",
    status: flesch >= 60 ? "good" : flesch >= 30 ? "ok" : "bad",
    message: `Score ${flesch.toFixed(0)}. ${flesch >= 60 ? "Easy to read." : flesch >= 30 ? "Somewhat difficult." : "Hard to read — shorten sentences and simplify words."}`,
    fix: 'Shorten long sentences (see below) and prefer short words: "about" not "approximately", "start" not "commence". Place names lower this score, so 40–50 is normal for a tour page.',
  });

  const longSents = sents.filter((s) => words(s).length > 20);
  const longSent = longSents.length;
  const longPct = (longSent / sentCount) * 100;
  checks.push({
    id: "sentence-length",
    label: "Sentence length",
    status: longPct <= 25 ? "good" : longPct <= 40 ? "ok" : "bad",
    message: `${longPct.toFixed(0)}% of sentences over 20 words. Aim for ≤25%.`,
    fix: `Split ${Math.max(1, longSent - Math.floor(sentCount * 0.25))}+ of these into two at an "and", "which" or comma. Longest first:`,
    examples: [...longSents]
      .sort((a, b) => words(b).length - words(a).length)
      .slice(0, 5)
      .map((s) => excerpt(s)),
  });

  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const longParas = paragraphs.filter((p) => words(p).length > 150);
  const longPara = longParas.length;
  checks.push({
    id: "paragraph-length",
    label: "Paragraph length",
    status: longPara === 0 ? "good" : longPara <= 1 ? "ok" : "bad",
    message:
      longPara === 0
        ? "All paragraphs are a comfortable length."
        : `${longPara} paragraph(s) exceed 150 words. Split them up.`,
    fix: "Find the paragraph that starts like this in the editor, and add a blank line where the topic changes:",
    examples: longParas.map((p) => excerpt(p, 80)),
  });

  // Passive voice heuristic: "be" + past participle
  const beRe = /\b(is|are|was|were|be|been|being)\s+([a-z]+ed|[a-z]+en)\b/gi;
  const passiveFound = text.match(beRe) ?? [];
  const passiveMatches = passiveFound.length;
  const passivePct = (passiveMatches / sentCount) * 100;
  checks.push({
    id: "passive",
    label: "Passive voice",
    status: passivePct <= 10 ? "good" : passivePct <= 20 ? "ok" : "bad",
    message: `About ${passivePct.toFixed(0)}% of sentences use passive voice. Aim for ≤10%.`,
    fix: 'Say who does the action: "The fort was built by Prince Azam" → "Prince Azam built the fort". Found:',
    examples: [...new Set(passiveFound.map((m) => `“${m}”`))].slice(0, 6),
  });

  return checks;
}

export function overallScore(checks: Check[]): {
  score: number;
  label: string;
  color: CheckStatus;
} {
  if (!checks.length) return { score: 0, label: "No data", color: "info" };
  const weights: Record<CheckStatus, number> = { good: 1, ok: 0.5, bad: 0, info: 0.5 };
  const total = checks.reduce((s, c) => s + weights[c.status], 0);
  const score = Math.round((total / checks.length) * 100);
  const color: CheckStatus = score >= 75 ? "good" : score >= 45 ? "ok" : "bad";
  const label = color === "good" ? "Good" : color === "ok" ? "OK" : "Needs work";
  return { score, label, color };
}
