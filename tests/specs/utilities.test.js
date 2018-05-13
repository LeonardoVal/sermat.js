define(['sermat'], function (Sermat) {

describe("Sermat utilities", function () { "use strict";
	var List = function List() {
		this.elems = Array.prototype.slice.call(arguments);
	};
	List.__SERMAT__ = {
		identifier: 'List',
		serializer: function serialize_List(obj) {
			return obj.elems;
		}
	};

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

		var list1 = new List(1,2,3),
			list2 = Sermat.clone(list1);
		expect(list2 instanceof List).toBe(true);
		expect(list2.elems).toEqual(list1.elems);
		list1 = new List(/\d+/, /\w+/);
		list2 = Sermat.clone(list1);
		expect(list2 instanceof List).toBe(true);
		expect(list2.elems).toEqual(list1.elems);
		expect(list2.elems[0]).not.toBe(list1.elems[0]);
		expect(list2.elems[1]).not.toBe(list1.elems[1]);
	});
}); //// describe "Sermat".

}); //// define
