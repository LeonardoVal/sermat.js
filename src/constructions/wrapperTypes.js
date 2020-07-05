/* eslint-disable no-new-wrappers, camelcase */
import { construction } from './common';

export const construction_Boolean = construction({
  type: Boolean,
  serializer(obj) {
    return [!!obj.valueOf()];
  },
  materializer(__obj, args) {
    return args && new Boolean(args[0]);
  },
});

export const construction_Number = construction({
  type: Number,
  serializer(obj) {
    return [+obj.valueOf()];
  },
  materializer(__obj, args) {
    return args && new Number(args[0]);
  },
});

export const construction_String = construction({
  type: String,
  serializer(obj) {
    return [obj.toString()];
  },
  materializer(obj, args) {
    return args && new String(args[0]);
  },
});

export const construction_Object = construction({
  type: Object,
  serializer() {
    throw new TypeError('Object literals should not be serialized by a construction!');
  },
  materializer(__obj, args) {
    return args && Object.call(null, ...args);
  },
});

export const construction_Array = construction({
  type: Array,
  serializer() {
    throw new TypeError('Arrays should not be serialized by a construction!');
  },
  materializer(__obj, args) {
    return args;
  },
});

const FUNCTION_RE = /^(function\s*[\w$]*\s*\((?:\s*[$\w]+\s*,?)*\)\s*\{|\(?(?:\s*[$\w]+\s*,?)*\)?\s*=>)/;

export const construction_Function = construction({
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
