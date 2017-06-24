describe("Sermat utilities", function () { "use strict";

	it("hashCode().", function () { ////////////////////////////////////////////////////////////////
		var obj1 = Object.assign(Object.create({x:1}),{y:2});		
		expect(Sermat.hashCode(obj1)).not.toBe(Sermat.hashCode({y:2}));
		expect(Sermat.hashCode(obj1)).not.toBe(Sermat.hashCode({x:1, y:2}));
		expect(Sermat.hashCode(obj1)).not.toBe(Sermat.hashCode({y:2, x:1}));
	});
	
	it("clone().", function () { ///////////////////////////////////////////////////////////////////
		var obj1 = Object.assign(Object.create({x:1}),{y:2}),
			obj2 = Sermat.clone(obj1);
		expect(obj2.x).toBe(1);
		expect(obj2.y).toBe(2);
		expect(obj2.hasOwnProperty('x')).toBe(false);
		expect(obj2.hasOwnProperty('y')).toBe(true);
		expect(Object.getPrototypeOf(obj2).hasOwnProperty('constructor')).toBe(false);
		expect(Object.getPrototypeOf(obj2).hasOwnProperty('x')).toBe(true);
	});	
}); //// describe "Sermat".