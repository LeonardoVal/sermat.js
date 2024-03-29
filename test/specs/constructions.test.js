/* eslint-disable no-new-wrappers, max-classes-per-file */
import { Sermat } from '../../src/index';
import { addMatchers } from '../jest-utils';

describe('Sermat constructions', () => {
  addMatchers(expect);

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
      expect(serialized).toMaterializeAs(obj, Sermat);
    });
    // With properties
    const date = Object.assign(new Date(Date.UTC(1970, 1, 1, 0, 0, 0, 0)), { two: 2 });
    expect(date).toSerializeAs('Date(1970,1,1,0,0,0,0,two:2)', Sermat);
    expect(Object.keys(Sermat.sermat(date))).toStrictEqual(['two']);
  });

  it('for RegExp.', () => {
    [/\d+/,
      /a|b+/g,
      /(\/.\/)+/img,
    ].forEach((obj) => {
      const serialized = Sermat.serialize(obj);
      expect(serialized).toMaterializeAs(obj, Sermat);
    });
    // With properties
    const re = Object.assign(/\w/i, { one: 1 });
    expect(re).toSerializeAs('RegExp("\\\\w","i",one:1)', Sermat);
    expect(Object.keys(Sermat.sermat(re))).toStrictEqual(['one']);
  });

  it('for typed arrays.', () => {
    const arrays = [[], [0], [-1, 0, 2]];
    [Float32Array, Float64Array,
      Int16Array, Int32Array,
      Int8Array, Uint16Array,
      Uint32Array, Uint8Array, Uint8ClampedArray,
    ].forEach((ArrayType) => {
      arrays.forEach((array) => {
        const typedArray = new ArrayType(array);
        const serialized = Sermat.serialize(typedArray);
        expect(serialized).toMaterializeAs(typedArray, Sermat);
      });
    });
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
    expect(Object(true))
      .toSerializeAs('Boolean(true)', Sermat);
    expect(new Boolean(false))
      .toSerializeAs('Boolean(false)', Sermat);
    expect(Object.assign(new Boolean(true), { x: 1 }))
      .toSerializeAs('Boolean(true)', Sermat);
    // Number
    expect(Object(1)).toSerializeAs('Number(1)', Sermat);
    expect(new Number(2.3)).toSerializeAs('Number(2.3)', Sermat);
    expect(Object.assign(new Number(45.678), { n: 9 }))
      .toSerializeAs('Number(45.678)', Sermat);
    // String
    expect(Object.assign('abc', { d: 'f' }))
      .toSerializeAs('String("abc")', Sermat);
    // Arrays
    expect(Object.assign([1, 2, 3], { array: true }))
      .toSerializeAs('[1,2,3,array:true]', Sermat);
    expect(Object.assign([1, 2, 3], { 4.5: 6.78 }))
      .toSerializeAs('[1,2,3,"4.5":6.78]', Sermat);
    expect(Object.assign([1, 2, 3], { 4: 5 }))
      .toSerializeAs('[1,2,3,4,5]', Sermat, { onUndefined: 4 });
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
    expect(new Type1(1)).toSerializeAs('Type1(1)', sermat);
    expect(new Type2(1)).toSerializeAs('Type2(1)', sermat);
  });
}); // describe "Sermat".
