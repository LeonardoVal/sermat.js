import { BASIC_MODE, REPEAT_MODE, BINDING_MODE, CIRCULAR_MODE } from './common';
import { construction, CONSTRUCTIONS } from './constructions';
import { Serializer } from './serialization';
import Materializer from './materialization';
import { clone, hashCode } from './utilities';

const SERMAT_SYMBOL = '__SERMAT__';

const DEFAULT_INCLUDES = [
  'Boolean', 'Number', 'String', 'Object', 'Array',
  'Date', 'RegExp', 'Set', 'Map',
  'JSON',
];

/** The main class that handles serialization, materialization and other
 * functionality.
 */
export class Sermat {
  /** With `BASIC_MODE` no object inside the given value is allowed to be
   * serialized more than once.
   */
  static BASIC_MODE = BASIC_MODE;

  /** With `REPEATED_MODE`, any object inside the given value is serialized
   * regardless if it has visited before. Still, circular references are checked
   * and not allowed. This is analoguos to `JSON.stringify`'s behaviour.
   */
  static REPEAT_MODE = REPEAT_MODE;

  /** With `BINDING_MODE`, every object inside the given value is given an
   * identifier. If any one of these is visited twice or more, a reference to
   * the first serialization is generated (using this identifier). The
   * materialization actually reuses instances, though circular references are
   * still forbidden.
   */
  static BINDING_MODE = BINDING_MODE;

  /** The `CIRCULAR_MODE` is similar to the `BINDING_MODE`, except that circular
   * references are allowed. This relies on the constructions' materializers
   * supporting circular references.
   */
  static CIRCULAR_MODE = CIRCULAR_MODE;

  /** The static method `type` attaches to a type the definitions required for
   * Sermat to treat it as a construction. It follows the proposed protocol for
   * class decorators.
   *
   * @param {obj} args
   * @returns {function}
   */
  static type(args) {
    return (Type) => {
      const cons = construction(args);
      Type[SERMAT_SYMBOL] = cons;
      return Type;
    };
  }

  /** TODO
  */
  constructor(params) {
    const {
      autoInclude = true,
      include = null,
      mode = BASIC_MODE,
      onUndefined = TypeError,
      useConstructions = true,
    } = params || {};
    const modifiers = Object.seal({
      mode,
      onUndefined,
      autoInclude: !!autoInclude,
      useConstructions: !!useConstructions,
    });
    Object.defineProperty(this, 'modifiers', { value: modifiers });
    Object.defineProperty(this, 'registry', { value: new Map() });
    /** The constructors for Javascript's _basic types_ (`Boolean`, `Number`,
     * `String`, `Object`, `Array`, `Set`, `Map`, `Date`, `RegExp` but not
     * `Function`) are registered by default.
    */
    this.include(...(include || DEFAULT_INCLUDES));
  }

  /**
  */
  include(...types) {
    for (const type of types) {
      if (type[SERMAT_SYMBOL]) {
        if (typeof type === 'function') {
          const { identifier, serializer, materializer } = type[SERMAT_SYMBOL];
          const cons = construction({
            type, identifier, serializer, materializer,
          });
          this.registry.set(cons.identifier, cons);
          this.registry.set(type, cons);
        }
        const { include } = type[SERMAT_SYMBOL];
        if (Array.isArray(include)) {
          this.include(...include);
        }
      }
      if (typeof type === 'string') {
        const cons = CONSTRUCTIONS.get(type);
        if (cons) {
          this.registry.set(cons.identifier, cons);
          this.registry.set(cons.type, cons);
        }
      }
    }
    return this;
  }

  /** Gets a construction definition from the registry.
   * @param {string|function} type
   * @returns {object}
   */
  construction(type) {
    const cons = this.registry.get(type);
    return cons;
  }

  /** Returns the serialization of the given `value`.
   *
   * @param {any} value - The value to serialize
   * @param {object} [modifiers]
   * @param {boolean} [autoInclude=false] - If `true` forces the registration of
   *   types found during the serialization.
   * @param {any} [onUndefined=TypeError] - If it is a constructor for a subtype
   *   of `Error`, it is used to throw an exception when an undefined is found.
   *   If it is other type function, it is used as a callback. Else the value of
   *   this modifier is serialized as in place of the undefined value, and if it
   *   is undefined itself the `void` string is used.
   * @param {boolean} [pretty=false] - If `true` the serialization is formatted
   *   with whitespace to make it more readable.
   * @param {boolean} [useConstructions=true] - If `false` constructions (i.e.
   *   custom serializations) are not used, and all objects are treated as
   *   literals (the same way JSON does).
  */
  serialize(value, modifiers) {
    const serializer = new Serializer({
      ...this.modifiers,
      construction: this.construction.bind(this),
      ...modifiers,
    });
    return serializer.serializeToString(value);
  }

  /** Shortcut for {link Sermat.serialize}.
   *
   * @see Sermat.serialize
  */
  ser(text, modifiers) {
    return this.serialize(text, modifiers);
  }

  /**
  */
  materialize(text, modifiers) {
    const materializer = new Materializer({
      ...this.modifiers,
      ...modifiers,
      construction: this.construction.bind(this),
    });
    return materializer.materialize(text);
  }

  /** Shortcut for {@link Sermat.materialize}.
   *
   * @see Sermat.materialize
   */
  mat(text, modifiers) {
    return this.materialize(text, modifiers);
  }

  /** Materialize a serialization of the given `value`, effectively cloning it.
   * For a more efficient way of cloning a value see the {@link Sermat.clone}
   * method.
   *
   * @param {any} value
   * @param {object} [modifiers={}]
   * @returns {any} - Cloned value.
   */
  sermat(value, modifiers) {
    return this.mat(this.ser(value, modifiers), modifiers);
  }

  clone(value, options) {
    const { useConstructions } = this.modifiers;
    return clone.call(this, value, {
      useConstructions,
      ...options,
      construction: this.construction.bind(this),
    });
  }

  hashCode(value, options) {
    const { useConstructions } = this.modifiers;
    return hashCode.call(this, value, {
      useConstructions,
      ...options,
      construction: this.construction.bind(this),
    });
  }

  // Singleton methods

  static include(...args) {
    return SINGLETON.include(...args);
  }

  static construction(...args) {
    return SINGLETON.construction(...args);
  }

  static serialize(...args) {
    return SINGLETON.serialize(...args);
  }

  static ser(...args) {
    return SINGLETON.ser(...args);
  }

  static materialize(...args) {
    return SINGLETON.materialize(...args);
  }

  static mat(...args) {
    return SINGLETON.mat(...args);
  }

  static sermat(...args) {
    return SINGLETON.sermat(...args);
  }

  static clone(...args) {
    return SINGLETON.clone(...args);
  }

  static hashCode(...args) {
    return SINGLETON.hashCode(...args);
  }
} // class Sermat

const SINGLETON = new Sermat();

export { CONSTRUCTIONS } from './constructions';
export { Lexer } from './lexer';
export { default as Materializer } from './materialization';
export { Serializer } from './serialization';
