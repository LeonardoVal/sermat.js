describe("Sermat", function () { "use strict";

	it("core definitions.", function () { //////////////////////////////////////////////////////////
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

	it("with simple values.", function () { ////////////////////////////////////////////////////////
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

	it("with undefined values.", function () { /////////////////////////////////////////////////////
		function test(sermat) {
			expect(sermat.serialize.bind(sermat, undefined))
				.toThrow(new TypeError("Sermat.ser: Cannot serialize undefined value!"));
			expect(sermat.serialize.bind(sermat, undefined, 0))
				.toThrow(new TypeError("Sermat.ser: Cannot serialize undefined value!"));
			expect(sermat.serialize(undefined, { onUndefined: null })).toBe("null");
			expect(sermat.serialize(undefined, { onUndefined: 123 })).toBe("123");
			expect(sermat.serialize.bind(sermat, undefined, { onUndefined: SyntaxError }))
				.toThrow(new SyntaxError("Sermat.ser: Cannot serialize undefined value!"));
			expect(sermat.serialize(undefined, { onUndefined: function () { return false; } }))
				.toBe("false");
		}
		test(Sermat);
		test(new Sermat());
	});

	it("with numbers.", function () { //////////////////////////////////////////////////////////////
		function test(sermat) {
			var num;
			for (var i = 0; i < 30; i++) {
				num = (Math.random() * 2000) - 1000;
				expect(sermat.serialize(num)).toBe(num +'');
				expect(sermat.materialize(num +'')).toBe(num);
			};
			['1e3', '2e-4', '33e2', '-7e-2', '123.45678e9',
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

	it("with strings.", function () { //////////////////////////////////////////////////////////////
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

	it("with arrays.", function () { ///////////////////////////////////////////////////////////////
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

	it("with object literals.", function () { //////////////////////////////////////////////////////
		[{}, {a:1}, {a:1,b:'x'}, {a:1,b:'x',c:true},
		 {a:{b:1}}, {a:{b:1}, c:{d:'x'}}, {a:{b:{c:null}}},
		 {true1:true}, {NaNa:NaN},
		 {0:0}, {0:0,1:1,2:2}, {0:0,1:1,a:'a'}
	 ].forEach(function (obj, i) {
			[Sermat, new Sermat()].forEach(function (sermat) {
				var serialized = sermat.serialize(obj),
					materialized = sermat.materialize(serialized),
					k;
				expect(sermat.serialize(materialized)).toBe(serialized);
				for (k in obj) {
					expect(materialized.hasOwnProperty(k)).toBe(true,
						'Materialized object '+ serialized +' should have had a member '+
						k +' with value '+ obj[k] +' (test #'+ i +')!');
				}
			});
		});
	});

	it("with backtick literals.", function () { ////////////////////////////////////////////////////
		function asBackTickLiteral(text) {
			return '`'+ text.replace(/`/g, '``') +'`';
		}

		function checkValue(sermat, serialized, value) {
			try {
				expect(sermat.materialize(serialized)).toEqual(value);
			} catch (err) {
				console.error('Materializing ('+ serialized +') failed!');
				throw err;
			}
		}

		['', 'a', 'abcdef',
		 '"', 'a"b',
		 '\\', '\\\\', '\f', '\\f', '\n', '\\n', '\r', '\\r', '\t', '\\t', '\v', '\\v', '\u1234',
		 '`', '`1', '`1`', '1`1'
		].forEach(function (str) {
			checkValue(Sermat, asBackTickLiteral(str), str);
			checkValue(new Sermat(), asBackTickLiteral(str), str);
		});
		[Sermat, new Sermat()].forEach(function (sermat) {
			checkValue(sermat, '[``]', [""]);
			checkValue(sermat, '[`a`, `b`]', ['a', 'b']);
			checkValue(sermat, '{x:`123`}', {x:'123'});
			checkValue(sermat, '{x:`one`,y:`two`}', {x:'one', y:'two'});
			checkValue(sermat, '[$x=`??`,$x]', ['??', '??']);
		});
	});

	it("with comments.", function () { /////////////////////////////////////////////////////////////
		function test(sermat) {
			expect(sermat.materialize('1 /* comment */')).toBe(1);
			expect(sermat.materialize('/* comment */ true')).toBe(true);
			expect(sermat.materialize('/* [ */ null /* ] */')).toBe(null);
			expect(sermat.serialize(sermat.materialize('[1 /*, 2 */, 3]'))).toBe('[1,3]');
		}
		test(Sermat);
		test(new Sermat());
	});

	it("with errors.", function () { ///////////////////////////////////////////////////////////////
		var sermat = new Sermat();
		['', ' \n\t', '// comment ', '/* comment */',
		 'TRUE', 'False', 'NuLL',
		 '- 1', '1 2', '1 e+2', '+.1', '1.', '-e-1', '1e+',
		 "'null'", '"a', '"\\"', '"\\u12"',
		 '[', ']', '[,1]', '[1,]', '[,]',
		 '{', '}', '{,a:1}', '{a:1,}', '{,}', '{a:,1}', '{a,:1}', '{a::1}', '{:a:1}', '{a:1:}',
		].forEach(function (wrongInput) {
			expect(Sermat.materialize.bind(Sermat, wrongInput)).toThrow();
			expect(sermat.materialize.bind(sermat, wrongInput)).toThrow();
		})
	});

	it("with circular references.", function () { //////////////////////////////////////////////////
		var obj = {};
		obj.x = obj;
		expect(Sermat.serialize.bind(Sermat, obj)).toThrow();
		expect(Sermat.serialize.bind(Sermat, obj, { mode: Sermat.REPEAT_MODE })).toThrow();
		expect(Sermat.serialize(obj, { mode: Sermat.CIRCULAR_MODE })).toBe('$0={x:$0}');
	});

	it("with repeated objects.", function () { /////////////////////////////////////////////////////
		var obj = {};
		expect(Sermat.serialize.bind(Sermat, [obj, obj])).toThrow();
		expect(Sermat.serialize.bind(Sermat, {a: obj, b: obj})).toThrow();

		expect(Sermat.serialize([obj, obj], { mode: Sermat.REPEAT_MODE })).toBe("[{},{}]");
		expect(Sermat.serialize({a: obj, b: obj}, { mode: Sermat.REPEAT_MODE })).toBe("{a:{},b:{}}");
	});

	it("with bindings.", function () { /////////////////////////////////////////////////////////////
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

	it("with prototypes.", function () { ///////////////////////////////////////////////////////////
		var obj1 = Object.assign(Object.create({x:1}),{y:2}),
			obj2 = Sermat.sermat(obj1);
		expect(obj2.x).toBe(1);
		expect(obj2.y).toBe(2);
		expect(obj2.hasOwnProperty('x')).toBe(false);
		expect(obj2.hasOwnProperty('y')).toBe(true);
		expect(Object.getPrototypeOf(obj2).hasOwnProperty('x')).toBe(true);
		expect(Object.getPrototypeOf(obj2).constructor).toBe(Object);

		var obj3 = Sermat.mat('[{y:2,__proto__:$0={x:1}},{z:3,__proto__:$0}]');
		expect(obj3[0].x).toBe(1);
		expect(obj3[1].x).toBe(1);
		expect(obj3[0].y).toBe(2);
		expect(obj3[1].z).toBe(3);
		expect(Object.getPrototypeOf(obj3[0])).toBe(Object.getPrototypeOf(obj3[1]));
	});

	it(".clone()", function () { ///////////////////////////////////////////////////////////////////
		expect(Sermat.clone(NaN) +'').toBe('NaN');
		[	true, false,
			0, 1, 2, -1, 0.5, 1e3, 2e-4, 33e2, -7e-2, 123.45678e9, Infinity, -Infinity,
			'', 'a', 'abcdef', '"', 'a"b',
			'\\', '\\\\', '\f', '\\f', '\n', '\\n', '\r', '\\r', '\t', '\\t', '\v', '\\v', '\u1234',
			[], [1], [1,2,3],
			null, {}, {x:1}, {x:1, y:2},
			[[]], [[],[1],[1,2]], [{}], [{},{}], [{x:[1,2]},[{y:3}]],
			{x:{y:2}}, {x:[],y:{}}, {x:{y:[1,2]},z:[{w:3},{w:4}]},
			undefined
		].forEach(function (v) {
			expect(Sermat.clone(v)).toEqual(v);
		});
	});

	it(".hashCode()", function () { ////////////////////////////////////////////////////////////////
		expect(Sermat.clone(NaN) +'').toBe('NaN');
		[	true, false,
			0, 1, 2, -1, 0.5, 1e3, 2e-4, 33e2, -7e-2, 123.45678e9, Infinity, -Infinity,
			'', 'a', 'abcdef', '"', 'a"b',
			'\\', '\\\\', '\f', '\\f', '\n', '\\n', '\r', '\\r', '\t', '\\t', '\v', '\\v', '\u1234',
			[], [1], [1,2,3],
			null, {}, {x:1}, {x:1, y:2},
			[[]], [[],[1],[1,2]], [{}], [{},{}], [{x:[1,2]},[{y:3}]],
			{x:{y:2}}, {x:[],y:{}}, {x:{y:[1,2]},z:[{w:3},{w:4}]},
			undefined
		].forEach(function (v) {
			var h = Sermat.hashCode(v);
			expect(Math.floor(h)).toBe(h); // expect h to be an integer.
		});
	});
}); //// describe "Sermat".
