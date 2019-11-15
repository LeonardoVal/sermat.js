/* eslint-disable no-unused-vars */
import {
  isValidIdentifier,
  BASIC_MODE,
  REPEAT_MODE,
  BINDING_MODE,
  CIRCULAR_MODE,
} from './common';

/** ## Serialization ###############################################################################

Serialization is similar to JSON's `stringify` method. The method takes a data structure and
produces a text representation of it. As a second argument the function takes a set of modifiers of
the functions behaviour. The most important one is perhaps `mode`.
*/

/** Serialization method can be called as `serialize` or `ser`. Besides the `mode`, other modifiers
of the serialization include:

+ `onUndefined=TypeError`: If it is a constructor for a subtype of `Error`, it is used to throw an
  exception when an undefined is found. If it is other type function, it is used as a callback.
  Else the value of this modifier is serialized as in place of the undefined value, and if it is
  undefined itself the `undefined` string is used.

+ `autoInclude`: If `true` forces the registration of types found during the serialization, but not
  in the construction registry.

+ `useConstructions=true`: If `false` constructions (i.e. custom serializations) are not used, and
  all objects are treated as literals (the same way JSON does). It is `true` by default.

+ `climbPrototypes=true`: If `true`, every time an object's constructor is not an own property of
  its prototype, its prototype will be serialized as the `__proto__` property.

+ `pretty=false`: If `true` the serialization is formatted with whitespace to make it more readable.
*/

export default class Serializer {
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

  /** */
  * serialize(value) {
    /* climbPrototypes = _modifier(modifiers, 'climbPrototypes', this.modifiers.climbPrototypes) */
    this.visited = this.mode === REPEAT_MODE ? null : new Map();
    this.parents = new Set();
    yield* this.serializeValue(value);
    delete this.visited;
    delete this.parents;
  }

  /** */
  serializeToString(value) {
    let result = '';
    if (this.pretty) {
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

  /** */
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

  /** The `undefined` special value can be handled in many ways, depending on the `onUndefined`
  modifier. If it is a constructor for a subtype of `Error`, it is used to throw an exception. If
  it other type function, it is used as a callback. Else the value is serialized as it is, even if
  it is `undefined` itself.
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
          value = onUndefined.call(null, value); // Use the given function as callback.
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
  */
  serializeBoolean(value) {
    return value ? 'true' : 'false';
  }

  /** The serialization of a numeral is the JS standard string conversion. JSON's stringification
   * is not used, because it does not handle correctly values `Infinity`, `-Infinity` and `NaN`.
  */
  serializeNumber(value) {
    return `${+value}`;
  }

  /** The serialization of a string value is identical to JSON's.
  */
  serializeString(value) {
    return JSON.stringify(value);
  }

  /** */
  serializeKey(value) {
    return isValidIdentifier(value) ? value : this.serializeString(value);
  }

  /** */
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

  /** */
  * serializeFunction(value) {
    yield* this.serializeObject(value);
  }

  /** During object serialization two lists are kept. The `parents` list holds all the ancestors
  of the current object. This is useful to check for circular references. The `visited` list holds
  all previously serialized objects, and is used to check for repeated references and bindings.
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
    /** If `visited` is `null`, means the mode is `REPEAT_MODE` and repeated references do
    not have to be checked. This is only an optimization.
    */
    if (visited) {
      let i = visited.get(value);
      const repeated = !!i;
      if (!repeated) {
        i = visited.size + 1;
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

  /** An array is serialized as a sequence of values separated by commas between brackets,
   * as arrays are written in plain Javascript.
  */
  * serializeArray(value) {
    yield '[';
    yield* this.serializeElements(value);
    yield ']';
  }

  /** An object literal is serialized as a sequence of key-value pairs separated by commas
    between braces. Each pair is joined by a colon. This is the same syntax that
    Javascript's object literals follow.
  */
  * serializeObjectLiteral(value) {
    yield '{';
    yield* this.serializeElements(value);
    yield '}';
  }

  /** Constructions is the term used to custom serializations registered by the user for
    specific types. They are serialized as an identifier, followed by a sequence of
    values   separated by commas between parenthesis. It ressembles a call to a function
    in Javascript.
  */
  * serializeConstruction(value) {
    const type = value && value.constructor;
    const cons = this.construction && this.construction(type);
    if (!cons) {
      throw new TypeError(`Unknown type "${type.name || type}"!`);
    }
    const { identifier, serializer } = cons;
    if (!identifier || !serializer) {
      throw new TypeError(`Invalid record for type ${type.name || type}!`);
    }
    const args = serializer.call(this, value);
    if (Array.isArray(args)) {
      yield this.serializeKey(identifier);
      yield '(';
      yield* this.serializeElements(args);
      yield ')';
    } else {
      throw new TypeError(`Serializer for ${identifier} did not return an array but \`${args}\`!`);
    }
  }

  // Utilities /////////////////////////////////////////////////////////////////////////////////////

  /** `properties` is a generic way of serializing an object, by creating another object with some
   * of its properties. This method can be used in a serializer function when the constructor of the
   * type can be called with an object.
  */
  properties(obj, ...properties) {
    const result = properties.reduce((result, prop) => {
      result[prop] = obj[prop];
      return result;
    }, {});
    return [result];
  }

  /** `constructorArgs` serializes the `obj` object with a list of properties inferred from the
   * `constructor`'s formal argument list.
  */
  constructorArgs(obj, constructor) {
    const sourceCode = `${constructor}`;
    const comps = /^function\s*[\w$]*\s*\(([^)]*)\)\s*\{/.exec(sourceCode)
      || /^\(([^)]*)\)\s*=>/.exec(sourceCode);
    if (comps && comps[1]) {
      return comps[1].split(/\s*,\s*/).map((k) => obj[k]);
    }
    throw new TypeError(`Cannot infer a serialization from constructor (${constructor})!`);
  }
} // class Serializer
