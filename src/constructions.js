/* eslint-disable no-new-wrappers */
/* eslint-disable camelcase */
/* eslint-disable prefer-arrow-callback */
/** ## Constructions for Javascript types ##########################################################

One of Sermat's most important features is extensible handling of custom types. But the library
provides some implementations for some of Javascript's base types.
*/

/** The `signature` function builds a string representing the types of the arguments (separated by
comma). For each value it is equal to `typeof value` if is not `'object'`, the empty string (for
`null`) or the name of the value's constructor.

It can be used to quickly check a call to a materializer using a regular expression.
* /
function signature() {
  var r = "", t, v;
  for (var i = 0; i < arguments.length; i++) {
    v = arguments[i];
    t = typeof v;
    if (i) {
      r += ',';
    }
    r += t === 'object' ? (v ? identifier(v.constructor) : '') : t;
  }
  return r;
}

/** The `checkSignature` function checks the types of a call to a materializer using a regular
  expression to match the result of `signature`. This is a simple and quick way of making the
  materializer functions more secure.
* /
function checkSignature(id, regexp, obj, args) {
  var types = signature.apply(this, [obj].concat(args));
  if (!regexp.exec(types)) {
    throw new TypeError("Sermat.checkSignature: Wrong arguments for construction of "+ id
      +" ("+ types +")!");
  }
  return true;
}

/** `Sermat.CONSTRUCTIONS` contains the definitions of constructions registered globally. At first
it includes some implementations for Javascript's base types.
*/

export function construction(type, identifier, serializer, materializer) {
  if (typeof type !== 'function') {
    throw new TypeError(`Expected type '${type}' to be a function!`);
  }
  identifier = identifier || type.name;
  if (!identifier) {
    throw new Error(`No identifier available for type '${type}'!`);
  }
  serializer = serializer || function serialize_default(obj) {
    return [{ ...obj }];
  };
  if (typeof serializer !== 'function') {
    throw new TypeError(`Serializer given for type '${identifier}' is not a function!`);
  }
  materializer = materializer || function materialize_default(obj, args) {
    if (!obj) {
      obj = Object.create(type.prototype);
      if (!args) {
        return obj;
      }
    }
    Object.assign(obj, args);
    return obj;
  };
  if (typeof materializer !== 'function') {
    throw new TypeError(`Materializer given for type '${identifier}' is not a function!`);
  }
  return { type, identifier, serializer, materializer };
}

/** All `Boolean`, `Number`, `String`, `Object` and `Array` instances are serialized with their
  specific syntax and never as constructions. These are added only for compatibility at
  materialization.
*/
export const construction_Boolean = construction(Boolean, 'Boolean',
  function serialize_Boolean(obj) {
    return [!!obj.valueOf()];
  },
  function materialize_Boolean(obj, args) {
    return args && new Boolean(args.shift());
  });

export const construction_Number = construction(Number, 'Number',
  function serialize_Number(obj) {
    return [+obj.valueOf()];
  },
  function materialize_Number(obj, args) {
    return args && new Number(args.shift());
  });

export const construction_String = construction(String, 'String',
  function serialize_String(obj) {
    return [`${obj.valueOf()}`];
  },
  function materialize_String(obj, args) {
    return args && new String(args.shift());
  });

export const construction_Object = construction(Object, 'Object',
  function serialize_Object() {
    throw new TypeError('Object literals should not be serialized by a construction!');
  },
  function materialize_Object(__obj, args) {
    return args && Object.call(null, ...args);
  });

export const construction_Array = construction(Array, 'Array',
  function serialize_Array() {
    throw new TypeError('Arrays should not be serialized by a construction!');
  },
  function materialize_Array(__obj, args) {
    return args;
  });

/** + `RegExp` instances are serialized with two arguments: a string for the regular expression and
  a string for its flags.
*/
export const construction_RegExp = construction(RegExp, 'RegExp',
  function serialize_RegExp(value) {
    const comps = /^\/(.+?)\/([a-z]*)$/.exec(`${value}`);
    if (!comps) {
      throw new SyntaxError(`Cannot serialize RegExp ${value}!`);
    }
    return Object.assign([comps[1], comps[2]], value);
  },
  function materialize_RegExp(obj, args /* [regexp, flags] */) {
    return args && new RegExp(`${args.shift()}`, `${args.shift()}`);
  });

/** + `Date` instances are serialized using its seven UTC numerical components (in this order):
  year, month, day, hours, minutes, seconds and milliseconds.
*/
export const construction_Date = construction(Date, 'Date',
  function serialize_Date(value) {
    return Object.assign([value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(),
      value.getUTCHours(), value.getUTCMinutes(), value.getUTCSeconds(),
      value.getUTCMilliseconds()], value);
  },
  function materialize_Date(__obj, args) {
    return args && new Date(Date.UTC(...args));
  });

const FUNCTION_RE = /^(function\s*[\w$]*\s*\((?:\s*[$\w]+\s*,?)*\)\s*\{[\0-\uFFFF]*\}|\((?:\s*[$\w]+\s*,?)*\)\s*=>\s*[\0-\uFFFF]*)$/;

/** + `Function` is not registered by default, but it is available. Functions are serialized with
  their full source code, in order to support arrow functions and to include the function's name.
*/
export const construction_Function = construction(Function, 'Function',
  function serialize_Function(f) {
    const source = `${f}`;
    const comps = FUNCTION_RE.test(source);
    if (!comps) {
      throw new TypeError(`Could not serialize function (${source})!`);
    }
    return Object.assign([source], f);
  },
  function materialize_Function(obj, args) {
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
  });

/** + Error clases (`Error`, `EvalError`, `RangeError`, `ReferenceError`, `SyntaxError`, `TypeError`
  and `URIError`) are not registered by default, but are available. Error instances are serialized
  with their `name`, `message` and `stack`. The `stack` trace is overriden, since it is
  initialized by the engine when the instance is created. Other properties are not considered, and
  may become inconsistent (e.g. Firefox's `fileName` and `lineNumber`).
*/
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

export const construction_Error = construction(Error, 'Error',
  serialize_Error, materializer_Error(Error));

export const construction_EvalError = construction(EvalError, 'EvalError',
  serialize_Error, materializer_Error(EvalError));

export const construction_RangeError = construction(RangeError, 'RangeError',
  serialize_Error, materializer_Error(RangeError));

export const construction_ReferenceError = construction(ReferenceError, 'ReferenceError',
  serialize_Error, materializer_Error(ReferenceError));

export const construction_SyntaxError = construction(SyntaxError, 'SyntaxError',
  serialize_Error, materializer_Error(SyntaxError));

export const construction_TypeError = construction(TypeError, 'TypeError',
  serialize_Error, materializer_Error(TypeError));

export const construction_URIError = construction(URIError, 'URIError',
  serialize_Error, materializer_Error(URIError));

export const CONSTRUCTIONS = [
  construction_Boolean,
  construction_Number,
  construction_String,
  construction_Object,
  construction_Array,
  construction_RegExp,
  construction_Date,
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
