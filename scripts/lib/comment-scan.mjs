function lineNumberAt(content, index) {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i += 1) {
    if (content[i] === '\n') {
      line += 1;
    }
  }
  return line;
}

export function scanJsComments(content) {
  const findings = [];
  const templateDepths = [];
  let mode = 'code';
  let i = 0;
  const length = content.length;
  while (i < length) {
    const char = content[i];
    const next = content[i + 1];
    if (mode === 'code') {
      if (char === '/' && next === '/') {
        findings.push({ line: lineNumberAt(content, i), kind: 'line' });
        i += 2;
        while (i < length && content[i] !== '\n') {
          i += 1;
        }
        continue;
      }
      if (char === '/' && next === '*') {
        findings.push({ line: lineNumberAt(content, i), kind: 'block' });
        i += 2;
        while (i < length && !(content[i] === '*' && content[i + 1] === '/')) {
          i += 1;
        }
        i += 2;
        continue;
      }
      if (char === "'") {
        mode = 'single';
        i += 1;
        continue;
      }
      if (char === '"') {
        mode = 'double';
        i += 1;
        continue;
      }
      if (char === '`') {
        mode = 'template';
        i += 1;
        continue;
      }
      if (char === '}' && templateDepths.length > 0) {
        mode = 'template';
        i += 1;
        continue;
      }
      i += 1;
      continue;
    }
    if (mode === 'single' || mode === 'double') {
      const quote = mode === 'single' ? "'" : '"';
      if (char === '\\') {
        i += 2;
        continue;
      }
      if (char === quote) {
        mode = 'code';
      }
      i += 1;
      continue;
    }
    if (mode === 'template') {
      if (char === '\\') {
        i += 2;
        continue;
      }
      if (char === '`') {
        mode = 'code';
        i += 1;
        continue;
      }
      if (char === '$' && next === '{') {
        templateDepths.push(true);
        mode = 'code';
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }
    i += 1;
  }
  return findings;
}

export function scanCssComments(content) {
  const findings = [];
  let mode = 'code';
  let i = 0;
  const length = content.length;
  while (i < length) {
    const char = content[i];
    const next = content[i + 1];
    if (mode === 'code') {
      if (char === '/' && next === '*') {
        findings.push({ line: lineNumberAt(content, i), kind: 'block' });
        i += 2;
        continue;
      }
      if (char === '"') {
        mode = 'double';
      } else if (char === "'") {
        mode = 'single';
      }
      i += 1;
      continue;
    }
    if (mode === 'double' && char === '"') {
      mode = 'code';
    } else if (mode === 'single' && char === "'") {
      mode = 'code';
    }
    i += 1;
  }
  return findings;
}

export function scanHtmlComments(content) {
  const findings = [];
  let index = content.indexOf('<!--');
  while (index >= 0) {
    findings.push({ line: lineNumberAt(content, index), kind: 'html' });
    index = content.indexOf('<!--', index + 4);
  }
  return findings;
}

export function scanShellComments(content) {
  const findings = [];
  const lines = content.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (index === 0 && line.startsWith('#!')) {
      continue;
    }
    const trimmed = line.trimStart();
    if (trimmed.startsWith('#')) {
      findings.push({ line: index + 1, kind: 'shell' });
    }
  }
  return findings;
}
