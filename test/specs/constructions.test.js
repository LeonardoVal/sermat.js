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
		function Point2D(x, y) {
			this.x = +x;
			this.y = +y;
		}
		Point2D.__SERMAT__ = {
			identifier: "Point2D",
			serializer: function serializer(value) {
				return [value.x, value.y];
			}
		}
		Sermat.include(Point2D);
		
		[new Point2D(3, 77), new Point2D(2.95, Infinity), new Point2D(52)
		].forEach(function (p1) {
			var p2 = Sermat.mat(Sermat.ser(p1)); 
			expect(p2.constructor).toBe(Point2D);
			expect(p2 instanceof Point2D).toBe(true);
			expect(p2.x +'').toBe(p1.x +''); // String conversion is used so that comparing NaNs works.
			expect(p2.y +'').toBe(p1.y +'');
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
		Sermat.include(Ref);
		
		var r1 = new Ref(), r2 = new Ref(r1, r1), r3;
		expect(Sermat.ser.bind(Sermat, r2)).toThrow();
		[Sermat.REPEAT_MODE, Sermat.BINDING_MODE, Sermat.CIRCULAR_MODE].forEach(function (mode) {
			r3 = Sermat.mat(Sermat.ser(r2, { mode: mode }));
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
		expect(Sermat.ser.bind(Sermat, r2)).toThrow();
		expect(Sermat.ser.bind(Sermat, r2, { mode: Sermat.REPEAT_MODE })).toThrow();
		expect(Sermat.ser.bind(Sermat, r2, { mode: Sermat.BINDING_MODE })).toThrow();
		r3 = Sermat.mat(Sermat.ser(r2, { mode: Sermat.CIRCULAR_MODE }));
		[r3, r3.refs[0], r3.refs[1]].forEach(function (r) {
			expect(r instanceof Ref).toBe(true);
		});
		expect(r3.refs[0]).not.toBe(r3.refs[1]);
		expect(r3.refs[1]).toBe(r3);
	});
}); //// describe "Sermat".