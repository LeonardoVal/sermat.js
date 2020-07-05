/* eslint-disable camelcase */
import {
  construction_Array,
  construction_Boolean,
  construction_Function,
  construction_Number,
  construction_Object,
  construction_String,
} from './wrapperTypes';
import {
  construction_Error,
  construction_EvalError,
  construction_RangeError,
  construction_ReferenceError,
  construction_SyntaxError,
  construction_TypeError,
  construction_URIError,
} from './errorTypes';
import {
  construction_Float32Array,
  construction_Float64Array,
  construction_Int16Array,
  construction_Int32Array,
  construction_Int8Array,
  construction_Uint16Array,
  construction_Uint32Array,
  construction_Uint8Array,
  construction_Uint8ClampedArray,
} from './arrayTypes';
import {
  construction_Date,
  construction_Map,
  construction_RegExp,
  construction_Set,
} from './otherTypes';
import {
  construction_JSON,
} from './templates';

export { checkConstruction, construction } from './common';

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
  construction_Array,
  construction_Boolean,
  construction_Date,
  construction_Error,
  construction_EvalError,
  construction_Float32Array,
  construction_Float64Array,
  construction_Function,
  construction_Int16Array,
  construction_Int32Array,
  construction_Int8Array,
  construction_JSON,
  construction_Map,
  construction_Number,
  construction_Object,
  construction_RangeError,
  construction_ReferenceError,
  construction_RegExp,
  construction_Set,
  construction_String,
  construction_SyntaxError,
  construction_TypeError,
  construction_Uint16Array,
  construction_Uint32Array,
  construction_Uint8Array,
  construction_Uint8ClampedArray,
  construction_URIError,
].reduce((map, cons) => {
  map.set(cons.type, cons);
  map.set(cons.identifier, cons);
  return map;
}, new Map());
