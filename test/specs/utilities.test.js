/* eslint-disable max-classes-per-file */
/* global describe, it, xit, expect */
import { Sermat } from '../../src/index';

describe('Sermat utilities', () => {
  it('basics with clone()', () => {
    expect(`${Sermat.clone(NaN)}`).toBe('NaN');
    [
      true, false,
      0, 1, 2, -1, 0.5, 1e3, 2e-4, 33e2, -7e-2, 123.45678e9, Infinity, -Infinity,
      '', 'a', 'abcdef', '"', 'a"b',
      '\\', '\\\\', '\f', '\\f', '\n', '\\n', '\r', '\\r', '\t', '\\t', '\v', '\\v', '\u1234',
      [], [1], [1, 2, 3],
      null, {}, { x: 1 }, { x: 1, y: 2 },
      [[]], [[], [1], [1, 2]], [{}], [{}, {}], [{ x: [1, 2] }, [{ y: 3 }]],
      { x: { y: 2 } }, { x: [], y: {} }, { x: { y: [1, 2] }, z: [{ w: 3 }, { w: 4 }] },
      undefined,
    ].forEach((v) => expect(Sermat.clone(v)).toEqual(v));
  });

  it('basics with hashCode()', () => {
    expect(`${Sermat.clone(NaN)}`).toBe('NaN');
    [
      true, false,
      0, 1, 2, -1, 0.5, 1e3, 2e-4, 33e2, -7e-2, 123.45678e9, Infinity, -Infinity,
      '', 'a', 'abcdef', '"', 'a"b',
      '\\', '\\\\', '\f', '\\f', '\n', '\\n', '\r', '\\r', '\t', '\\t', '\v', '\\v', '\u1234',
      [], [1], [1, 2, 3],
      null, {}, { x: 1 }, { x: 1, y: 2 },
      [[]], [[], [1], [1, 2]], [{}], [{}, {}], [{ x: [1, 2] }, [{ y: 3 }]],
      { x: { y: 2 } }, { x: [], y: {} }, { x: { y: [1, 2] }, z: [{ w: 3 }, { w: 4 }] },
      undefined,
    ].forEach((v) => {
      const h = Sermat.hashCode(v);
      expect(h).toBe(h); // expect h to be an integer.
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

  it('constructions with clone().', () => {
    defsPoint3D.forEach((typeDef) => {
      const sermat = new Sermat();
      const Point3D = typeDef();
      Point3D.__SERMAT__ = {};
      sermat.include(Point3D);
      examplesPoint3D(Point3D).forEach((value) => {
        expect(sermat.ser(sermat.clone(value))).toBe(sermat.ser(value));
      });
    });
  });

  it('constructions with hashCode().', () => {
    defsPoint3D.forEach((typeDef) => {
      const sermat = new Sermat();
      const Point3D = typeDef();
      Point3D.__SERMAT__ = {};
      sermat.include(Point3D);
      examplesPoint3D(Point3D).forEach((value) => {
        const hash1 = sermat.hashCode(value);
        expect(hash1).toBeOfType('number');
        const hash2 = sermat.hashCode(sermat.clone(value));
        expect(hash2).toBe(hash1);
      });
    });
  });
}); // describe "Sermat".
