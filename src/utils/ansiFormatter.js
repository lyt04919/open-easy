/**
 * Safely parses ANSI escape sequences and converts to styled HTML spans
 */
export function ansiToHtml(str) {
  if (!str) return '';

  // 1. Sanitize HTML characters first to avoid XSS
  const escaped = String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const ansiStyles = {
    '30': 'color:#71717a', // dark gray
    '31': 'color:#f87171', // red
    '32': 'color:#4ade80', // green
    '33': 'color:#facc15', // yellow
    '34': 'color:#60a5fa', // blue
    '35': 'color:#c084fc', // purple
    '36': 'color:#2dd4bf', // cyan
    '37': 'color:#e4e4e7', // white
    '90': 'color:#a1a1aa', // bright black / gray
    '91': 'color:#fca5a5',
    '92': 'color:#86efac',
    '93': 'color:#fde047',
    '94': 'color:#93c5fd',
    '95': 'color:#d8b4fe',
    '96': 'color:#5eead4',
    '97': 'color:#ffffff',
    '1': 'font-weight:600',
    '2': 'opacity:0.75',
    '3': 'font-style:italic',
    '4': 'text-decoration:underline'
  };

  let openTags = 0;

  // 2. Replace ANSI escape sequences \u001b[...m
  const parsed = escaped.replace(/\u001b\[([0-9;]+)m/g, (_, codeSeq) => {
    if (codeSeq === '0') {
      let closes = '';
      while (openTags > 0) {
        closes += '</span>';
        openTags--;
      }
      return closes;
    }

    const rules = [];
    codeSeq.split(';').forEach((c) => {
      if (ansiStyles[c]) rules.push(ansiStyles[c]);
    });

    if (rules.length > 0) {
      openTags++;
      return `<span style="${rules.join(';')}">`;
    }
    return '';
  });

  return parsed + '</span>'.repeat(openTags);
}
