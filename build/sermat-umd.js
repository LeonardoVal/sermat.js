(function (global, init) { "use strict";
	if (typeof define === 'function' && define.amd) {
		define([], init); // AMD module.
	} else if (typeof exports === 'object' && module.exports) {
		module.exports = init(); // CommonJS module.
	} else {
		global.Sermat = init(); // Browser.
	}
})(this,/** Library wrapper and layout.
*/
function __init__() { "use strict";
	/** Some utility functions used in the library.
	*/
	function raise(context, message, data) {
		var error = new Error("Sermat."+ context +': '+ message);
		if (data) {
			error.data = data;
		}
		throw error;
	}

	function member(obj, id, value, flags) {
		flags = flags|0;
		Object.defineProperty(obj, id, {
			value: value,
			writable: flags & 0x4, 
			configurable: flags & 0x2, 
			enumerable: flags & 0x1
		});
	}

	function coalesce(v1, v2) {
		return typeof v1 === 'undefined' ? v2 : v1;		
	}
	
/** See `__epilogue__.js`.
*/

/** ## Registry ####################################################################################

Sermat allows an extensible syntax to write and read instances of custom _classes_. The syntax 
ressembles a function call in Javascript. For example:

```
RegExp("\d+", "g")
Date(1999,12,31,23,59,59,999)
```

These are called _constructions_. In order to use this, the custom class' constructor has to be 
registered with a serializer (unparser or _stringifier_) and a materializer (parser or deserializer) 
functions.
*/
function entry(identifier, constructor, serializer, materializer) {
	var r = { 
		identifier: identifier,
		constructor: constructor, 
		serializer: serializer, 
		materializer: materializer 
	};
	Object.freeze(r);
	return r;
}

/** All constructions use a name to identify the type's custom serializer and materializer. Sermat 
must be able to infer this name from the constructor function of the type. By default the name of 
the constructor function is used, but this can be overriden by setting a `__SERMAT__` property
of the function.
*/
var FUNCTION_ID_RE = /^\s*function\s+([\w\$]+)/,
	ID_REGEXP = /^[\$A-Z_a-z][\$\-\.\w]*$/;
function identifier(constructor, must) {
	var id = (constructor.__SERMAT__ && constructor.__SERMAT__.identifier)
		|| constructor.name
		|| (FUNCTION_ID_RE.exec(constructor +'') || [])[1];
	if (!id && must) {
		raise('identifier', "Could not found id for constructor!", { constructorWithoutId: constructor });
	}
	return id;
}

/** A `record` for a construction can be obtained using its identifier or its constructor function. 
If a function is given that is not registered, it will be registered if possible.
*/
function record(constructor) {
	if (typeof constructor === 'string') {
		return this.registry[constructor];
	} else {
		var id = identifier(constructor, true),
		result = this.registry[id];
		return result || this.register(constructor);
	}
}

/** The registry for every custom serializer has three components: an identifier, a serializer 
(unparser or _stringifier_) function and a materializer (parser or deserializer) function. All of 
these can be taken from a member of the constructor function called `__SERMAT__`. Else, both the 
constructor's name is used as identifier and at least the serializer has to be given.

If a materializer function is not specified, it is assumed the serialization is equal to the
arguments with which the constructor has to be called to recreate the instance. So, a default
materializer is created, which calls the constructor with the list of values in the text.
*/
function register(registry, constructor, serializer, materializer) {
	switch (typeof constructor) {
		case 'function': break;
		case 'string': return register(registry, CONSTRUCTIONS[constructor]);
		case 'object': {
			if (Array.isArray(constructor)) {
				return constructor.map(function (c) {
					return register(registry, c);
				});
			} else {
				return register(registry, constructor.constructor, constructor.serializer, constructor.materializer);
			}
		}
		default: raise('register', "Constructor is not a function!", { invalidConstructor: constructor });
	}
	
	var id = identifier(constructor, true);
	if (!ID_REGEXP.exec(id)) {
		raise('register', "Invalid identifier '"+ id +"'!", { invalidId: id });
	}
	if (registry.hasOwnProperty(id)) {
		raise('register', "'"+ id +"' is already registered!", { repeatedId: id });
	}
	var custom = constructor.__SERMAT__;
	if (typeof serializer === 'undefined') {
		serializer = custom && custom.serializer
	}
	if (typeof serializer !== 'function') {
		raise('register', "Serializer for '"+ id +"' is not a function!", { invalidSerializer: serializer });
	}
	if (typeof materializer === 'undefined') {
		materializer = custom && custom.materializer;
		if (typeof materializer !== 'function') {
			materializer = materializeWithConstructor.bind(this, constructor);
		}
	}
	if (typeof materializer !== 'function') {
		raise('register', "Materializer for '"+ id +"' is not a function!", { invalidMaterializer: materializer });
	}
	return registry[id] = entry(id, constructor, serializer, materializer);
}

/** `materializeWithConstructor` is a generic way of creating a new instance of the given 
`constructor`. Basically a new object is built using the constructor's prototype, and then the
constructor is called on this object and the given arguments (`args`) to initialize it.

This method can be used to quickly implement a materializer function when only a call to a 
constructor function is required. It is the default materialization when no method has been given 
for a registered constructor.
*/
function materializeWithConstructor(constructor, obj, args) {
	if (!obj) {
		obj = Object.create(constructor.prototype);
		if (!args) {
			return obj;
		}
	}
	constructor.apply(obj, args);
	return obj;
}

/** ## Serialization ###############################################################################

Serialization is similar to JSON's `stringify` method. The method takes a data structure and 
produces a text representation of it. As a second argument the function takes a set of modifiers of
the functions behaviour. The most important one is perhaps `mode`.
*/

/** There are four modes of operation:

+ `BASIC_MODE`: No object inside the given value is allowed to be serialized more than once.

+ `REPEATED_MODE`: If while serializing any object inside the given value is visited more than once,
	its serialization is repeated every time. Still, circular references are not allowed. This is
	analoguos to `JSON.stringify`'s behaviour.

+ `BINDING_MODE`: Every object inside the given value is given an identifier. If any one of these
	is visited twice or more, a reference to the first serialization is generated using this 
	identifier. Yet, circular references are forbidden. The materialization actually reuses 
	instances.

+ `CIRCULAR_MODE`: Similar to `BINDING_MODE`, except that circular references are allowed. This
	still depends on the constructions materializers supporting circular references.
*/
var BASIC_MODE = 0,
	REPEAT_MODE = 1,
	BINDING_MODE = 2,
	CIRCULAR_MODE = 3;

/** Other modifiers include:

+ `allowUndefined`: If `true` allows undefined values to be serialized as `null`. If `false` (the 
	default) any undefined value inside the given object will raise an error.

+ `useConstructions=true`: If `false` constructions (i.e. custom serializations) are not used, and 
	all objects are treated as literals (the same way JSON does). It is `true` by default.
*/

/** Serialization method can be called as `serialize` or `ser`.
*/
var serialize = (function () {
	function __serializeValue__(ctx, value) {
		switch (typeof value) {
			case 'undefined': {
				if (ctx.allowUndefined) {
					return 'null';
				} else {
					raise('serialize', "Cannot serialize undefined value!");
				}
			}
			case 'boolean':   
			case 'number': return value +'';
			case 'string': return '"'+ value.replace(/[\\\"]/g, '\\$&') +'"';
			case 'function': // Works if `Function` is registered
			case 'object': return __serializeObject__(ctx, value);
		}
	}
	
	/** During object serialization two lists are kept. The `parents` list holds all the ancestors 
	of the current object. This is useful to check for circular references. The `visited` list holds
	all previously serialized objects, and is used to check for repeated references and bindings.
	*/
	function __serializeObject__(ctx, obj) {
		if (!obj) {
			return 'null';
		} else if (ctx.parents.indexOf(obj) >= 0 && ctx.mode !== CIRCULAR_MODE) {
			raise('serialize', "Circular reference detected!", { circularReference: obj });
		}
		var i = ctx.visited.indexOf(obj), output = '', 
			k, len;
		if (i >= 0) {
			if (ctx.mode & BINDING_MODE) {
				return '$'+ i;
			} else if (ctx.mode !== REPEAT_MODE) {
				raise('serialize', "Repeated reference detected!", { repeatedReference: obj });
			}
		} else {
			i = ctx.visited.push(obj) - 1;
			if (ctx.mode & BINDING_MODE) {
				output = '$'+ i +'=';
			}
		}
		ctx.parents.push(obj);
		if (Array.isArray(obj)) { // Arrays.
		/** An array is serialized as a sequence of values separated by commas between brackets, as 
			arrays are written in plain Javascript. 
		*/
			output += '[';
			for (i = 0, len = obj.length; i < len; i++) {
				output += (i ? ',' : '')+ __serializeValue__(ctx, obj[i]);
			}
			output += ']';
		} else if (obj.constructor === Object || !ctx.useConstructions) { // Object literals.
		/** An object literal is serialized as a sequence of key-value pairs separated by commas 
			between braces. Each pair is joined by a colon. This is the same syntax that 
			Javascript's object literals follow.
		*/
			i = 0;
			output += '{';
			for (var key in obj) {
				output += (i++ ? ',' : '')+ 
					(ID_REGEXP.exec(key) ? key : __serializeValue__(ctx, key)) +':'+ 
					__serializeValue__(ctx, obj[key]);
			}
			output += '}';
		} else { 
		/** Constructions is the term used to custom serializations registered by the user for 
			specific types. They are serialized as an identifier, followed by a sequence of values 
			separated by commas between parenthesis. It ressembles a call to a function in 
			Javascript.
		*/
			var record = ctx.Sermat.record(obj.constructor),
				args = record.serializer.call(ctx.Sermat, obj),
				id = record.identifier;
			output += (ID_REGEXP.exec(id) ? id : __serializeValue__(id)) +'(';
			for (i = 0, len = args.length; i < len; i++) {
				output += (i ? ',' : '')+ __serializeValue__(ctx, args[i]);
			}
			output += ')';
		}
		ctx.parents.pop();
		return output;
	}

	return function serialize(obj, modifiers) {
		modifiers = modifiers || {};
		return __serializeValue__({
			Sermat: this,
			visited: [], 
			parents: [],
			// Modifiers
			mode: coalesce(modifiers.mode, this.mode),
			allowUndefined: coalesce(modifiers.allowUndefined, this.allowUndefined),
			useConstructions: coalesce(modifiers.useConstructions, this.useConstructions)
		}, obj);
	};
})();

/** `serializeWithProperties` is a generic way of serializing an object, by creating another object 
with some of its properties. This method can be used to quickly implement a serializer function when 
the constructor of the type can be called with an object.
*/
function serializeWithProperties(obj, properties) {
	var result = {}, 
		name;
	for (var i = 0, len = properties.length; i < len; i++) {
		name = properties[i];
		result[name] = obj[name];
	}
	return [result];
}

/** ## Materialization #############################################################################

The `materialize` method is similar to JSON's `parse` method. It takes text and parses it to produce
the data structure it represents.
*/

/** The `construct` method seeks for a materializer for the given identifier and calls it.
*/
function construct(id, obj, args) {
	var record = this.record(id);
	if (record) {
		return record.materializer.call(this, obj, args);
	} else {
		raise('construct', "Cannot materialize construction for '"+ id +"'", { invalidId: id });
	}
}

var EOL_RE = /\r\n?|\n/g,
/** The lexer is implemented with a big regular expression that combines all the regular 
	expressions of Sermat's lexemes. The function `String.replace` is used with a callback that 
	performs the actual parsing.
*/
	LEXER_RE = new RegExp([
		/\s+/, // whitespace (1)
		/\/\*(?:[\0-)+-.0-\uFFFF]*|\*+[\0-)+-.0-\uFFFF])*\*+\//, // block comment (2)
		/[\$A-Z_a-z][\$\-\.\w]*/, // identifier (3)
		/[+-]Infinity|[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/, // numerals (4)
		/\"(?:[^\\\"]|\\[\0-\uFFFF])*\"/, // string literals (5)
		/[\[\]\{\}\(\):,=]/, // symbols (6)
		/.|$/ // error (7)
	].map(function (re) {
		re = re +'';
		return '('+ re.substr(1, re.length - 2) +')';
	}).join('|'), 'g'),
/** The parse table was calculated using [JS/CC](http://jscc.phorward-software.com/jscc/jscc.html).
	The generated parser is not used because of two reasons. First, the lexer generated by JS/CC
	is always limited to characters from `\x00` and `\xFF`. Second, because the way it is done here 
	results in less code, even after minimization.
*/
	PARSE_TABLE = {
		"0|1":10,"0|13":2,"0|14":4,"0|15":5,"0|16":6,"0|17":7,"0|18":8,"0|19":9,"0|2":11,"0|20":1,"0|3":3,"0|4":13,"0|6":12,"10|11":-10,"10|22":-10,"10|5":-10,"10|7":-10,"10|9":-10,"11|11":-11,"11|22":-11,"11|5":-11,"11|7":-11,"11|9":-11,"12|2":-13,"12|3":-13,"12|7":-13,"13|1":-19,"13|2":-19,"13|3":-19,"13|4":-19,"13|5":-19,"13|6":-19,"14|1":-23,"14|2":-23,"14|3":-23,"14|4":-23,"14|6":-23,"14|9":-23,"15|2":30,"15|3":33,"15|4":32,"15|6":31,"16|10":34,"17|11":-3,"17|22":-3,"17|5":-3,"17|7":-3,"17|9":-3,"18|10":-16,"19|10":-17,"1|22":0,"20|2":19,"20|21":35,"20|3":18,"21|11":-4,"21|22":-4,"21|5":-4,"21|7":-4,"21|9":-4,"22|11":-20,"22|5":-20,"23|11":-5,"23|22":-5,"23|5":-5,"23|7":-5,"23|9":-5,"24|1":10,"24|13":2,"24|14":4,"24|15":5,"24|16":6,"24|17":7,"24|18":8,"24|19":9,"24|2":11,"24|20":36,"24|3":3,"24|4":13,"24|6":12,"25|11":-6,"25|22":-6,"25|5":-6,"25|7":-6,"25|9":-6,"26|11":-24,"26|9":-24,"27|11":-7,"27|22":-7,"27|5":-7,"27|7":-7,"27|9":-7,"28|1":10,"28|13":2,"28|14":4,"28|15":5,"28|16":6,"28|17":7,"28|18":8,"28|19":9,"28|2":11,"28|20":37,"28|3":3,"28|4":13,"28|6":12,"29|11":-8,"29|22":-8,"29|5":-8,"29|7":-8,"29|9":-8,"2|11":-1,"2|22":-1,"2|5":-1,"2|7":-1,"2|9":-1,"30|11":-2,"30|22":-2,"30|5":-2,"30|7":-2,"30|9":-2,"31|2":-12,"31|3":-12,"31|7":-12,"32|1":-18,"32|2":-18,"32|3":-18,"32|4":-18,"32|5":-18,"32|6":-18,"33|8":38,"34|1":10,"34|13":2,"34|14":4,"34|15":5,"34|16":6,"34|17":7,"34|18":8,"34|19":9,"34|2":11,"34|20":39,"34|3":3,"34|4":13,"34|6":12,"35|10":40,"36|11":-21,"36|5":-21,"37|11":-25,"37|9":-25,"38|1":-22,"38|2":-22,"38|3":-22,"38|4":-22,"38|6":-22,"38|9":-22,"39|11":-14,"39|7":-14,"3|11":-9,"3|12":15,"3|22":-9,"3|5":-9,"3|7":-9,"3|8":14,"3|9":-9,"40|1":10,"40|13":2,"40|14":4,"40|15":5,"40|16":6,"40|17":7,"40|18":8,"40|19":9,"40|2":11,"40|20":41,"40|3":3,"40|4":13,"40|6":12,"41|11":-15,"41|7":-15,"4|2":19,"4|21":16,"4|3":18,"4|7":17,"5|11":20,"5|7":21,"6|1":10,"6|13":2,"6|14":4,"6|15":5,"6|16":6,"6|17":7,"6|18":8,"6|19":9,"6|2":11,"6|20":22,"6|3":3,"6|4":13,"6|5":23,"6|6":12,"7|11":24,"7|5":25,"8|1":10,"8|13":2,"8|14":4,"8|15":5,"8|16":6,"8|17":7,"8|18":8,"8|19":9,"8|2":11,"8|20":26,"8|3":3,"8|4":13,"8|6":12,"8|9":27,"9|11":28,"9|9":29
	},
/** Parsing a Sermat string literal uses `eval` after escaping all ends of lines.
*/
	parseString = (function parseString(regexp, replacer, lit) {
		return eval(lit.replace(regexp, replacer));
	}).bind(null, EOL_RE, function (match) {
		return match === '\n' ? '\\n' : match === '\r' ? '\\r' : '\\r\\n';
	});

function materialize(text) {
	/** Sermat's parser is LALR. It handles two stacks: the `stateStack` one for parsing states 
		and the `valueStack` for intermediate values. Bindings are used to resolve all values that
		appear as words (`true`, `null`, etc.).
	*/
	var valueStack = new Array(50), 
		stateStack = new Array(50), 
		stackPointer = 0,
		construct = this.construct.bind(this),
		bindings = { 'true': true, 'false': false, 'null': null, 'NaN': NaN, 'Infinity': Infinity },
		offset, result;
	stateStack[0] = 0;

	/** Unbound identifiers showing in the text always raise an error. Also, values cannot be rebound.
	*/
	function getBind(id) {
		var value = bindings[id];
		if (typeof value === 'undefined') {
			parseError("'"+ id +"' is not bound", { unboundId: id });	
		}
		return value;
	}

	function setBind(id, value) {
		if (id.charAt(0) != '$') {
			parseError("Invalid binding identifier '"+ id +"'", { invalidId: id });
		}
		if (bindings.hasOwnProperty(id)) {
			parseError("'"+ id +"' is already bound", { boundId: id });
		}
		return (bindings[id] = value);
	}
	
	/** The parser does not keep track of ends of lines. These are calculated when an error must
		be raised.
	*/
	function parseError(message, data) {
		data = data || {};
		data.offset = offset;
		var line = 0, lineStart = 0;
		text.substr(0, offset).replace(EOL_RE, function (match, pos) {
			lineStart = pos + match.length;
			line++;
			return '';
		});
		data.line = line + 1;
		data.column = offset - lineStart;
		raise('materialize', message +" at line "+ data.line +" column "+ data.column +" (offset "+ offset +")!", data);
	}

	/** Being an LALR parser, the _semantics_ is expressed in functions that are called when a reduce 
		actions is made. The following matches with the language's grammar.
	*/
	var ACTIONS = (function () { 
		function return$1($1) {
			return $1;
		}
		function cons($1, $2) {
			var obj = construct($1[1], $1[2], $1[3]);
			if ($1[2] && obj !== $1[2]) {
				parseError("Object initialization for "+ $1[1] +" failed", { oldValue: $1[2], newValue: obj });
			}
			return $1[0] ? this.setBind($1[0], obj) : obj;
		}
		return [null, // ACCEPT
		// `value : atom ;`
			[20, 1, return$1],
		// `value : 'id' '=' 'str' ;`
			[20, 3, function ($1,$2,$3) {
				return setBind($1, $3);
			}],
		// `value : obj0 '}' ;`
			[20, 2, return$1],
		// `value : obj1 '}' ;`
			[20, 2, return$1],
		// `value : array0 ']' ;`
			[20, 2, return$1],
		// `value : array1 ']' ;`
			[20, 2, return$1],
		// `value : cons0 ')' ;`
			[20, 2, cons],
		// `value : cons1 ')' ;`
			[20, 2, cons],
		// `atom : 'id' ;`
			[13, 1, function ($1) {
				return getBind($1);
			}],
		// `atom : 'num' ;`
			[13, 1, Number],
		// `atom : 'str' ;`
			[13, 1, parseString],
		// `obj0 : 'id' '=' '{' ;`
			[14, 3, function ($1,$2,$3) {
				return setBind($1, {});
			}],
		// `obj0 : '{' ;`
			[14, 1, function ($1) {
				return {};
			}],
		// `obj1 : obj0 key ':' value ;`
			[15, 4, function ($1,$2,$3,$4) {
				$1[$2] = $4;
				return $1;
			}],
		// `obj1 : obj1 ',' key ':' value ;`
			[15, 5, function ($1,$2,$3,$4,$5) {
				$1[$3] = $5;
				return $1;
			}],
		// `key : 'id' ;`
			[21, 1, return$1],
		// `key : 'str' ;`
			[21, 1, parseString],
		// `array0 : 'id' '=' '[' ;`
			[16, 3, function ($1,$2,$3) {
				return setBind($1, []);
			}],
		// `array0 : '[' ;`
			[16, 1, function ($1) {
				return [];
			}],
		// `array1 : array0 value ;`
			[17, 2, function ($1,$2) { 
				$1.push($2);
				return $1;
			}],
		// `array1 : array1 ',' value ;`
			[17, 3, function ($1,$2,$3) { 
				$1.push($3);
				return $1;
			}],
		// `cons0 : 'id' '=' 'id' '(' ;`
			[18, 4, function ($1,$2,$3,$4) {
				var obj = construct($3, null, null);
				return obj ? [null, $3, setBind($1, obj), []] : [$1, $3, obj, []];
			}],
		// `cons0 : 'id' '(' ;`
			[18, 2, function ($1,$2,$3) {
				return [null, $1, null, []];
			}],
		// `cons1 : cons0 value ;`
			[19, 2, function ($1,$2) {
				return ($1[3].push($2), $1);
			}],
		// `cons1 : cons1 ',' value ;`
			[19, 3, function ($1,$2,$3) {
				return ($1[3].push($3), $1);
			}]
		];
	})();
	
	/** The actual parser is implemented with the `String.replace` method with a regular expression
		and a function callback. The regular expression deals with all language's lexemes. The 
		function callback handles the parser's stacks.
	*/
	text.replace(LEXER_RE, function (match, $wsp, $comm, $id, $num, $str, $sym, $err, _offset) {
		if ($wsp || $comm) {
			return ''; // Ignore whitespace and comments.
		}
		offset = _offset;
		var symbol = $num ? 1 : $str ? 2 : $id ? 3 : $sym ? '[]{}():,='.indexOf($sym) + 4 : $err ? 23 /* ERROR */ : 22 /* EOF */,
			parseAction, action;
		while (true) {
			parseAction = PARSE_TABLE[stateStack[stackPointer] +'|'+ symbol];
			if (parseAction < 0) {
				action = ACTIONS[-parseAction];
				if (action) { // reduce
					stackPointer += 1 - action[1];
					valueStack[stackPointer] = action[2].apply(null, valueStack.slice(stackPointer, stackPointer + action[1]));
					stateStack[stackPointer] = PARSE_TABLE[stateStack[stackPointer - 1] +'|'+ action[0]]; // GOTO action.
					continue;
				}
			} else if (parseAction > 0) { // shift
				stateStack[++stackPointer] = parseAction;
				valueStack[stackPointer] = match;
				return '';
			} else if (parseAction == 0) { // accept.
				result = valueStack[stackPointer];
				return '';
			}
			parseError("Parse error");
		}
	});
	return result;
}

/** ## Constructions for Javascript types ##########################################################

One of Sermat's most important features is extensible handling of custom types. But the library 
provides some implementations for some of Javascript's base types.
*/

/** A value's `type` is a string. It is equal to `typeof value` if this is not `'object'`. In that
	case it can be the empty string (for `null`) or the name of the value's constructor.
*/
function type(value) {
	var t = typeof value;
	return t === 'object' ? (value ? identifier(value.constructor) : '') : t; 
}

/** The `signature` function builds a string with a comma separated list of the types of the `obj`
	and the `args`. It can be used to quickly check a call to a materializer using a regular 
	expression.
*/
function signature(obj, args) {
	return type(obj) +','+ args.map(type).join(',');
}

/** The `checkSignature` function checks the types of a call to a materializer using a regular
	expression to match the result of `signature`. This is a simple and quick way of making the
	materializer functions more secure.
*/
function checkSignature(id, regexp, obj, args) {
	var types = signature(obj, args);
	if (!regexp.exec(types)) {
		raise('checkSignature', "Wrong arguments for construction of "+ id +" ("+ types +")!", 
			{ id: id, obj: obj, args: args });
	}
	return true;
}

/** `Sermat.CONSTRUCTIONS` has default implementations for Javascript's base types.
*/
var CONSTRUCTIONS = {};
[
/** All `Boolean`, `Number`, `String`, `Object` and `Array` instances are serialized with their 
	specific syntax and never as constructions. These are added only for compatibility at 
	materialization.
*/
	[Boolean,
		function serialize_Boolean(value) {
			return [!!value];
		},
		function materialize_Boolean(obj, args) {
			return args && new Boolean(args[0]);
		}
	],
	[Number,
		function serialize_Number(value) {
			return [+value];
		},
		function materialize_Number(obj, args) {
			return args && new Number(args[0]);
		}
	],
	[String,
		function serialize_String(value) {
			return [value +''];
		},
		function materialize_String(obj, args) {
			return args && new String(args[0]);
		}
	],
	[Object,
		function serialize_Object(value) { // Should never be called.
			return [value];
		},
		function materialize_Object(obj, args) {
			return args && args[0];
		}
	],
	[Array,
		function serialize_Array(value) { // Should never be called.
			return value; 
		},
		function materialize_Array(obj, args) {
			obj = obj || [];
			return args ? obj.concat(args) : obj;
		}
	],

/** + `RegExp` instances are serialized with two arguments: a string for the regular expression and 
	a string for its flags.
*/
	[RegExp,
		function serialize_RegExp(value) {
			var comps = /^\/(.+?)\/([a-z]*)$/.exec(value +'');
			if (!comps) {
				raise('serialize_RegExp', "Cannot serialize RegExp "+ value +"!", { value: value });
			}
			return [comps[1], comps[2]];
		},
		function materialize_RegExp(obj, args /* [regexp, flags] */) {
			return args 
				&& checkSignature('RegExp', /^(,string){1,2}$/, obj, args) 
				&& (new RegExp(args[0], args[1] || ''));
		}
	],

/** + `Date` instances are serialized using its seven UTC numerical components (in this order): 
	year, month, day, hours, minutes, seconds and milliseconds.
*/
	[Date,
		function serialize_Date(value) {
			return [value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 
				value.getUTCHours(), value.getUTCMinutes(), value.getUTCSeconds(), value.getUTCMilliseconds()];
		},
		function materialize_Date(obj, args /*[ years, months, days, hours, minutes, seconds, milliseconds ] */) {
			return args 
				&& checkSignature('Date', /^(,number){1,7}$/, obj, args) 
				&& (new Date(Date.UTC(args[0] |0, +args[1] || 1, args[2] |0, args[3] |0, args[4] |0, args[5] |0, args[6] |0)));
		}
	],

/** + `Function` is not registered by default, but it is available. Functions are serialized as 
	required by the `Function` constructor.
*/
	[Function,
		function serialize_Function(value) {
			var comps = /^function\s*[\w$]*\s*\(((\s*[$\w]+\s*,?)*)\)\s*\{([\0-\uFFFF]*)\}$/.exec(value +'');
			if (!comps) {
				raise('serialize_Function', "Could not serialize Function "+ value +"!", { value: value });
			}
			return comps[1].split(/\s*,\s*/).concat([comps[3]]);
		},
		function materialize_Function(obj, args /* [args..., body] */) {
			return args 
				&& checkSignature('Function', /^(,string)+$/, obj, args) 
				&& (Function.apply(null, args));
		}
	]
].forEach(function (rec) {
	var id = identifier(rec[0], true);
	member(CONSTRUCTIONS, id, entry(id, rec[0], rec[1], rec[2]), 1);
});




/** ## Wrap-up #####################################################################################

Here both `Sermat`'s prototype and singleton are set up. 
*/
function Sermat(params) {
	var __registry__ = {},
		__register__ = register.bind(this, __registry__);
	member(this, 'registry', __registry__);
	member(this, 'register', __register__);
	params = params || {};
	this.mode = coalesce(params.mode, BASIC_MODE);
	this.allowUndefined = coalesce(params.allowUndefined, false);
	this.useConstructions = coalesce(params.useConstructions, true);
	/** The constructors for Javascript's _basic types_ (`Boolean`, `Number`, `String`, `Object`, 
		and `Array`, but not `Function`) are always registered. 
	*/
	__register__(['Boolean', 'Number', 'String', 'Object', 'Array']);
}

/** Sermat can be used as a constructor of serializer/materializer components as well as a 
	singleton. Each instance has a separate registry of constructors.
*/
var __SINGLETON__ = new Sermat();

/** The constructions for `Date` and `RegExp` are registered globally. 
*/
__SINGLETON__.register(['Date', 'RegExp']);

(function (members) {
	Object.keys(members).forEach(function (id) {
		var m = members[id];
		member(Sermat.prototype, id, m);
		member(Sermat, id, typeof m === 'function' ? m.bind(__SINGLETON__) : m);
	});
})({
	'BASIC_MODE': BASIC_MODE,
	'REPEAT_MODE': REPEAT_MODE,
	'BINDING_MODE': BINDING_MODE,
	'CIRCULAR_MODE': CIRCULAR_MODE,
	'CONSTRUCTIONS': CONSTRUCTIONS,
	
	'identifier': identifier,
	'record': record,
	
	'serialize': serialize, 'ser': serialize,
	'serializeWithProperties': serializeWithProperties,
	
	'materialize': materialize, 'mat': materialize,
	'construct': construct,
	'type': type,
	'signature': signature, 'checkSignature': checkSignature,
	'materializeWithConstructor': materializeWithConstructor,
	
	'sermat': function sermat(obj, modifiers) {
		return this.mat(this.ser(obj, modifiers));
	}
});
member(Sermat, 'registry', __SINGLETON__.registry);
member(Sermat, 'register', __SINGLETON__.register);

/** Module layout (not frozen in purpose).
*/
member(Sermat, '__package__', 'sermat');
member(Sermat, '__name__', 'Sermat');
Sermat.__init__ = __init__;
Sermat.__dependencies__ = [];

/** See __prologue__.js
*/
	return Sermat;
});
//# sourceMappingURL=sermat-umd.js.map