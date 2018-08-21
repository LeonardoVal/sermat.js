define(['sermat'], function (Sermat) {
	
describe("Sermat constructions", function () { "use strict";
	it("for Date.", function () { /////////////////////////////////////////////////////////////////
		[new Date(), 
		 new Date(Date.UTC(2000, 1)),
		 new Date(Date.UTC(2000, 1, 2)),
		 new Date(Date.UTC(2000, 1, 2, 3)),
		 new Date(Date.UTC(2000, 1, 2, 3, 4)),
		 new Date(Date.UTC(2000, 1, 2, 3, 4, 5)),
		 new Date(Date.UTC(2000, 1, 2, 3, 4, 5, 6.7)),
		].forEach(function (obj) {
			var serialized = Sermat.serialize(obj);
			expect(Sermat.materialize(serialized) +'').toBe(obj +'');
		});
	});
	
	it("for RegExp.", function () { ///////////////////////////////////////////////////////////////
		[/\d+/,
		 /a|b+/g,
		 /(\/.\/)+/img
		].forEach(function (obj) {
			var serialized = Sermat.serialize(obj);
			expect(Sermat.materialize(serialized) +'').toBe(obj +'');
		});
	});

	it("with default materializer.", function () { ////////////////////////////////////////////////
		function Point3D(x, y, z) {
			this.x = +x;
			this.y = +y;
			this.z = +z;
		}
		Point3D.__SERMAT__ = {
			identifier: "Point3D",
			serializer: function serializer(value) {
				return [value.x, value.y, value.z];
			}
		};
		var sermat = new Sermat();
		sermat.include(Point3D);
		
		[new Point3D(3, 77), new Point3D(2.95, Infinity), new Point3D(52)
		].forEach(function (p1) {
			var p2 = sermat.sermat(p1); 
			expect(p2.constructor).toBe(Point3D);
			expect(p2 instanceof Point3D).toBe(true);
			expect(p2.x +'').toBe(p1.x +''); // String conversion is used so that comparing NaNs works.
			expect(p2.y +'').toBe(p1.y +'');
			expect(p2.z +'').toBe(p1.z +'');
		});
	});
	
	it("with recursive types.", function () { /////////////////////////////////////////////////////
		function Cons(head, tail) {
			this.head = head || null;
			this.tail = tail || null;
		}
		Sermat.register({ 
			type: Cons, 
			serializer: function serializer(value) {
				return [value.head, value.tail];
			}/*, <default materializer> */
		});
		
		[new Cons(), new Cons(1), new Cons(1, new Cons(2)), new Cons(1, new Cons(2, new Cons(3)))
		].forEach(function (x1) {
			var x2 = Sermat.mat(Sermat.ser(x1)); 
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
	
	it("with references.", function () { ///////////////////////////////////////////////////////////
		function Ref() {
			this.refs = Array.prototype.slice.call(arguments);
		}
		Ref.__SERMAT__ = {
			serializer: function serializer(value) {
				return value.refs;
			}
		};
		var sermat = new Sermat();
		sermat.include(Ref);
		
		var r1 = new Ref(), r2 = new Ref(r1, r1), r3;
		expect(sermat.ser.bind(sermat, r2)).toThrow();
		[Sermat.REPEAT_MODE, Sermat.BINDING_MODE, Sermat.CIRCULAR_MODE].forEach(function (mode) {
			r3 = sermat.mat(sermat.ser(r2, { mode: mode }));
			[r3, r3.refs[0], r3.refs[1]].forEach(function (r) {
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
		expect(sermat.ser.bind(sermat, r2)).toThrow();
		expect(sermat.ser.bind(sermat, r2, { mode: Sermat.REPEAT_MODE })).toThrow();
		expect(sermat.ser.bind(sermat, r2, { mode: Sermat.BINDING_MODE })).toThrow();
		r3 = sermat.mat(sermat.ser(r2, { mode: Sermat.CIRCULAR_MODE }));
		[r3, r3.refs[0], r3.refs[1]].forEach(function (r) {
			expect(r instanceof Ref).toBe(true);
		});
		expect(r3.refs[0]).not.toBe(r3.refs[1]);
		expect(r3.refs[1]).toBe(r3);
	});
	
	it("with types.", function () { ////////////////////////////////////////////////////////////////
		var sermat1 = new Sermat();
		expect(sermat1.ser(Object)).toBe('$Object');
		expect(sermat1.mat('$Number')).toBe(Number);
		expect(sermat1.sermat(String)).toBe(String);
	});
	
	it("with functions.", function () { ////////////////////////////////////////////////////////////
		var sermat = new Sermat();
		sermat.include('Function');
		var f1 = function id(x) {
				return x;
			},
			f2 = sermat.sermat(f1);
		expect(typeof f2).toBe('function');
		expect(f1(1)).toBe(f2(1));
		expect(f1.length).toBe(f2.length);
		expect(f1.name).toBe(f2.name);
		
		f1 = eval('((x) => x)');
		f2 = sermat.sermat(f1);
		expect(typeof f2).toBe('function');
		expect(f1(1)).toBe(f2(1));
		expect(f1.length).toBe(f2.length);
	});
	
	it("with objetified native types.", function () { //////////////////////////////////////////////
		// Boolean
		expect(Sermat.ser(Object(true))).toBe('Boolean(true)');
		expect(Sermat.ser(new Boolean(false))).toBe('Boolean(false)');
		expect(Sermat.ser(Object.assign(new Boolean(true), {x:1}))).toBe('Boolean(true,x:1)');
		// Number
		expect(Sermat.ser(Object(1))).toBe('Number(1)');
		expect(Sermat.ser(new Number(2.3))).toBe('Number(2.3)');
		expect(Sermat.ser(Object.assign(new Number(45.678), {n:9}))).toBe('Number(45.678,n:9)');
		// String
		expect(Sermat.ser(Object.assign("abc", {d:'f'}))).toBe('String("abc",d:"f")');
		expect(Sermat.ser(Object.assign("abc", {2.3:4.5}))).toBe('String("abc","2.3":4.5)');
		expect(Sermat.ser.bind(Object.assign("abc", {4:5}))).toThrow(); // Integer properties are not supported.
		// Arrays
		expect(Sermat.ser(Object.assign([1,2,3], {array:true}))).toBe('[1,2,3,array:true]');
		expect(Sermat.ser(Object.assign([1,2,3], {4.5:6.78}))).toBe('[1,2,3,"4.5":6.78]');
		expect(Sermat.ser(Object.assign([1,2,3], {4:5}), { onUndefined: 4 })).toBe('[1,2,3,4,5]');
		// Other objects
		var re = Object.assign(/\w/i, {one:1});
		expect(Sermat.ser(re)).toBe('RegExp("\\\\w","i",one:1)');
		expect(Object.keys(Sermat.sermat(re)) +'').toBe('one');
		var date = Object.assign(new Date(Date.UTC(1970,1,1,0,0,0,0)), {two:2});
		expect(Sermat.ser(date)).toBe('Date(1970,1,1,0,0,0,0,two:2)');
		expect(Object.keys(Sermat.sermat(date)) +'').toBe('two');
		
		
		var sermat = new Sermat();
		sermat.include('Function');
		expect(sermat.sermat(Object.assign(function add(x,y) {
			return x + y;
		}, {yes:true})).yes).toBe(true);
	});
	
	it("with default serializer and/or materializer.", function () { ///////////////////////////////
		function Point3D(x, y, z) {
			this.x = +x;
			this.y = +y;
			this.z = +z;
		}
		Point3D.__SERMAT__ = {};
		var sermat = new Sermat(),
			p1 = new Point3D(1,2,3);
		expect(sermat.ser(p1)).toBe('Point3D(1,2,3)');
		var p2 = sermat.sermat(p1);
		expect(p2.x).toBe(1);
		expect(p2.y).toBe(2);
		expect(p2.z).toBe(3);
	});
	
	it("with inherited __SERMAT__.", function () { /////////////////////////////////////////////////
		function Type1(x) {
			this.x = x;
		}
		Type1.__SERMAT__ = {
			serializer: function (obj) {
				return [obj.x];
			}
		};
		function Type2(x) {
			Type1.call(this, x);
		}
		Object.setPrototypeOf(Type2, Type1);
		var sermat = new Sermat();
		expect(sermat.ser(new Type1(1))).toBe('Type1(1)');
		expect(sermat.ser(new Type2(1))).toBe('Type2(1)');
		// This must fail because the subtype does not have an identifier.
		expect(sermat.ser.bind(Object.setPrototypeOf(function (x) {
			Type1.call(this, x);
		}, Type1))).toThrow();
	});
	
	xit("with pseudo-constructions.", function () { /////////////////////////////////////////////////
		function Point2D(x, y) {
			this.x = +x;
			this.y = +y;
		}
		Point2D.__SERMAT__ = {};
		var sermat = new Sermat();
		sermat.include(Point2D);
	});
	
	it("with clone().", function () { //////////////////////////////////////////////////////////////
		function Point2D(x, y) {
			this.x = +x;
			this.y = +y;
		}
		Point2D.__SERMAT__ = {};
		var sermat = new Sermat();
		sermat.include(Point2D);
		var value = new Point2D(1, 22);
		expect(sermat.ser(sermat.clone(value))).toBe(sermat.ser(value));
		value = new Point2D(0, 0);
		expect(sermat.ser(sermat.clone(value))).toBe(sermat.ser(value));
		value = new Point2D(3, -3);
		expect(sermat.ser(sermat.clone(value))).toBe(sermat.ser(value));
	});
	
	it("with hashCode().", function () { ///////////////////////////////////////////////////////////
		function Point2D(x, y) {
			this.x = +x;
			this.y = +y;
		}
		Point2D.__SERMAT__ = {};
		var sermat = new Sermat();
		sermat.include(Point2D);
		var value = new Point2D(1, 22),
			hash = sermat.hashCode(value);
		expect(hash |0).toBe(hash);
		hash = sermat.hashCode(value = new Point2D(0, 0));
		expect(sermat.ser(sermat.clone(value))).toBe(sermat.ser(value));
		hash = sermat.hashCode(value = new Point2D(3, -3));
		expect(sermat.ser(sermat.clone(value))).toBe(sermat.ser(value));
	});
}); //// describe "Sermat".

}); //// define