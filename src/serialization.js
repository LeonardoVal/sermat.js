/* eslint-disable no-unused-vars */
import { BASIC_MODE, REPEAT_MODE, BINDING_MODE, CIRCULAR_MODE } from './common';
import { checkConstruction } from './constructions';

/** Serialization is similar to JSON's `stringify` method.
*/
export class Serializer {
  constructor(params) {
    this.initialize(params);
  }

  /** */
  initialize({
    mode = BASIC_MODE,
    onUndefined = TypeError,
    useConstructions = true,
    autoInclude = true,
    pretty = false,
    construction,
  }) {
    if (!construction && useConstructions) {
      throw new Error('No construction registry given!');
    }
    this.mode = mode;
    this.onUndefined = onUndefined;
    this.useConstructions = useConstructions;
    this.autoInclude = autoInclude;
    this.construction = construction;
    this.pretty = pretty;
  }

  /** Serialize a value, as a generator of strings.
   *
   * @param {any} value
   * @yields {string}
  */
  * serialize(value) {
    this.visited = this.mode === REPEAT_MODE ? null : new Map();
    this.parents = new Set();
    yield* this.serializeValue(value);
    this.visited = null;
    this.parents = null;
  }

  /** Serialize a value, as one single string.
   *
   * @param {any} value
   * @returns {string}
  */
  serializeToString(value) {
    let result = '';
    if (!this.pretty) {
      for (const token of this.serialize(value)) {
        result += token;
      }
    } else {
      const indent = [];
      for (const token of this.serialize(value)) {
        switch (token) {
          case ':':
          case '=':
            result += ` ${token} `;
            break;
          case '{':
          case '[':
          case '(':
            indent.push('\t');
          // eslint-disable-next-line no-fallthrough
          case ',':
            result += `${token}\n${indent.join('')}`;
            break;
          case '}':
          case ']':
          case ')':
            indent.pop();
            result += `\n${indent.join('')}${token}`;
            break;
          default: result += token;
        }
      }
    }
    return result;
  }

  /** Serialize any value.
   *
   * @param {any} value
   * @yields {string}
  */
  * serializeValue(value) {
    switch (typeof value) {
      case 'undefined':
        yield* this.serializeUndefined(value);
        break;
      case 'boolean':
        yield this.serializeBoolean(value);
        break;
      case 'number':
        yield this.serializeNumber(value);
        break;
      case 'bigint':
        yield this.serializeBigInt(value);
        break;
      case 'string':
        yield this.serializeString(value);
        break;
      case 'object':
        yield* this.serializeObject(value);
        break;
      case 'function':
        yield* this.serializeFunction(value);
        break;
      // missing: symbol, bigint
      default:
        throw new TypeError(`Unsupported value type '${typeof value}'!`);
    }
  }

  /** The `undefined` special value can be handled in many ways, depending on
   * the `onUndefined` modifier. If it is a constructor for a subtype of
   * `Error`, it is used to throw an exception. If it is other type function, it
   * is used as a callback. Else the value is serialized as it is, even if it is
   * `undefined` itself.
   *
   * @param {any} value
   * @yields {string}
  */
  * serializeUndefined(value) {
    const { onUndefined } = this;
    switch (typeof onUndefined) {
      case 'undefined':
        yield 'void';
        break;
      case 'function': {
        if (onUndefined.prototype instanceof Error) {
          // eslint-disable-next-line new-cap
          throw new onUndefined('Cannot serialize undefined value!');
        } else {
          // Use the given function as callback.
          value = onUndefined.call(null, value);
          if (typeof value === 'undefined') {
            yield 'void';
          } else {
            yield* this.serializeValue(value);
          }
          break;
        }
      }
      default: yield* this.serializeValue(onUndefined);
    }
  }

  /** The serialization of a boolean value is identical to JSON's.
   *
   * @param {boolean} value
   * @returns {string}
  */
  serializeBoolean(value) {
    return value ? 'true' : 'false';
  }

  /** The serialization of a numeral is the JS standard string conversion.
   * JSON's stringification is not used, because it does not handle correctly
   * values `Infinity`, `-Infinity` and `NaN`.
   *
   * @param {number} value
   * @returns {string}
  */
  serializeNumber(value) {
    return `${+value}`;
  }

  /** The serialization of a `BigInt` is the JS standard string conversion.
  */
  serializeBigInt(value) {
    return `${value}n`;
  }

  /** The serialization of a string value is identical to JSON's.
   *
   * @param {string} value
   * @param {bool} asTemplate
   * @returns {string}
  */
  serializeString(value, asTemplate = false) {
    const string = `${value}`;
    if (asTemplate) {
      return `\`${string.replace(/[\\`]/g, '\\$&')}\``;
    }
    return JSON.stringify(string);
  }

  /** Keys are the identifiers used in constructions and object literals.
   *
   * @param {string} value
   * @returns {string}
  */
  serializeKey(value) {
    return isValidIdentifier(value) ? value : this.serializeString(value);
  }

  /** Serialize the elements of an array or object. In the case of objects it
   * results in `key:value` pairs.
   *
   * @param {object} value
   * @yields {string}
  */
  * serializeElements(value) {
    let i = 0;
    const isArray = Array.isArray(value);
    const len = isArray ? value.length : 0;
    if (len > 0) {
      yield* this.serializeValue(value[i]);
      for (i += 1; i < len; i += 1) {
        yield ',';
        yield* this.serializeValue(value[i]);
      }
    }
    const keys = Object.keys(value);
    for (const k of keys) {
      if (isArray && Math.floor(k) - k === 0) {
        // eslint-disable-next-line no-continue
        continue;
      }
      if (i > 0) {
        yield ',';
      }
      yield this.serializeKey(k);
      yield ':';
      yield* this.serializeValue(value[k]);
      i += 1;
    }
  }

  /** Functions are serialized as object, with the construction `Function`.
   *
   * @param {function} value
   * @yields {string}
  */
  * serializeFunction(value) {
    yield* this.serializeObject(value);
  }

  /** Serializes an object, either an array, an object literal or a custom
   * construction. During object serialization two lists are kept. The `parents`
   * list holds all the ancestors of the current object. This is useful to check
   * for circular references. The `visited` list holds all previously serialized
   * objects, and is used to check for repeated references and bindings.
   *
   * @param {object} value
   * @yields {string}
   * @throws {TypeError} If a circular reference is detected and the mode is not
   *   `CIRCULAR_MODE`.
   * @throws {TypeError} If a repeated reference is detected and the mode is
   *   neither `BINDING_MODE` nor `CIRCULAR_MODE`.
  */
  * serializeObject(value) {
    if (!value) {
      yield 'null';
      return;
    }
    const { mode, parents, useConstructions, visited } = this;
    if (parents && parents.has(value) && mode !== CIRCULAR_MODE) {
      throw new TypeError('Circular reference detected!');
    }
    /** If `visited` is `null`, means the mode is `REPEAT_MODE` and repeated
     * references do not have to be checked. This is only an optimization.
    */
    if (visited) {
      let i = visited.get(value);
      const repeated = i !== undefined;
      if (!repeated) {
        i = visited.size;
        visited.set(value, i);
      }
      if (mode === BINDING_MODE || mode === CIRCULAR_MODE) {
        yield `$${i}`;
        if (repeated) {
          return;
        }
        yield '=';
      } else if (repeated) {
        throw new TypeError('Repeated reference detected!');
      }
    }
    parents.add(value);
    if (Array.isArray(value)) { // Arrays.
      yield* this.serializeArray(value);
    } else if (value.constructor === Object || !useConstructions) {
      yield* this.serializeObjectLiteral(value);
    } else {
      yield* this.serializeConstruction(value);
    }
    parents.delete(value);
  }

  /** An array is serialized as a sequence of values separated by commas between
   * brackets, as arrays are written in plain Javascript.
   *
   * @param {Array} value
   * @yields {string}
  */
  * serializeArray(value) {
    yield '[';
    yield* this.serializeElements(value);
    yield ']';
  }

  /** An object literal is serialized as a sequence of key-value pairs separated
   * by commas between braces. Each pair is joined by a colon. This is the same
   * syntax that Javascript's object literals follow.
   *
   * @param {object} value
   * @yields {string}
  */
  * serializeObjectLiteral(value) {
    yield '{';
    yield* this.serializeElements(value);
    yield '}';
  }

  /** Constructions is the term used to custom serializations registered by the
   * user for specific types. They are serialized as an identifier, followed by
   * a sequence of values separated by commas between parenthesis. It ressembles
   * a call to a function in Javascript.
   *
   * @param {object} value
   * @yields {string}
   * @throws {TypeError} If the construction for the value's type is missing or
   *   invalid.
  */
  * serializeConstruction(value) {
    const type = value && value.constructor;
    const cons = checkConstruction(
      this.construction && this.construction(type), type,
    );
    const { identifier, serializer } = cons;
    const args = serializer.call(this, value);
    if (Array.isArray(args)) {
      yield this.serializeKey(identifier);
      yield '(';
      yield* this.serializeElements(args);
      yield ')';
    } else if (typeof args === 'string') {
      yield this.serializeKey(identifier);
      yield this.serializeString(args, true);
    } else {
      throw new TypeError(`Serializer for ${identifier} returned something `
        + `unexpected: \`${args}\`!`);
    }
  }

  // Utilities /////////////////////////////////////////////////////////////////

  /** `properties` is a generic way of serializing an object, by creating
   * another object with some of its properties. This method can be used in a
   * serializer function when the constructor of the type can be called with an
   * object.
  */
  properties(obj, ...properties) {
    const result = properties.reduce((props, prop) => {
      props[prop] = obj[prop];
      return props;
    }, {});
    return [result];
  }
} // class Serializer

const IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*(?:[.-][a-zA-Z0-9_]+)*$/;

const RESERVED_WORD_RE = /^(true|false|null|void|NaN|Infinity|\$[\w$]*)$/;

export function isValidIdentifier(id) {
  return IDENTIFIER_RE.test(id) && !RESERVED_WORD_RE.test(id);
}
