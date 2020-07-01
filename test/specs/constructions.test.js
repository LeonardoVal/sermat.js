/* global describe, it, expect */
/* eslint-disable no-new-wrappers */
/* eslint-disable max-classes-per-file */
import { Sermat } from '../../src/index';

describe('Sermat constructions', () => {
  it('for Date.', () => {
    [new Date(),
      new Date(Date.UTC(2000, 1)),
      new Date(Date.UTC(2000, 1, 2)),
      new Date(Date.UTC(2000, 1, 2, 3)),
      new Date(Date.UTC(2000, 1, 2, 3, 4)),
      new Date(Date.UTC(2000, 1, 2, 3, 4, 5)),
      new Date(Date.UTC(2000, 1, 2, 3, 4, 5, 6.7)),
    ].forEach((obj) => {
      const serialized = Sermat.serialize(obj);
      expect(Sermat.materialize(serialized)).toStrictEqual(obj);
    });
    // With properties
    const date = Object.assign(new Date(Date.UTC(1970, 1, 1, 0, 0, 0, 0)), { two: 2 });
    expect(Sermat.ser(date)).toBe('Date(1970,1,1,0,0,0,0,two:2)');
    expect(Object.keys(Sermat.sermat(date))).toStrictEqual(['two']);
  });

  it('for RegExp.', () => {
    [/\d+/,
      /a|b+/g,
      /(\/.\/)+/img,
    ].forEach((obj) => {
      const serialized = Sermat.serialize(obj);
      expect(Sermat.materialize(serialized)).toStrictEqual(obj);
    });
    // With properties
    const re = Object.assign(/\w/i, { one: 1 });
    expect(Sermat.ser(re)).toBe('RegExp("\\\\w","i",one:1)');
    expect(Object.keys(Sermat.sermat(re))).toStrictEqual(['one']);
  });

  const defsPoint3D = [
    () => function Point3D(x, y, z) {
      this.x = +x;
      this.y = +y;
      this.z = +z;
    },
    () => class Point3D {
      constructor(x, y, z) {
        this.x = +x;
        this.y = +y;
        this.z = +z;
      }
    },
  ];
  const examplesPoint3D = (Point3D) => [
    new Point3D(3, 77),
    new Point3D(2.95, Infinity),
    new Point3D(52),
  ];

  it('with custom serializer & materializer.', () => {
    defsPoint3D.forEach((typeDef) => {
      const Point3D = typeDef();
      Point3D.__SERMAT__ = {
        identifier: 'Point3D',
        serializer: (value) => [value.x, value.y, value.z],
        materializer: (__obj, args) => (!args ? null : new Point3D(...args)),
      };
      const sermat = new Sermat();
      sermat.include(Point3D);
      examplesPoint3D(Point3D).forEach((p1) => {
        const p2 = sermat.sermat(p1);
        expect(p2.constructor).toBe(Point3D);
        expect(p2 instanceof Point3D).toBe(true);
        expect(p2.x).toBe(p1.x);
        expect(p2.y).toBe(p1.y);
        expect(p2.z).toBe(p1.z);
      });
    });
  });

  it('with default serializer & materializer.', () => {
    defsPoint3D.forEach((typeDef) => {
      const Point3D = typeDef();
      Point3D.__SERMAT__ = true;
      const sermat = new Sermat();
      sermat.include(Point3D);
      examplesPoint3D(Point3D).forEach((p1) => {
        const p2 = sermat.sermat(p1);
        expect(p2.constructor).toBe(Point3D);
        expect(p2 instanceof Point3D).toBe(true);
        expect(p2.x).toBe(p1.x);
        expect(p2.y).toBe(p1.y);
        expect(p2.z).toBe(p1.z);
      });
    });
  });

  it('with recursive types.', () => {
    class Cons {
      constructor(head, tail) {
        this.head = head || null;
        this.tail = tail || null;
      }

      static __SERMAT__ = {
        serializer: (value) => [value.head, value.tail],
        materializer: (__obj, args) => (!args ? null : new Cons(args[0], args[1])),
      }
    }
    const sermat = new Sermat();
    sermat.include(Cons);
    [new Cons(),
      new Cons(1),
      new Cons(1, new Cons(2)),
      new Cons(1, new Cons(2, new Cons(3))),
    ].forEach((x1) => {
      let x2 = sermat.mat(sermat.ser(x1));
      expect(x2.constructor).toBe(Cons);
      expect(x2 instanceof Cons).toBe(true);
      while (x1) {
        expect(x2.head).toBe(x1.head);
        x1 = x1.tail;
        x2 = x2.tail;
      }
      expect(x2).toBe(x1); // Check both are null.
    });
  });

  it('with references.', () => {
    class Ref {
      constructor(...args) {
        this.refs = args;
      }

      static __SERMAT__ = {
        serializer: (value) => value.refs,
        materializer: (obj, args) => {
          if (!obj) obj = new Ref();
          if (args) obj.refs = args;
          return obj;
        },
      }
    }
    const sermat = new Sermat();
    sermat.include(Ref);
    const r1 = new Ref();
    let r2 = new Ref(r1, r1);
    let r3;
    expect(() => sermat.ser(r2)).toThrow();
    [Sermat.REPEAT_MODE, Sermat.BINDING_MODE, Sermat.CIRCULAR_MODE].forEach((mode) => {
      r3 = sermat.mat(sermat.ser(r2, { mode }));
      [r3, r3.refs[0], r3.refs[1]].forEach((r) => {
        expect(r instanceof Ref).toBe(true);
      });
      if (mode === Sermat.REPEAT_MODE) {
        expect(r3.refs[0]).not.toBe(r3.refs[1]);
      } else {
        expect(r3.refs[0]).toBe(r3.refs[1]);
      }
    });

    r2 = new Ref(r1);
    r2.refs.push(r2);
    expect(() => sermat.ser(r2)).toThrow();
    expect(() => sermat.ser(r2, { mode: Sermat.REPEAT_MODE })).toThrow();
    expect(() => sermat.ser(r2, { mode: Sermat.BINDING_MODE })).toThrow();
    r3 = sermat.mat(sermat.ser(r2, { mode: Sermat.CIRCULAR_MODE }));
    [r3, r3.refs[0], r3.refs[1]].forEach((r) => {
      expect(r instanceof Ref).toBe(true);
    });
    expect(r3.refs[0]).not.toBe(r3.refs[1]);
    expect(r3.refs[1]).toBe(r3);
  });

  it('with functions.', () => {
    const sermat = new Sermat();
    sermat.include('Function');
    const f1 = function id(x) { return x; };
    const f1copy = sermat.sermat(f1);
    expect(typeof f1copy).toBe('function');
    expect(f1copy(1)).toBe(f1(1));
    expect(f1copy.length).toBe(f1.length);
    expect(f1copy.name).toBe(f1.name);
    const f2 = (x) => x;
    const f2copy = sermat.sermat(f2);
    expect(typeof f2copy).toBe('function');
    expect(f2copy(1)).toBe(f2(1));
    expect(f2copy.length).toBe(f2.length);
  });

  it('with objetified native types.', () => {
    // Boolean
    expect(Sermat.ser(Object(true))).toBe('Boolean(true)');
    expect(Sermat.ser(new Boolean(false))).toBe('Boolean(false)');
    expect(Sermat.ser(Object.assign(new Boolean(true), { x: 1 }))).toBe('Boolean(true)');
    // Number
    expect(Sermat.ser(Object(1))).toBe('Number(1)');
    expect(Sermat.ser(new Number(2.3))).toBe('Number(2.3)');
    expect(Sermat.ser(Object.assign(new Number(45.678), { n: 9 }))).toBe('Number(45.678)');
    // String
    expect(Sermat.ser(Object.assign('abc', { d: 'f' }))).toBe('String("abc")');
    // Arrays
    expect(Sermat.ser(Object.assign([1, 2, 3], { array: true }))).toBe('[1,2,3,array:true]');
    expect(Sermat.ser(Object.assign([1, 2, 3], { 4.5: 6.78 }))).toBe('[1,2,3,"4.5":6.78]');
    expect(Sermat.ser(Object.assign([1, 2, 3], { 4: 5 }), { onUndefined: 4 })).toBe('[1,2,3,4,5]');
    // Functions
    const sermat = new Sermat();
    sermat.include('Function');
    // eslint-disable-next-line prefer-arrow-callback
    expect(sermat.sermat(Object.assign(function add(x, y) {
      return x + y;
    }, { yes: true })).yes).toBe(true);
  });

  it('with inherited __SERMAT__.', () => {
    class Type1 {
      constructor(x) {
        this.x = x;
      }

      static __SERMAT__ = {
        serializer: (obj) => [obj.x],
        materializer: (__obj, args) => (!args ? null : new Type1(args[0])),
      }
    }

    class Type2 extends Type1 {
    }

    const sermat = new Sermat();
    sermat.include(Type1, Type2);
    expect(sermat.ser(new Type1(1))).toBe('Type1(1)');
    expect(sermat.ser(new Type2(1))).toBe('Type2(1)');
  });
}); // describe "Sermat".
