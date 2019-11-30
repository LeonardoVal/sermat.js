/** ## Wrap-up #####################################################################################

Here both `Sermat`'s prototype and singleton are set up.
*/
import { BASIC_MODE, REPEAT_MODE, BINDING_MODE, CIRCULAR_MODE } from './common';
import { construction, CONSTRUCTIONS } from './constructions';
import Serializer from './serialization';
import Materializer from './materialization';
import { clone, hashCode } from './utilities';

const hasOwnProperty = (obj, id) => Object.prototype.hasOwnProperty.call(obj, id);

export default class Sermat {
  static BASIC_MODE = BASIC_MODE;

  static REPEAT_MODE = REPEAT_MODE;

  static BINDING_MODE = BINDING_MODE;

  static CIRCULAR_MODE = CIRCULAR_MODE;

  /**
  */
  constructor(params) {
    params = params || {};
    Object.defineProperty(this, 'registry', { value: new Map() });
    const modifiers = Object.seal({
      mode: hasOwnProperty(params, 'mode') ? params.mode : BASIC_MODE,
      onUndefined: hasOwnProperty(params, 'onUndefined') ? params.onUndefined : TypeError,
      autoInclude: hasOwnProperty(params, 'autoInclude') ? params.autoInclude : true,
      useConstructions: hasOwnProperty(params, 'useConstructions') ? params.useConstructions : true,
    });
    Object.defineProperty(this, 'modifiers', { value: modifiers });
    /** The constructors for Javascript's _basic types_ (`Boolean`, `Number`, `String`, `Object`,
      `Array`, `Set`, `Map`, but not `Function`) are always registered. Also `Date` and `RegExp` are
      supported by default.
    */
    this.include(['Boolean', 'Number', 'String', 'Object', 'Array', 'Date', 'RegExp', 'Set', 'Map']);
  }

  /**
  */
  include(type) {
    if (Array.isArray(type)) {
      return type.map((t) => this.include(t));
    }
    if (typeof type === 'function' && type.__SERMAT__) {
      const { identifier, serializer, materializer } = type.__SERMAT__;
      const cons = construction(type, identifier, serializer, materializer);
      this.registry.set(cons.identifier, cons);
      this.registry.set(type, cons);
      if (Array.isArray(cons.include)) {
        return [...this.include(cons.include), cons];
      }
      return cons;
    }
    if (typeof type === 'string') {
      const cons = CONSTRUCTIONS.get(type);
      if (cons) {
        this.registry.set(cons.identifier, cons);
        this.registry.set(cons.type, cons);
      }
      return cons;
    }
    return undefined;
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
} // class Sermat

const SINGLETON = new Sermat();

Object.defineProperty(Sermat, '__SINGLETON__', { value: SINGLETON });
[
  'include', 'construction', 'serialize', 'ser', 'materialize', 'mat', 'sermat',
].forEach((id) => {
  Object.defineProperty(Sermat, id, { value: SINGLETON[id].bind(SINGLETON) });
});
