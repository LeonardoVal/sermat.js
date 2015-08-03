describe("Sermat registry", function () { "use strict";
	var Point2D = function Point2D(x, y) {
			this.x = +x;
			this.y = +y;
		},
		Rect2D = function Rect2D(topLeft, bottomRight) {
			this.topLeft = topLeft;
			this.bottomRight = bottomRight;
		};
	function Point2D__SERMAT__(obj) {
		obj = obj || {};
		obj.identifier = "Point2D";
		obj.serializer = function serializer(value) {
			return [value.x, value.y];
		};
		return obj;
	}
	function Rect2D__SERMAT__(obj) {
		obj = obj || {};
		obj.identifier = "Rect2D";
		obj.serializer = function serializer(value) {
			return [value.topLeft, value.bottomRight];
		};
		return obj;
	}
	var rect1 = new Rect2D(new Point2D(1,2), new Point2D(3,4));

	it("with register().", function () { ///////////////////////////////////////////////////////////
		var sermat = new Sermat();		
		expect(sermat.ser.bind(sermat, rect1)).toThrow();
		expect(sermat.ser.bind(sermat, rect1.topLeft)).toThrow();
		sermat.register(Point2D__SERMAT__({ type: Point2D }));
		expect(sermat.ser.bind(sermat, rect1)).toThrow();
		expect(sermat.ser(rect1.topLeft)).toBe('Point2D(1,2)');
		sermat.register(Rect2D__SERMAT__({ type: Rect2D }));
		expect(sermat.ser(rect1)).toBe('Rect2D(Point2D(1,2),Point2D(3,4))');
		expect(sermat.ser(rect1.topLeft)).toBe('Point2D(1,2)');
	});
	
	it("with include().", function () { ////////////////////////////////////////////////////////////
		var sermat1 = new Sermat();
		Point2D.__SERMAT__ = Point2D__SERMAT__();
		Rect2D.__SERMAT__ = Rect2D__SERMAT__();
		sermat1.include(Point2D);
		expect(sermat1.ser(rect1.topLeft)).toBe('Point2D(1,2)');
		expect(sermat1.ser(rect1.bottomRight)).toBe('Point2D(3,4)');
		sermat1.include(Rect2D);
		expect(sermat1.ser(rect1)).toBe('Rect2D(Point2D(1,2),Point2D(3,4))');
		
		var sermat2 = new Sermat();
		Point2D.__SERMAT__ = Point2D__SERMAT__();
		Rect2D.__SERMAT__ = Rect2D__SERMAT__({ include: [Point2D] });
		sermat2.include(Rect2D);
		expect(sermat2.ser(rect1)).toBe('Rect2D(Point2D(1,2),Point2D(3,4))');
		
		var sermat3 = new Sermat({ autoInclude: false });
		Point2D.__SERMAT__ = Point2D__SERMAT__();
		Rect2D.__SERMAT__ = Rect2D__SERMAT__();
		sermat3.include(Rect2D);
		expect(sermat3.ser.bind(sermat3, rect1)).toThrow();
		
		var sermat4 = new Sermat({ autoInclude: false });
		Point2D.__SERMAT__ = Point2D__SERMAT__();
		Rect2D.__SERMAT__ = Rect2D__SERMAT__({ include: [Point2D] });
		sermat4.include({ __SERMAT__: { include: [Rect2D] } });
		expect(sermat4.ser(rect1)).toBe('Rect2D(Point2D(1,2),Point2D(3,4))');
		
		var sermat5 = new Sermat({ autoInclude: true });
		Point2D.__SERMAT__ = Point2D__SERMAT__();
		Rect2D.__SERMAT__ = Rect2D__SERMAT__();
		expect(sermat4.ser(rect1)).toBe('Rect2D(Point2D(1,2),Point2D(3,4))');
	});
}); //// describe "Sermat".