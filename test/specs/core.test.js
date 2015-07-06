describe("Sermat", function () { "use strict";

	it(" core definitions.", function () {
		expect(Sermat).toBeOfType("function");
		expect(Sermat.identifier).toBeOfType("function");
		expect(Sermat.register).toBeOfType("function");
		expect(Sermat.serialize).toBeOfType("function");
		expect(Sermat.materialize).toBeOfType("function");
		
		var newSermat = new Sermat();
		expect(newSermat).toBeOfType(Sermat);
		expect(newSermat.identifier).toBeOfType("function");
		expect(newSermat.register).toBeOfType("function");
		expect(newSermat.serialize).toBeOfType("function");
		expect(newSermat.materialize).toBeOfType("function");
	});
	
	it(" with simple values.", function () {
		expect(Sermat.serialize(true)).toBe("true");
		expect(Sermat.serialize(false)).toBe("false");
		expect(Sermat.serialize(null)).toBe("null");		
		expect(Sermat.materialize('true')).toBe(true);
		expect(Sermat.materialize('false')).toBe(false);
		expect(Sermat.materialize('null')).toBe(null);
	});
	
	it(" with undefined values.", function () {
		expect(Sermat.serialize.bind(Sermat, undefined)).toThrow();
		expect(Sermat.serialize.bind(Sermat, undefined, 0)).toThrow();
		expect(Sermat.serialize(undefined, Sermat.ALLOW_UNDEFINED)).toBe("null");
	});
	
	it(" with numbers.", function () {
		var num;
		for (var i = 0; i < 30; i++) {
			num = (Math.random() * 2000) - 1000;
			expect(Sermat.serialize(num)).toBe(num +'');
			expect(Sermat.materialize(num +'')).toBe(num);
		};
		['1e3', '2e-4', '33e2', '-7e-2',
		 'Infinity', '+Infinity', '-Infinity'
		].forEach(function (str) {
			expect(Sermat.materialize(str)).toBe(+str);
		});
		expect(isNaN(Sermat.materialize('NaN'))).toBe(true);
		expect(Sermat.serialize(Infinity)).toBe("Infinity");
		expect(Sermat.serialize(-Infinity)).toBe("-Infinity");
		expect(Sermat.serialize(NaN)).toBe("NaN");
	});
	
	it(" with strings.", function () {
		function checkString(text) {
			var serialized = Sermat.serialize(text);
			try {
				expect(Sermat.materialize(serialized)).toBe(text);
			} catch (err) {
				console.error('Materializing string '+ serialized +' ('+
					text.split('').map(function (chr) { return chr.charCodeAt(0); }).join(',') +
					') failed!');
				throw err;
			}
		}
	
		['', 'a', 'abcdef', 
		 '"', 'a"b', 
		 '\\', '\\\\', '\f', '\\f', '\n', '\\n', '\r', '\\r', '\t', '\\t', '\v', '\\v', '\u1234'
		].forEach(checkString);
		for (var i = 0; i < 1024; i++) {
			checkString(String.fromCharCode(i));
		}
	});
	
	it(" with arrays.", function () {
		var array = [],
			serialized = Sermat.serialize(array);
		expect(Sermat.serialize(Sermat.materialize(serialized))).toBe(serialized);
		[1, 'a', '\n', true, null, [1]
		].forEach(function (value) {
			array.push(value);
			var serialized = Sermat.serialize(array);
			expect(Sermat.serialize(Sermat.materialize(serialized))).toBe(serialized);
		});
	});
	
	it(" with object literals.", function () { 
		[{}, {a:1}, {a:1,b:'x'}, {a:1,b:'x',c:true},
		 {a:{b:1}}, {a:{b:1}, c:{d:'x'}}, {a:{b:{c:null}}},
		 {true1:true}, {NaNa:NaN}
		].forEach(function (obj) {
			var serialized = Sermat.serialize(obj);
			expect(Sermat.serialize(Sermat.materialize(serialized))).toBe(serialized);
		});
	});
	
	it(" with comments.", function () {
		expect(Sermat.materialize('1 /* comment */')).toBe(1);
		expect(Sermat.materialize('/* comment */ true')).toBe(true);
		expect(Sermat.materialize('/* [ */ null /* ] */')).toBe(null);
		expect(Sermat.serialize(Sermat.materialize('[1 /*, 2 */, 3]'))).toBe('[1,3]');
	});
	
	it(" with errors.", function () {
		['', ' \n\t', '// comment ', '/* comment */',
		 'undefined', 'TRUE', 'False', 'NuLL',
		 '- 1', '1 2', '1 e+2', '+.1', '1.', '-e-1', '1e+',
		 "'null'", '"a', '"\\"', '"\\u12"',
		 '[', ']', '[,1]', '[1,]', '[,]',
		 '{', '}', '{,a:1}', '{a:1,}', '{,}', '{a:,1}', '{a,:1}', '{a::1}', '{:a:1}', '{a:1:}',
		].forEach(function (wrongInput) {
			expect(Sermat.materialize.bind(Sermat, wrongInput)).toThrow();
		})
	});
	
	it(" with circular references.", function () {
		var obj = {};
		obj.x = obj;
		expect(Sermat.serialize.bind(Sermat, obj)).toThrow();
		expect(Sermat.serialize.bind(Sermat, obj, Sermat.ALLOW_REPEATED)).toThrow();
		expect(Sermat.serialize(obj, Sermat.ALLOW_CIRCULAR)).toBe('$0={x:$0}');
	});
	
	it(" with repeated objects.", function () {
		var obj = {};
		expect(Sermat.serialize.bind(Sermat, [obj, obj])).toThrow();
		expect(Sermat.serialize.bind(Sermat, {a: obj, b: obj})).toThrow();
		
		expect(Sermat.serialize([obj, obj], Sermat.ALLOW_REPEATED)).toBe("[{},{}]");
		expect(Sermat.serialize({a: obj, b: obj}, Sermat.ALLOW_REPEATED)).toBe("{a:{},b:{}}");
	});
	
	it(" with bindings.", function () {
		var obj = {x:88},
			serialized = Sermat.serialize([obj, obj], Sermat.ALLOW_BINDINGS),
			materialized = Sermat.materialize(serialized);
		expect(Array.isArray(materialized)).toBe(true);
		expect(materialized[0]).toBe(materialized[1]);
		materialized[0].x = 17;
		expect(materialized[1].x).toBe(17);
		
		serialized = Sermat.serialize({a: obj, b: obj}, Sermat.ALLOW_BINDINGS),
		materialized = Sermat.materialize(serialized);
		expect(materialized.a).toBe(materialized.b);
		materialized.a.x = 93;
		expect(materialized.b.x).toBe(93);
		
		serialized = Sermat.serialize([obj, {a: obj, b: {c: obj}}], Sermat.ALLOW_BINDINGS),
		materialized = Sermat.materialize(serialized);
		expect(Array.isArray(materialized)).toBe(true);
		expect(materialized[0]).toBe(materialized[1].a);
		expect(materialized[0]).toBe(materialized[1].b.c);
	});
}); //// describe "Sermat".
