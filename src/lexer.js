/* eslint-disable no-undef */
export const LEX_ATOM = 'atom';
export const LEX_ID = 'id';
export const LEX_BIND = 'bind';
export const LEX_NUMERAL = 'numeral';
export const LEX_BIGINT = 'bigint';
export const LEX_LITERAL = 'literal';
export const LEX_TEMPLATE = 'template';

const LEXEMES = [
  // Ignorable whitespaces and block comments.
  /(?:\s|\/\*.*?\*\/)+/,
  // Symbols.
  /[[\](){}:,=]/,
  // Identifiers for constructions.
  /[a-zA-Z_][a-zA-Z0-9_]*(?:[.-][a-zA-Z0-9_]+)*/,
  // Identifiers for bindings.
  /\$[a-zA-Z0-9_]*(?:[.-][a-zA-Z0-9_]+)*/,
  // Numerals.
  /[-+]?(?:Infinity|NaN|\d+(?:n|(?:\.\d+)?(?:[eE][+-]?\d+)?))/,
  // String literals.
  /"(?:[^"\\\n\r]|\\[^\n\r])*"/,
  // Template literals.
  /`(?:[^`\\]|\\.)*`/,
];

const ATOMS = new Map([
  ['true', true],
  ['false', false],
  ['null', null],
  ['void', undefined],
  ['Infinity', Infinity],
  ['+Infinity', Infinity],
  ['-Infinity', -Infinity],
  ['NaN', NaN],
]);

const LEXER_REGEXP = new RegExp(
  LEXEMES.map((re) => `(${re.source})`).join('|'),
  'ym',
);

/** */
export class Lexer {
  constructor(text) {
    this.text = text;
    this.offset = 0;
    this.tokens = [];
  }

  tokenFromMatch(match) {
    if (!match) {
      return null;
    }
    const [m0] = match;
    const { index } = match;
    if (ATOMS.has(m0)) {
      return [LEX_ATOM, ATOMS.get(m0), index];
    }
    if (match[2]) { // SYMBOL
      return [match[2], m0, index];
    }
    if (match[3]) {
      return [LEX_ID, m0, index];
    }
    if (match[4]) {
      return [LEX_BIND, m0, index];
    }
    if (match[5]) {
      if (m0.endsWith('n')) {
        return [LEX_BIGINT, BigInt(m0.substr(0, m0.length - 1)), index];
      }
      return [LEX_NUMERAL, +m0, index];
    }
    if (match[6]) {
      return [LEX_LITERAL, parseLiteral(m0), index];
    }
    if (match[7]) {
      return [LEX_TEMPLATE, parseLiteral(m0), index];
    }
    throw new SyntaxError(`Unexpected token ${m0} at ${index}!`);
  }

  nextToken() {
    let match;
    do {
      if (this.offset >= this.text.length) {
        return null;
      }
      LEXER_REGEXP.lastIndex = this.offset;
      match = LEXER_REGEXP.exec(this.text);
      if (!match) {
        throw new SyntaxError(`Unexpected input at ${this.offset}!`);
      }
      this.offset = LEXER_REGEXP.lastIndex;
    } while (match[1]); // While matching ignorables.
    const token = this.tokenFromMatch(match);
    if (token) {
      this.tokens.push(token);
    }
    return token;
  }

  peek(expected = null) {
    const { tokens } = this;
    const token = tokens[0] || this.nextToken();
    if (expected && (!token || token[0] !== expected)) {
      return null;
    }
    return token;
  }

  shift(expected = null) {
    const { tokens } = this;
    const token = tokens.shift() || (this.nextToken() && tokens.shift());
    if (expected) {
      if (!token) {
        throw new SyntaxError(`Expected "${expected}" but got end of input!`);
      }
      if (token[0] !== expected) {
        throw new SyntaxError(`Expected "${expected}" but got "${token[0]}" at ${token[2]}!`);
      }
    }
    return token;
  }

  * tokenize() {
    let token = this.shift();
    while (token) {
      yield token;
      token = this.shift();
    }
  }
} // class Lexer

const LITERAL_ESCAPES = {
  '\\': '\\',
  '"': '"',
  '\'': '\'',
  '`': '`',
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
  v: '\v',
};

export function parseLiteral(lit) {
  const first = lit[0];
  const last = lit[lit.length - 1];
  if (first !== last || (first !== '"' && first !== '`')) {
    throw new SyntaxError(`Invalid literal (${lit})!`);
  }
  const content = lit.substr(1, lit.length - 2);
  return content.replace(/\\(x[0-9a-fA-F]{0,2}|u[0-9a-fA-F]{0,4}|.)/g, (_, match) => {
    const [escape] = match;
    switch (escape) {
      case 'x': {
        if (match.length !== 3) {
          throw new SyntaxError(`Invalid hexadecimal escape sequence '${match}'!`);
        }
        return String.fromCharCode(parseInt(match.substr(1), 16));
      }
      case 'u': {
        if (match.length !== 5) {
          throw new SyntaxError(`Invalid Unicode escape sequence '${match}'!`);
        }
        return String.fromCharCode(parseInt(match.substr(1), 16));
      }
      default: return LITERAL_ESCAPES[escape] || escape;
    }
  });
}
