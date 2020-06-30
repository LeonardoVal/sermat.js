import { parseStringLiteral } from './common';

export const LEX_ATOM = 'atom';
export const LEX_ID = 'id';
export const LEX_BIND = 'bind';
export const LEX_NUMERAL = 'numeral';
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
  /[-+]?(?:Infinity|NaN|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/,
  // String literals.
  /"(?:[^"\\\n\r]|\\[^\n\rxu])*"/,
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
    if (ATOMS.has(match[0])) {
      return [LEX_ATOM, ATOMS.get(match[0]), match.index];
    }
    if (match[2]) { // SYMBOL
      return [match[2], match[0], match.index];
    }
    if (match[3]) {
      return [LEX_ID, match[0], match.index];
    }
    if (match[4]) {
      return [LEX_BIND, match[0], match.index];
    }
    if (match[5]) {
      return [LEX_NUMERAL, +match[0], match.index];
    }
    if (match[6]) {
      return [LEX_LITERAL, JSON.parse(match[0]), match.index]; //FIXME
    }
    if (match[7]) {
      return [LEX_TEMPLATE, parseStringLiteral(match[0]), match.index]; //FIXME
    }
    throw new SyntaxError(`Unexpected token ${match[0]} at ${match.index}!`);
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
}
