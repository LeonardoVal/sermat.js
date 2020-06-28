import { BASIC_MODE, REPEAT_MODE, BINDING_MODE, CIRCULAR_MODE } from './common';
import { construction, CONSTRUCTIONS } from './constructions';
import Serializer from './serialization';
import Materializer from './materialization';
import { clone, hashCode } from './utilities';

const SERMAT_SYMBOL = Symbol('__SERMAT__');

export default class Sermat {
  static BASIC_MODE = BASIC_MODE;

  static REPEAT_MODE = REPEAT_MODE;

  static BINDING_MODE = BINDING_MODE;

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

  /**
  */
  constructor(params) {
    const {
      mode = BASIC_MODE,
      onUndefined = TypeError,
      autoInclude = true,
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
     * `String`, `Object`, `Array`, `Set`, `Map`, but not `Function`) are always
     * registered. Also `Date` and `RegExp` are supported by default.
    */
    this.include(['Boolean', 'Number', 'String', 'Object', 'Array', 'Date',
      'RegExp', 'Set', 'Map']);
  }

  /**
  */
  include(...types) {
    for (const type of types) {
      if (type[SERMAT_SYMBOL]) {
        if (typeof type === 'function') {
          const { identifier, serializer, materializer } = type[SERMAT_SYMBOL];
          const cons = construction({ type, identifier, serializer, materializer });
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

  /**
  */
  construction(type) {
    const cons = this.registry.get(type);
    if (!cons) {
      throw new TypeError(`Unknown type "${type.name || type}"!`);
    }
    return cons;
  }

  /**
  */
  serialize(value, modifiers) {
    const serializer = new Serializer({
      ...this.modifiers,
      ...modifiers,
      construction: this.construction.bind(this),
    });
    return serializer.serializeToString(value);
  }

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

  mat(text, modifiers) {
    return this.materialize(text, modifiers);
  }

  sermat(value, modifiers) {
    return this.mat(this.ser(value, modifiers), modifiers);
  }

  clone(value) {
    return clone.call(this, value, {
      construction: this.construction.bind(this),
      useConstructions: this.useConstructions,
    });
  }

  hashCode(value) {
    return hashCode.call(this, value, {
      construction: this.construction.bind(this),
      useConstructions: this.useConstructions,
    });
  }
} // class Sermat

const SINGLETON = new Sermat();

Object.defineProperty(Sermat, '__SINGLETON__', { value: SINGLETON });
['include', 'construction', 'serialize', 'ser', 'materialize', 'mat', 'sermat',
  'clone', 'hashCode',
].forEach((id) => {
  Object.defineProperty(Sermat, id, { value: SINGLETON[id].bind(SINGLETON) });
});
