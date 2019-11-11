/* eslint-disable no-prototype-builtins */
/** ## Wrap-up #####################################################################################

Here both `Sermat`'s prototype and singleton are set up.
*/
import {
  construction,
  CONSTRUCTIONS,
} from './constructions';
import {
  BASIC_MODE,
  REPEAT_MODE,
  BINDING_MODE,
  CIRCULAR_MODE,
} from './common';
import Serializer from './serialization';

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
      mode: params.hasOwnProperty('mode') ? params.mode : BASIC_MODE,
      onUndefined: params.hasOwnProperty('onUndefined') ? params.onUndefined : TypeError,
      autoInclude: params.hasOwnProperty('autoInclude') ? params.autoInclude : true,
      useConstructions: params.hasOwnProperty('useConstructions') ? params.useConstructions : true,
    });
    Object.defineProperty(this, 'modifiers', { value: modifiers });
    /** The constructors for Javascript's _basic types_ (`Boolean`, `Number`, `String`, `Object`,
      and `Array`, but not `Function`) are always registered. Also `Date` and `RegExp` are
      supported by default.
    */
    this.include(['Boolean', 'Number', 'String', 'Object', 'Array', 'Date', 'RegExp']);
  }

  /**
  */
  include(type) {
    if (Array.isArray(type)) {
      return type.map((t) => this.include(t));
    }
    if (typeof type === 'function') {
      const cons = Object.freeze(construction({ ...type.__SERMAT__, type }));
      this.registry.set(cons.identifier, cons);
      this.registry.set(type, cons);
      if (Array.isArray(type.__SERMAT__.include)) {
        return [...this.include(type.__SERMAT__.include), cons];
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
} // class Sermat

const SINGLETON = new Sermat();

Object.defineProperty(Sermat, '__SINGLETON__', { value: SINGLETON });
Object.defineProperty(Sermat, 'include', { value: SINGLETON.include.bind(SINGLETON) });
Object.defineProperty(Sermat, 'construction', { value: SINGLETON.construction.bind(SINGLETON) });
Object.defineProperty(Sermat, 'serialize', { value: SINGLETON.serialize.bind(SINGLETON) });
