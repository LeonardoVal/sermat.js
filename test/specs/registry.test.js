/* eslint-disable camelcase, max-classes-per-file */
import { Sermat } from '../../src/index';
import { addMatchers } from '../jest-utils';

describe('Sermat registry', () => {
  addMatchers(expect);

  class Point2D {
    constructor(x, y) {
      this.x = +x;
      this.y = +y;
    }

    static __SERMAT__ = {
      serializer(value) {
        return [value.x, value.y];
      },
      materializer(_obj, args) {
        return args && new Point2D(args[0], args[1]);
      },
    }
  }

  class Rect2D {
    constructor(topLeft, bottomRight) {
      this.topLeft = topLeft;
      this.bottomRight = bottomRight;
    }

    static __SERMAT__ = {
      serializer(value) {
        return [value.topLeft, value.bottomRight];
      },
      materializer(_obj, args) {
        return args && new Point2D(args[0], args[1]);
      },
    }
  }

  const rect1 = new Rect2D(new Point2D(1, 2), new Point2D(3, 4));

  it('with include().', () => {
    const sermat = new Sermat();
    expect(sermat.ser.bind(sermat, rect1)).toThrow();
    expect(sermat.ser.bind(sermat, rect1.topLeft)).toThrow();
    sermat.include(Point2D);
    expect(sermat.ser.bind(sermat, rect1)).toThrow();
    expect(sermat.ser(rect1.topLeft)).toBe('Point2D(1,2)');
    sermat.include(Rect2D);
    expect(sermat.ser(rect1)).toBe('Rect2D(Point2D(1,2),Point2D(3,4))');
    expect(sermat.ser(rect1.topLeft)).toBe('Point2D(1,2)');
  });

  xit('with include().', () => {
    const sermat1 = new Sermat();
    Point2D.__SERMAT__ = Point2D__SERMAT__();
    Rect2D.__SERMAT__ = Rect2D__SERMAT__();
    sermat1.include(Point2D);
    expect(sermat1.ser(rect1.topLeft)).toBe('Point2D(1,2)');
    expect(sermat1.ser(rect1.bottomRight)).toBe('Point2D(3,4)');
    sermat1.include(Rect2D);
    expect(sermat1.ser(rect1)).toBe('Rect2D(Point2D(1,2),Point2D(3,4))');

    const sermat2 = new Sermat();
    Point2D.__SERMAT__ = Point2D__SERMAT__();
    Rect2D.__SERMAT__ = Rect2D__SERMAT__({ include: [Point2D] });
    sermat2.include(Rect2D);
    expect(sermat2.ser(rect1)).toBe('Rect2D(Point2D(1,2),Point2D(3,4))');

    const sermat3 = new Sermat({ autoInclude: false });
    Point2D.__SERMAT__ = Point2D__SERMAT__();
    Rect2D.__SERMAT__ = Rect2D__SERMAT__();
    sermat3.include(Rect2D);
    expect(sermat3.ser.bind(sermat3, rect1)).toThrow();

    const sermat4 = new Sermat({ autoInclude: false });
    Point2D.__SERMAT__ = Point2D__SERMAT__();
    Rect2D.__SERMAT__ = Rect2D__SERMAT__({ include: [Point2D] });
    sermat4.include({ __SERMAT__: { include: [Rect2D] } });
    expect(sermat4.ser(rect1)).toBe('Rect2D(Point2D(1,2),Point2D(3,4))');

    const sermat5 = new Sermat({ autoInclude: true });
    Point2D.__SERMAT__ = Point2D__SERMAT__();
    Rect2D.__SERMAT__ = Rect2D__SERMAT__();
    expect(sermat5.ser(rect1)).toBe('Rect2D(Point2D(1,2),Point2D(3,4))');
  });

  it('with exclude().', () => {
    const sermat1 = new Sermat();
    let dateConstruction = sermat1.construction(Date);
    expect(dateConstruction).toBeDefined();
    expect(sermat1.ser(new Date())).toBeTruthy();
    expect(sermat1.exclude(Date)).toEqual([dateConstruction]);
    expect(sermat1.construction(Date)).not.toBeDefined();
    expect(sermat1.ser.bind(sermat1, new Date())).toThrow();

    const sermat2 = new Sermat();
    dateConstruction = sermat2.construction(Date);
    const regexpConstruction = sermat2.construction(RegExp);
    expect(dateConstruction).toBeTruthy();
    expect(regexpConstruction).toBeTruthy();
    expect(sermat2.ser([new Date(), /.*/g])).toBeTruthy();
    expect(sermat2.exclude(Date, RegExp)).toEqual([dateConstruction, regexpConstruction]);
    expect(sermat2.ser.bind(sermat2, [new Date(), /.*/g])).toThrow();

    const sermat3 = new Sermat();
    dateConstruction = sermat3.construction(Date);
    expect(sermat3.exclude(Math)).toEqual([]);
    expect(sermat3.exclude(Date, Date)).toEqual([dateConstruction]);
  });
}); // describe "Sermat".
