/* eslint-disable no-continue */
/* eslint-disable no-labels */
/* eslint-disable no-eval */
/* eslint-disable no-plusplus */
/* eslint-disable no-mixed-operators */
const LEXER_REGEXP = /([[\](){}:,=]|[-+]?[-+\w.$]+|"(?:[^"\\\n]|\\[^\n])*"|`(?:[^`\\]|\\.)*`)(?:\s|\/\*.*?\*\/)*/m;
const ATOM_REGEXP = /^(?:true|false|null|void|[-+]?(Infinity|NaN|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|".*|`.*)$/m;
const ID_REGEXP = /^[a-zA-Z_$](?:[.-]?[a-zA-Z0-9_]+)*$/;
const KEY_REGEXP = /^(?:[a-zA-Z_](?:[.-]?[a-zA-Z0-9_]+)*|".*)$/;
const TRIM_PREFIX_REGEXP = /^(?:\s|\/\*.*?\*\/)*/m;

const ATOM_VALUES = new Map([
  ['true', true], ['false', false], ['null', null], ['void', undefined],
  ['Infinity', Infinity], ['+Infinity', Infinity], ['-Infinity', -Infinity], ['NaN', NaN],
]);

export default class Materializer {
  constructor(params) {
    this.initialize(params);
  }

  /** */
  initialize({
    useConstructions = true,
    construction,
  }) {
    if (!construction && useConstructions) {
      throw new TypeError('No construction registry given!');
    }
    this.useConstructions = useConstructions;
    this.construction = construction;
  }

  construct(id, obj, args) {
    const record = this.construction(id);
    if (record) {
      return record.materializer.call(this, obj, args);
    }
    throw new TypeError(`Cannot materialize type '${id}'!`);
  }

  materialize(text) {
    this.offset = 0;
    this.lineNum = 0;
    this.colNum = 0;
    this.tokens = text.replace(TRIM_PREFIX_REGEXP, '').split(LEXER_REGEXP);
    this.bindings = new Map();
    const value = this.parseValue();
    if (this.peek() !== undefined) { // Check EOI
      this.error('Expected end of input');
    }
    return value;
  }

  error(msg = 'Parse error') {
    throw new SyntaxError(`${msg} at line ${this.lineNum + 1} column ${this.colNum + 1} (offset ${this.offset + 1})!`);
  }

  peek(n = 0) {
    const { tokens } = this;
    if (tokens[n * 2] !== '') {
      this.error();
    }
    return tokens[n * 2 + 1];
  }

  shift(expected) {
    const token = this.peek();
    if (expected && token !== expected) {
      this.error(`Expected '${expected}' but got '${token}'`);
    }
    this.offset += token.length;
    const tokenLines = token.split('\n');
    this.lineNum += tokenLines.length;
    this.colNum += tokenLines[tokenLines.length - 1].length;
    const { tokens } = this;
    tokens.shift();
    tokens.shift();
    return token;
  }

  parseValue(bindId) {
    const token = this.shift();
    if (ATOM_REGEXP.test(token)) {
      return this.parseAtom(token);
    }
    if (token === '[') {
      return this.parseArray(bindId);
    }
    if (token === '{') {
      return this.parseObject(bindId);
    }
    if (ID_REGEXP.test(token)) {
      if (token[0] === '$') {
        return this.parseBind(token);
      }
      this.shift('(');
      return this.parseConstruction(token, bindId);
    }
    throw new SyntaxError(`Expected value but got '${token}'`);
  }

  parseAtom(token) {
    if (ATOM_VALUES.has(token)) {
      return ATOM_VALUES.get(token);
    }
    if (token.startsWith('`')) {
      token = `"${token.slice(1, -1).replace('\n', '\\n').replace('"', '\\"')}"`;
    }
    return JSON.parse(token);
  }

  parseArray(bindId) {
    const array = [];
    if (bindId) {
      this.bindings.set(bindId, array);
    }
    if (this.peek() !== ']') {
      this.parseElements(array);
    }
    this.shift(']');
    return array;
  }

  parseObject(bindId) {
    const obj = {};
    if (bindId) {
      this.bindings.set(bindId, obj);
    }
    if (this.peek() !== '}') {
      this.parseElements(obj);
    }
    this.shift('}');
    return obj;
  }

  parseConstruction(cons, bindId) {
    const obj = this.construct(cons, null, null);
    if (bindId) {
      this.bindings.set(bindId, obj);
    }
    const args = [];
    if (this.peek() !== ')') {
      this.parseElements(args);
    }
    this.shift(')');
    return this.construct(cons, obj, args);
  }

  parseElements(obj) {
    let i = 0;
    do {
      const token = this.peek();
      if (KEY_REGEXP.test(token) && this.peek(1) === ':') {
        this.shift();
        this.shift(':');
        obj[token[0] === '"' ? JSON.parse(token) : token] = this.parseValue();
      } else {
        obj[i++] = this.parseValue();
      }
      if (this.peek() !== ',') {
        break;
      } else {
        this.shift(',');
      }
    // eslint-disable-next-line no-constant-condition
    } while (true);
  }

  parseBind(id) {
    const { bindings } = this;
    if (this.peek() !== '=') {
      if (bindings.has(id)) {
        return bindings.get(id);
      }
      throw new ReferenceError(`Binding ${id} is not defined!`);
    }
    this.shift('=');
    if (bindings.has(id)) {
      throw new ReferenceError(`Binding ${id} cannot be reassigned!`);
    }
    const value = this.parseValue(id);
    bindings.set(id, value);
    return value;
  }
} // class Materializer
