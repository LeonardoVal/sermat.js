/* eslint-disable no-new-wrappers, camelcase */
function defaultSerializer(obj) {
  return [{ ...obj }];
}

function defaultMaterializer(type) {
  return function materializer(obj, args) {
    if (!obj) {
      obj = Object.create(type.prototype);
      if (!args) {
        return obj;
      }
    }
    Object.assign(obj, args[0]);
    return obj;
  };
}

/** Checks if the given construction definition is valid.
 *
 * @param {object} cons
 * @param {function|string} [type]
 * @returns {object} - Same as `cons`.
*/
export function checkConstruction(cons, type) {
  if (!cons) {
    throw new TypeError(type ? `Unknown type ${type.name || type}!`
      : 'Unknown type!');
  }
  const { identifier, materializer, serializer } = cons;
  if (typeof identifier !== 'string') {
    throw new TypeError(`Invalid identifier for type ${type.name || type}!`);
  }
  if (typeof materializer !== 'function') {
    throw new TypeError(`Invalid materializer for type ${type.name || type}!`);
  }
  if (typeof serializer !== 'function') {
    throw new TypeError(`Invalid serializer for type ${type.name || type}!`);
  }
  return cons;
}

/** A construction is defined by an object with the properties:
 *
 * @param {object} args
 * @param {function} args.type - the constructor function or class of the type.
 * @param {string} args.identifier - the name used in the syntax.
 * @param {function} args.serializer - a function that takes an object of the
 *   given `type` and returns an array of values to use in the syntax.
 * @param {function} args.materializer - a function that takes an object and the
 *   arguments for its initialization and returns the materialized object.
 * @returns {object}
 */
export function construction({ type, identifier, serializer, materializer }) {
  if (typeof type !== 'function') {
    throw new TypeError(`Expected type '${type}' to be a function!`);
  }
  identifier = identifier || type.name;
  if (!identifier) {
    throw new Error(`No identifier available for type '${type}'!`);
  }
  serializer = serializer || defaultSerializer;
  if (typeof serializer !== 'function') {
    throw new TypeError(`Serializer given for type '${identifier}' is not a function!`);
  }
  materializer = materializer || defaultMaterializer(type);
  if (typeof materializer !== 'function') {
    throw new TypeError(`Materializer given for type '${identifier}' is not a function!`);
  }
  return Object.freeze({ type, identifier, serializer, materializer });
}

const construction_Boolean = construction({
  type: Boolean,
  serializer(obj) {
    return [!!obj.valueOf()];
  },
  materializer(__obj, args) {
    return args && new Boolean(args[0]);
  },
});

const construction_Number = construction({
  type: Number,
  serializer(obj) {
    return [+obj.valueOf()];
  },
  materializer(__obj, args) {
    return args && new Number(args[0]);
  },
});

const construction_String = construction({
  type: String,
  serializer(obj) {
    return [obj.toString()];
  },
  materializer(obj, args) {
    return args && new String(args[0]);
  },
});

const construction_Object = construction({
  type: Object,
  serializer() {
    throw new TypeError('Object literals should not be serialized by a construction!');
  },
  materializer(__obj, args) {
    return args && Object.call(null, ...args);
  },
});

const construction_Array = construction({
  type: Array,
  serializer() {
    throw new TypeError('Arrays should not be serialized by a construction!');
  },
  materializer(__obj, args) {
    return args;
  },
});

const construction_RegExp = construction({
  type: RegExp,
  serializer(value) {
    const comps = /^\/(.+?)\/([a-z]*)$/.exec(`${value}`);
    if (!comps) {
      throw new SyntaxError(`Cannot serialize RegExp ${value}!`);
    }
    return Object.assign([comps[1], comps[2]], value);
  },
  materializer(obj, args /* [regexp, flags] */) {
    return args && Object.assign(
      new RegExp(`${args.shift()}`, `${args.shift()}`), args,
    );
  },
});

const construction_Date = construction({
  type: Date,
  serializer(value) {
    return Object.assign([value.getUTCFullYear(), value.getUTCMonth(),
      value.getUTCDate(), value.getUTCHours(), value.getUTCMinutes(),
      value.getUTCSeconds(), value.getUTCMilliseconds()], value);
  },
  materializer(__obj, args) {
    if (!args) {
      return null;
    }
    const time = Date.UTC(args.shift(), args.shift(), args.shift(),
      args.shift(), args.shift(), args.shift(), args.shift());
    return Object.assign(new Date(time), args);
  },
});

const FUNCTION_RE = /^(function\s*[\w$]*\s*\((?:\s*[$\w]+\s*,?)*\)\s*\{|\(?(?:\s*[$\w]+\s*,?)*\)?\s*=>)/;

const construction_Function = construction({
  type: Function,
  serializer(f) {
    const source = `${f}`;
    const comps = FUNCTION_RE.test(source);
    if (!comps) {
      throw new TypeError(`Could not serialize function (${source})!`);
    }
    return Object.assign([source], f);
  },
  materializer(_obj, args) {
    if (args) {
      if (!FUNCTION_RE.test(args[0])) {
        throw new SyntaxError(`Invalid source for Function (${args[0]})!`);
      } else {
        // eslint-disable-next-line no-eval
        return Object.assign(eval(`(${args.shift()})`), args);
      }
    } else {
      return null;
    }
  },
});

const construction_Set = construction({
  type: Set,
  serializer(value) {
    return Object.assign([...value], value);
  },
  materializer(obj, args) {
    return args && Object.assign(new Set(args), args);
  },
});

const construction_Map = construction({
  type: Map,
  serializer(value) {
    return Object.assign([...value], value);
  },
  materializer(obj, args) {
    return args && Object.assign(new Map(args), args);
  },
});

function serialize_Error(obj) {
  const args = [obj.message];
  ['stack', 'fileName', 'lineNumber', 'columnNumber'].forEach((p) => {
    if (obj[p]) {
      args[p] = obj[p];
    }
  });
  return args;
}

function materializer_Error(Type) {
  return function materialize_Error(obj, args) {
    let r = null;
    if (args) {
      r = new Type(`${args[0]}`);
      ['stack', 'fileName', 'lineNumber', 'columnNumber'].forEach((p) => {
        if (args.length) {
          r[p] = args.shift();
        }
      });
    }
    return r;
  };
}

function errorConstruction(errorType) {
  return construction({
    type: Error,
    serializer: serialize_Error,
    materializer: materializer_Error(errorType),
  });
}

const construction_Error = errorConstruction(Error);
const construction_EvalError = errorConstruction(EvalError);
const construction_RangeError = errorConstruction(RangeError);
const construction_ReferenceError = errorConstruction(ReferenceError);
const construction_SyntaxError = errorConstruction(SyntaxError);
const construction_TypeError = errorConstruction(TypeError);
const construction_URIError = errorConstruction(URIError);

/** `CONSTRUCTIONS` contains the definitions of constructions registered
 * globally. At first it includes some implementations for Javascript's base
 * types.
 *
 * All `Boolean`, `Number`, `String`, `Object` and `Array` instances are
 * serialized with their specific syntax and never as constructions. These are
 * added only for compatibility at materialization.
 *
 * `RegExp` instances are serialized with two arguments: a string for the
 * regular expression and a string for its flags. `Date` instances are
 * serialized using its seven UTC numerical components (in this order): year,
 * month, day, hours, minutes, seconds and milliseconds. `Map` and `Set`
 * instances are serialized with a list of entries.
 *
 * `Function` is not registered by default, but it is available. Functions are
 * serialized with their full source code, in order to support arrow functions
 * and to include the function's name.
 *
 * Error clases (`Error`, `EvalError`, `RangeError`, `ReferenceError`,
 * `SyntaxError`, `TypeError` and `URIError`) are not registered by default,
 * but are available. Error instances are serialized with their `name`,
 * `message` and `stack`. The `stack` trace is overriden, since it is
 * initialized by the engine when the instance is created. Other properties are
 * not considered, and may become inconsistent (e.g. Firefox's `fileName` and
 * `lineNumber`).
*/
export const CONSTRUCTIONS = [
  construction_Boolean,
  construction_Number,
  construction_String,
  construction_Object,
  construction_Array,
  construction_RegExp,
  construction_Date,
  construction_Set,
  construction_Map,
  construction_Function,
  construction_Error,
  construction_EvalError,
  construction_RangeError,
  construction_ReferenceError,
  construction_SyntaxError,
  construction_TypeError,
  construction_URIError,
].reduce((map, cons) => {
  map.set(cons.type, cons);
  map.set(cons.identifier, cons);
  return map;
}, new Map());
