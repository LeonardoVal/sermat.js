/* eslint-disable no-new-wrappers, camelcase */
import { construction } from './common';

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

function errorConstruction(ErrorType) {
  return construction({
    type: ErrorType,
    serializer: serialize_Error,
    materializer: materializer_Error(ErrorType),
  });
}

export const construction_Error = errorConstruction(Error);
export const construction_EvalError = errorConstruction(EvalError);
export const construction_RangeError = errorConstruction(RangeError);
export const construction_ReferenceError = errorConstruction(ReferenceError);
export const construction_SyntaxError = errorConstruction(SyntaxError);
export const construction_TypeError = errorConstruction(TypeError);
export const construction_URIError = errorConstruction(URIError);
