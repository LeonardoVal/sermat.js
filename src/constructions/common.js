export function defaultSerializer(obj) {
  return [{ ...obj }];
}

export function defaultMaterializer(type) {
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
