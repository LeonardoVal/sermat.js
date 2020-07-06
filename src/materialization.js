/* eslint-disable default-case, import/prefer-default-export */
import {
  Lexer, LEX_ATOM, LEX_BIND, LEX_ID, LEX_LITERAL, LEX_NUMERAL, LEX_TEMPLATE,
  LEX_BIGINT,
} from './lexer';

/** Materialization is similar to JSON's `parse` method.
*/
export class Materializer {
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

  /** Executes the materializer for the given `id`.
   *
   * @param {string} id
   * @param {object} obj
   * @param {Array|string} args
   * @returns {object}
  */
  construct(id, obj, args) {
    const record = this.construction(id);
    if (record) {
      return record.materializer.call(this, obj, args);
    }
    throw new TypeError(`Cannot materialize type '${id}'!`);
  }

  /** Parses the given `text` and returns the resulting value.
   *
   * @param {string} text
   * @returns {any}
  */
  materialize(text) {
    this.bindings = new Map();
    this.lexer = new Lexer(text);
    const value = this.parseValue();
    if (this.lexer.shift()) { // Check EOI
      throw new SyntaxError('Expected end of input!');
    }
    return value;
  }

  /** Parse a value read from the lexer.
   *
   * @param {string} bindId - Bind id for the value.
   * @returns {any}
  */
  parseValue(bindId) {
    const { lexer } = this;
    const [lex, value] = lexer.shift();
    switch (lex) {
      case LEX_ATOM:
      case LEX_NUMERAL:
      case LEX_LITERAL:
      case LEX_TEMPLATE:
      case LEX_BIGINT:
        return value;
      case '[': return this.parseArray(bindId);
      case '{': return this.parseObject(bindId);
      case LEX_BIND: return this.parseBind(value);
      case LEX_ID: {
        if (lexer.peek('(')) {
          lexer.shift('(');
          return this.parseConstruction(value, bindId);
        }
        const [, text] = lexer.shift(LEX_TEMPLATE);
        return this.construct(value, null, text);
      }
    }
    throw new SyntaxError(`Expected value but got '${value}'`);
  }

  /** Parse an array read from the lexer.
   *
   * @param {string} bindId - Bind id for the value.
   * @returns {any}
  */
  parseArray(bindId) {
    const array = [];
    if (bindId) {
      this.bindings.set(bindId, array);
    }
    this.parseElements(array, ']');
    return array;
  }

  /** Parse an object literal read from the lexer.
   *
   * @param {string} bindId - Bind id for the value.
   * @returns {any}
  */
  parseObject(bindId) {
    const obj = {};
    if (bindId) {
      this.bindings.set(bindId, obj);
    }
    this.parseElements(obj, '}');
    return obj;
  }

  /** Parse a construction read from the lexer.
   *
   * @param {string} cons - Construction's identifier.
   * @param {string} bindId - Bind id for the value.
   * @returns {any}
  */
  parseConstruction(cons, bindId) {
    const obj = this.construct(cons, null, null);
    if (bindId) {
      this.bindings.set(bindId, obj);
    }
    const args = [];
    this.parseElements(args, ')');
    return this.construct(cons, obj, args);
  }

  /** Parse elements for arrays, object literals or construction arguments; read
   * from the lexer.
   *
   * @param {object} obj - Object to add the elements to.
   * @param {string} end - Token that should end the elements list.
   * @returns {any}
  */
  parseElements(obj, end) {
    const { lexer } = this;
    let i = 0;
    do {
      if (lexer.peek(end)) {
        break;
      }
      if (lexer.peek(LEX_ID)) {
        this.parseIdElement(obj, i);
      } else if (lexer.peek(LEX_LITERAL)) {
        this.parseLiteralElement(obj, i);
      } else {
        obj[i] = this.parseValue();
      }
      i += 1;
    } while (lexer.peek(',') && lexer.shift(','));
    lexer.shift(end);
    return obj;
  }

  /** */
  parseIdElement(obj, i) {
    const { lexer } = this;
    const [, value] = lexer.shift(LEX_ID);
    if (lexer.peek(':')) {
      lexer.shift(':');
      obj[value] = this.parseValue();
    } else if (lexer.peek('(')) {
      lexer.shift('(');
      obj[i] = this.parseConstruction(value);
    } else {
      throw new SyntaxError(`Unexpected "${value}" at ${this.offset - value.length}!`);
    }
  }

  /** */
  parseLiteralElement(obj, i) {
    const { lexer } = this;
    const [, value] = lexer.shift(LEX_LITERAL);
    if (lexer.peek(':')) {
      lexer.shift(':');
      obj[value] = this.parseValue();
    } else {
      obj[i] = value;
    }
  }

  /** */
  parseBind(id) {
    const { lexer } = this;
    const { bindings } = this;
    if (!lexer.peek('=')) {
      if (bindings.has(id)) {
        return bindings.get(id);
      }
      throw new ReferenceError(`Binding ${id} is not defined!`);
    }
    lexer.shift('=');
    if (bindings.has(id)) {
      throw new ReferenceError(`Binding ${id} cannot be reassigned!`);
    }
    const value = this.parseValue(id);
    bindings.set(id, value);
    return value;
  }
} // class Materializer
