/** TODO
*/
/** There are four modes of operation:

+ `BASIC_MODE`: No object inside the given value is allowed to be serialized more than once.

+ `REPEATED_MODE`: If while serializing any object inside the given value is visited more than once,
  its serialization is repeated every time. Still, circular references are not allowed. This is
  analoguos to `JSON.stringify`'s behaviour.

+ `BINDING_MODE`: Every object inside the given value is given an identifier. If any one of these
  is visited twice or more, a reference to the first serialization is generated using this
  identifier. The materialization actually reuses instances, though circular references are still
  forbidden.

+ `CIRCULAR_MODE`: Similar to `BINDING_MODE`, except that circular references are allowed. This
  still depends on the constructions' materializers supporting circular references.
*/
export const BASIC_MODE = 0;
export const REPEAT_MODE = 1;
export const BINDING_MODE = 2;
export const CIRCULAR_MODE = 3;

const IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*(?:[.-][a-zA-Z0-9_]+)*$/;

const RESERVED_WORD_RE = /^(true|false|null|void|NaN|Infinity|\$[\w$]*)$/;

export function isValidIdentifier(id) {
  return IDENTIFIER_RE.test(id) && !RESERVED_WORD_RE.test(id);
}

const FUNCTION_ID_RE = /^\s*function\s+([\w$]+)/;

export function functionName(fn) {
  return fn.name || (FUNCTION_ID_RE.exec(`${fn}`) || [])[1];
}
