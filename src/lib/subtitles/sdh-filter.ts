const SPEAKER_LABEL = /^(-[ \t]+)?([A-Z0-9][A-Z0-9 \t.'’&#/-]{0,39}):[ \t]*/;
const SQUARE_ENCLOSURE = /\[[^[\]]*\]/g;
const ROUND_ENCLOSURE = /\([^()]*\)/g;
const NOTHING_LEFT = /^[-\s–—]*$/;

function stripSpeakerLabel(line: string): string {
  const m = SPEAKER_LABEL.exec(line);
  if (!m) return line;
  if (!/[A-Z]/.test(m[2])) return line;
  return (m[1] ?? "") + line.slice(m[0].length);
}

function stripEnclosures(line: string): string {
  return line.replace(SQUARE_ENCLOSURE, "").replace(ROUND_ENCLOSURE, (whole) => {
    const inner = whole.slice(1, -1);
    return /[A-Z]/.test(inner) && !/[a-z]/.test(inner) ? "" : whole;
  });
}

export function stripSdhText(text: string): string {
  if (!text) return text;
  const kept: string[] = [];
  for (const raw of text.split("\n")) {
    const line = stripEnclosures(stripSpeakerLabel(raw))
      .replace(/[ \t]+/g, " ")
      .trim();
    if (NOTHING_LEFT.test(line)) continue;
    kept.push(line);
  }
  return kept.join("\n");
}
