/* eslint-disable no-bitwise */
/** ## Utilities ###################################################################################
*/

/** The `clone` function makes a deep copy of a value, taking advantage of Sermat's definitions. It
is like `Sermat.sermat`, but without dealing with text.
*/
export function clone(value, options) {
  const { construction, useConstructions } = options;
  if (!options.visited) options.visited = new Map();
  const { visited } = options;
  switch (typeof value) {
    case 'undefined':
    case 'boolean':
    case 'number':
    case 'string':
    case 'function':
      return value;
    case 'object': {
      if (value === null) return null;
      if (visited.has(value)) return visited.get(value);
      visited.set(value, undefined);
      let cloned;
      const isArray = Array.isArray(value);
      if (isArray || value.constructor === Object || !useConstructions) {
        cloned = isArray ? value.map((v) => clone(v, options)) : {};
        visited.set(value, cloned);
        Object.keys(value).forEach((k) => { cloned[k] = clone(value[k], options); });
      } else { // Constructions.
        const cons = construction(value.constructor);
        cloned = cons.materializer.call(this, null, null);
        visited.set(value, cloned);
        const args = clone(cons.serializer.call(this, value));
        cloned = cons.materializer.call(this, cloned, args);
        visited.set(value, cloned); // If the materializer does not support empty initialization.
      }
      return cloned;
    }
    default:
      throw new TypeError(`Unsupported type ${typeof value}!`);
  }
}

/** The `hashCode` function calculates an integer hash for the given value. It is mostly inspired by
the same method in Java objects.
*/
export function hashCode(value, options) {
  const { construction, useConstructions } = options;
  if (!options.visited) options.visited = new Map();
  const { visited } = options;
  switch (typeof value) {
    case 'undefined':
    case 'boolean':
    case 'number':
      return value >>> 0;
    case 'string': {
      return value.slice(value.length & 0x1F).split('')
        .reduce((acc, chr) => acc * 33 ^ chr.charCodeAt(0), 5381) >>> 0;
    }
    case 'function':
    case 'object': {
      if (value === null) return 0;
      if (visited.has(value)) return visited.get(value);
      let hash = 0;
      visited.set(value, hash);
      if (Array.isArray(value) || value.constructor === Object || !useConstructions) {
        hash = Object.keys(value)
          .map((k) => hashCode(k) ^ hashCode(value[k]))
          .sort((x, y) => x - y)
          .reduce((acc, x) => (31 * acc + x) | 0, 1);
      } else { // Constructions.
        const record = construction(value.constructor);
        hash = hashCode(record.serializer.call(this, value));
      }
      visited.set(value, hash);
      return hash;
    }
    default:
      throw new TypeError(`Unsupported type ${typeof value}!`);
  }
}
