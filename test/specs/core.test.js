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
		function test(sermat) {
			expect(sermat.serialize(true)).toBe("true");
			expect(sermat.serialize(false)).toBe("false");
			expect(sermat.serialize(null)).toBe("null");		
			expect(sermat.materialize('true')).toBe(true);
			expect(sermat.materialize('false')).toBe(false);
			expect(sermat.materialize('null')).toBe(null);
		}
		test(Sermat);
		test(new Sermat());
	});
	
	it(" with undefined values.", function () {
		function test(sermat) {
			expect(sermat.serialize.bind(Sermat, undefined)).toThrow();
			expect(sermat.serialize.bind(Sermat, undefined, 0)).toThrow();
			expect(sermat.serialize(undefined, { allowUndefined: 1 })).toBe("null");
		}
		test(Sermat);
		test(new Sermat());
	});
	
	it(" with numbers.", function () {
		function test(sermat) {
			var num;
			for (var i = 0; i < 30; i++) {
				num = (Math.random() * 2000) - 1000;
				expect(sermat.serialize(num)).toBe(num +'');
				expect(sermat.materialize(num +'')).toBe(num);
			};
			['1e3', '2e-4', '33e2', '-7e-2',
			 'Infinity', '+Infinity', '-Infinity'
			].forEach(function (str) {
				expect(sermat.materialize(str)).toBe(+str);
			});
			expect(isNaN(sermat.materialize('NaN'))).toBe(true);
			expect(sermat.serialize(Infinity)).toBe("Infinity");
			expect(sermat.serialize(-Infinity)).toBe("-Infinity");
			expect(sermat.serialize(NaN)).toBe("NaN");
		}
		test(Sermat);
		test(new Sermat());
	});
	
	it(" with strings.", function () {
		function checkString(sermat, text) {
			var serialized = sermat.serialize(text);
			try {
				expect(sermat.materialize(serialized)).toBe(text);
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
		].forEach(function (str) {
			checkString(Sermat, str);
			checkString(new Sermat(), str);
		});
		for (var i = 0; i < 1024; i++) {
			checkString(Sermat, String.fromCharCode(i));
			checkString(new Sermat(), String.fromCharCode(i));
		}
	});
	
	it(" with arrays.", function () {
		function test(sermat) {
			var array = [],
				serialized = sermat.serialize(array);
			expect(sermat.serialize(sermat.materialize(serialized))).toBe(serialized);
			[1, 'a', '\n', true, null, [1]
			].forEach(function (value) {
				array.push(value);
				var serialized = sermat.serialize(array);
				expect(sermat.serialize(sermat.materialize(serialized))).toBe(serialized);
			});
		}
		test(Sermat);
		test(new Sermat());
	});
	
	it(" with object literals.", function () { 
		[{}, {a:1}, {a:1,b:'x'}, {a:1,b:'x',c:true},
		 {a:{b:1}}, {a:{b:1}, c:{d:'x'}}, {a:{b:{c:null}}},
		 {true1:true}, {NaNa:NaN}
		].forEach(function (obj) {
			var serialized = Sermat.serialize(obj);
			expect(Sermat.serialize(Sermat.materialize(serialized))).toBe(serialized);
			var sermat = new Sermat();
			serialized = sermat.serialize(obj);
			expect(sermat.serialize(sermat.materialize(serialized))).toBe(serialized);
		});
	});
	
	it(" with comments.", function () {
		function test(sermat) {
			expect(sermat.materialize('1 /* comment */')).toBe(1);
			expect(sermat.materialize('/* comment */ true')).toBe(true);
			expect(sermat.materialize('/* [ */ null /* ] */')).toBe(null);
			expect(sermat.serialize(sermat.materialize('[1 /*, 2 */, 3]'))).toBe('[1,3]');
		}
		test(Sermat);
		test(new Sermat());
	});
	
	it(" with errors.", function () {
		var sermat = new Sermat();
		['', ' \n\t', '// comment ', '/* comment */',
		 'undefined', 'TRUE', 'False', 'NuLL',
		 '- 1', '1 2', '1 e+2', '+.1', '1.', '-e-1', '1e+',
		 "'null'", '"a', '"\\"', '"\\u12"',
		 '[', ']', '[,1]', '[1,]', '[,]',
		 '{', '}', '{,a:1}', '{a:1,}', '{,}', '{a:,1}', '{a,:1}', '{a::1}', '{:a:1}', '{a:1:}',
		].forEach(function (wrongInput) {
			expect(Sermat.materialize.bind(Sermat, wrongInput)).toThrow();
			expect(sermat.materialize.bind(sermat, wrongInput)).toThrow();
		})
	});
	
	it(" with circular references.", function () {
		var obj = {};
		obj.x = obj;
		expect(Sermat.serialize.bind(Sermat, obj)).toThrow();
		expect(Sermat.serialize.bind(Sermat, obj, { mode: Sermat.REPEAT_MODE })).toThrow();
		expect(Sermat.serialize(obj, { mode: Sermat.CIRCULAR_MODE })).toBe('$0={x:$0}');
	});
	
	it(" with repeated objects.", function () {
		var obj = {};
		expect(Sermat.serialize.bind(Sermat, [obj, obj])).toThrow();
		expect(Sermat.serialize.bind(Sermat, {a: obj, b: obj})).toThrow();
		
		expect(Sermat.serialize([obj, obj], { mode: Sermat.REPEAT_MODE })).toBe("[{},{}]");
		expect(Sermat.serialize({a: obj, b: obj}, { mode: Sermat.REPEAT_MODE })).toBe("{a:{},b:{}}");
	});
	
	it(" with bindings.", function () {
		var obj = {x:88},
			serialized = Sermat.serialize([obj, obj], { mode: Sermat.BINDING_MODE }),
			materialized = Sermat.materialize(serialized);
		expect(Array.isArray(materialized)).toBe(true);
		expect(materialized[0]).toBe(materialized[1]);
		materialized[0].x = 17;
		expect(materialized[1].x).toBe(17);
		
		serialized = Sermat.serialize({a: obj, b: obj}, { mode: Sermat.BINDING_MODE }),
		materialized = Sermat.materialize(serialized);
		expect(materialized.a).toBe(materialized.b);
		materialized.a.x = 93;
		expect(materialized.b.x).toBe(93);
		
		serialized = Sermat.serialize([obj, {a: obj, b: {c: obj}}], { mode: Sermat.BINDING_MODE }),
		materialized = Sermat.materialize(serialized);
		expect(Array.isArray(materialized)).toBe(true);
		expect(materialized[0]).toBe(materialized[1].a);
		expect(materialized[0]).toBe(materialized[1].b.c);
	});
}); //// describe "Sermat".