/* eslint-disable default-case */
import {
  Lexer, LEX_ATOM, LEX_BIND, LEX_ID, LEX_LITERAL, LEX_NUMERAL, LEX_TEMPLATE,
} from './lexer';

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

  /** */
  construct(id, obj, args) {
    const record = this.construction(id);
    if (record) {
      return record.materializer.call(this, obj, args);
    }
    throw new TypeError(`Cannot materialize type '${id}'!`);
  }

  /** */
  materialize(text) {
    this.bindings = new Map();
    this.lexer = new Lexer(text);
    const value = this.parseValue();
    if (this.lexer.shift()) { // Check EOI
      throw new SyntaxError('Expected end of input!');
    }
    return value;
  }

  /** */
  parseValue(bindId) {
    const { lexer } = this;
    const [lex, value] = lexer.shift();
    switch (lex) {
      case LEX_ATOM:
      case LEX_NUMERAL:
      case LEX_LITERAL:
      case LEX_TEMPLATE:
        return value;
      case '[': return this.parseArray(bindId);
      case '{': return this.parseObject(bindId);
      case LEX_BIND: return this.parseBind(value);
      case LEX_ID: {
        //FIXME Other constructions.
        lexer.shift('(');
        return this.parseConstruction(value, bindId);
      }
    }
    throw new SyntaxError(`Expected value but got '${value}'`);
  }

  /** */
  parseArray(bindId) {
    const { lexer } = this;
    const array = [];
    if (bindId) {
      this.bindings.set(bindId, array);
    }
    if (!lexer.peek(']')) {
      this.parseElements(array);
    }
    lexer.shift(']');
    return array;
  }

  /** */
  parseObject(bindId) {
    const { lexer } = this;
    const obj = {};
    if (bindId) {
      this.bindings.set(bindId, obj);
    }
    if (!lexer.peek('}')) {
      this.parseElements(obj);
    }
    lexer.shift('}');
    return obj;
  }

  /** */
  parseConstruction(cons, bindId) {
    const { lexer } = this;
    const obj = this.construct(cons, null, null);
    if (bindId) {
      this.bindings.set(bindId, obj);
    }
    const args = [];
    if (!lexer.peek(')')) {
      this.parseElements(args);
    }
    lexer.shift(')');
    return this.construct(cons, obj, args);
  }

  /** */
  parseElements(obj) { // FIXME
    const { lexer } = this;
    let i = 0;
    do {
      if (lexer.peek(LEX_ID)) {
        this.parseIdElement(obj, i);
      } else if (lexer.peek(LEX_LITERAL)) {
        this.parseLiteralElement(obj, i);
      } else {
        obj[i] = this.parseValue();
      }
      i += 1;
    } while (lexer.peek(',') && lexer.shift());
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
