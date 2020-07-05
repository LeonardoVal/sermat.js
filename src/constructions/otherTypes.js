/* eslint-disable no-new-wrappers, camelcase */
import { construction } from './common';

export const construction_RegExp = construction({
  type: RegExp,
  serializer(value) {
    const comps = /^\/(.+?)\/([a-z]*)$/.exec(`${value}`);
    if (!comps) {
      throw new SyntaxError(`Cannot serialize RegExp ${value}!`);
    }
    return Object.assign([comps[1], comps[2]], value);
  },
  materializer(obj, args /* [regexp, flags] */) {
    return args && Object.assign(
      new RegExp(`${args.shift()}`, `${args.shift()}`), args,
    );
  },
});

export const construction_Date = construction({
  type: Date,
  serializer(value) {
    return Object.assign([value.getUTCFullYear(), value.getUTCMonth(),
      value.getUTCDate(), value.getUTCHours(), value.getUTCMinutes(),
      value.getUTCSeconds(), value.getUTCMilliseconds()], value);
  },
  materializer(__obj, args) {
    if (!args) {
      return null;
    }
    const time = Date.UTC(args.shift(), args.shift(), args.shift(),
      args.shift(), args.shift(), args.shift(), args.shift());
    return Object.assign(new Date(time), args);
  },
});

export const construction_Set = construction({
  type: Set,
  serializer(value) {
    return Object.assign([...value], value);
  },
  materializer(obj, args) {
    return args && Object.assign(new Set(args), args);
  },
});

export const construction_Map = construction({
  type: Map,
  serializer(value) {
    return Object.assign([...value], value);
  },
  materializer(obj, args) {
    return args && Object.assign(new Map(args), args);
  },
});
