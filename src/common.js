/* eslint-disable object-property-newline */
export const BASIC_MODE = 0;
export const REPEAT_MODE = 1;
export const BINDING_MODE = 2;
export const CIRCULAR_MODE = 3;

const IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*(?:[.-][a-zA-Z0-9_]+)*$/;

const RESERVED_WORD_RE = /^(true|false|null|void|NaN|Infinity|\$[\w$]*)$/;

export function isValidIdentifier(id) {
  return IDENTIFIER_RE.test(id) && !RESERVED_WORD_RE.test(id);
}

const FUNCTION_ID_RE = /^\s*function\s+([\w$]+)/;

export function functionName(fn) {
  return fn.name || (FUNCTION_ID_RE.exec(`${fn}`) || [])[1];
}

const STRING_LITERAL_ESCAPES = {
  '\\': '\\', '"': '"', '\'': '\'', '`': '`',
  b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v',
};

export function parseStringLiteral(lit) {
  return lit.replace(/\\(x[0-9a-fA-F]{0,2}|u[0-9a-fA-F]{0,4}|.)/g, (_, m) => {
    const escape = m[0];
    if (escape === 'x') {
      if (m.length !== 3) {
        throw new SyntaxError('Invalid hexadecimal escape sequence!');
      }
      return String.fromCharCode(parseInt(m.substr(1), 16));
    }
    if (escape === 'u') {
      if (m.length !== 5) {
        throw new SyntaxError('Invalid Unicode escape sequence!');
      }
      return String.fromCharCode(parseInt(m.substr(1), 16));
    }
    return STRING_LITERAL_ESCAPES[escape] || escape;
  });
}
