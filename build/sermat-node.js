/** Package wrapper and layout for NodeJS.
*/
module.exports = (function __init__() {
/** See `__epilogue-node__.js`.
*/

/** Some utility functions used in the library.
*/

function raise(message, properties) {
	if (properties.context) {
		message = properties.context +': '+ message;
	}
	var error = new Error(message);
	for (var id in properties) {
		error[id] = properties[id];
	}
	throw error;
}

function member(obj, id, value) {
	Object.defineProperty(obj, id, {
		value: value,
		writable: false, 
		configurable: false, 
		enumerable: false
	});
}

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
function Sermat() {
	var __registry__ = {};
	member(this, 'record', record.bind(this, __registry__));
	member(this, 'register', register.bind(this, __registry__));
}

/** Sermat can be used as a constructor of serializer/materializer components as well as a 
	singleton. Each instance has a separate registry of constructors.
*/
var __SINGLETON__ = new Sermat();

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
		raise("Could not found id for constructor!", { constructorWithoutId: constructor, context: "SERMAT.identifier" });
	}
	return id;
}

/** A `record` for a construction can be obtain using its identifier or its constructor function. If
	a function is given that is not registered, it will be registered if possible.
*/
function record(__registry__, constructor) {
	if (typeof constructor === 'string') {
		return __registry__[constructor];
	} else {
		var id = identifier(constructor, true),
		result = __registry__[id];
		return result || register(__registry__, constructor);
	}
}

/** The registry for every custom serializer has three components: an identifier, a serializer 
	(unparser or _stringifier_) function and a materializer (parser or deserializer) function. All
	of these can be taken from a member of the constructor function called `__SERMAT__`. Else, both 
	the constructor's name is used as identifier and at least the serializer has to be given.
	
	If a materializer function is not specified, it is assumed the serialization is equal to the
	arguments with which the constructor has to be called to recreate the instance. So, a default
	materializer is created, which calls the constructor with the list of values in the text.
*/
function register(__registry__, constructor, serializer, materializer) {
	var id = identifier(constructor, true);
	if (!ID_REGEXP.exec(id)) {
		raise("Invalid identifier '"+ id +"'!", { invalidId: id, context: 'Sermat.register' });
	}
	if (__registry__.hasOwnProperty(id)) {
		raise("'"+ id +"' is already registered!", { repeatedId: id, context: 'Sermat.register' });
	}
	var custom = constructor.__SERMAT__;
	if (typeof serializer === 'undefined') {
		serializer = custom && custom.serializer
	}
	if (typeof serializer !== 'function') {
		raise("Serializer for '"+ id +"' is not a function!", { invalidSerializer: serializer, context: 'Sermat.register' });
	}
	if (typeof materializer === 'undefined') {
		materializer = custom && custom.materializer;
		if (typeof materializer !== 'function') {
			materializer = materializeWithConstructor.bind(this, constructor);
		}
	}
	if (typeof materializer !== 'function') {
		raise("Materializer for '"+ id +"' is not a function!", { invalidMaterializer: materializer, context: 'Sermat.register' });
	}
	var record = __registry__[id] = { 
		constructor: constructor, 
		identifier: id, 
		serializer: serializer, 
		materializer: materializer 
	};
	Object.freeze(record);
	return record;
}

/** `materializeWithConstructor` is a generic way of creating a new instance of the given 
`constructor`. Basically a new object is built using the constructor's prototype, and then the
constructor is called on this object and the given arguments (`args`) to initialize it.

This method can be used to quickly implement a materializer function when only a call to a 
constructor function is required. It is the default materialization when no method has been 
given for a registered constructor.
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
the functions behaviour. These include:
*/

/** + `ALLOW_UNDEFINED`: If `true` allows undefined values to be serialized as `null`. If `false` (the
	default) any undefined value inside the given object will raise an error.
*/
var ALLOW_UNDEFINED = 1 << 0,

/** + `ALLOW_REPEATED`: The serialization constraints any object to appear more than once in the
	resulting text. If this modifier is `true`, object may be serialized repeatedly instead.
*/
	ALLOW_REPEATED = 1 << 1,

/** + `ALLOW_BINDINGS`: If `true`, this modifier causes every object to be assigned an identifier 
	(starting with `$`), and any repeated appearance results in this binding being used. It is 
	`false` by default.
*/
	ALLOW_BINDINGS = 1 << 2,
	
/** + `ALLOW_CIRCULAR`: If `true`, this modifier causes circular references to be serialized. Since
	this uses bindings, `ALLOW_BINDINGS` is implied.
*/
	ALLOW_CIRCULAR = 1 << 3,

/** + `FORBID_CONSTRUCTIONS`: If `true` constructions (i.e. custom serializations) are not used, and all 
	objects are treated as literals (the same way JSON does). It is `false` by default.
*/
	FORBID_CONSTRUCTIONS = 1 << 4;

/** Serialization method can be calles as `serialize` or `ser`.
*/
var serialize = (function () {
	function __serializeValue__(ctx, value) {
		switch (typeof value) {
			case 'undefined': {
				if (ctx.modifiers & ALLOW_UNDEFINED) {
					return 'null';
				} else {
					raise("Cannot serialize undefined value!", { context: "Sermat.serialize" });
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
		} else if (ctx.parents.indexOf(obj) >= 0 && !(ctx.modifiers & ALLOW_CIRCULAR)) {
			raise("Circular reference detected!", { circularReference: obj, context: "Sermat.serialize" });
		}
		var i = ctx.visited.indexOf(obj), output = '', 
			k, len;
		if (i >= 0) {
			if (ctx.modifiers & ALLOW_BINDINGS) {
				return '$'+ i;
			} else if (!(ctx.modifiers & ALLOW_REPEATED)) {
				raise("Repeated reference detected!", { repeatedReference: obj, context: "Sermat.serialize" });
			}
		} else {
			i = ctx.visited.push(obj) - 1;
			if (ctx.modifiers & ALLOW_BINDINGS) {
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
		} else if (obj.constructor === Object || ctx.modifiers & FORBID_CONSTRUCTIONS) { // Object literals.
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
		modifiers = modifiers |0;
		if (modifiers & ALLOW_CIRCULAR) {
			modifiers |= ALLOW_BINDINGS;
		}
		return __serializeValue__({
			visited: [], 
			parents: [],
			modifiers: modifiers,
			Sermat: this
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
		raise("Cannot materialize construction for '"+ id +"'", { invalidId: id, context: "Sermat.construct" });
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
		data.context = "Sermat.materialize";
		var line = 0, lineStart = 0;
		text.substr(0, offset).replace(EOL_RE, function (match, pos) {
			lineStart = pos + match.length;
			line++;
			return '';
		});
		data.line = line + 1;
		data.column = offset - lineStart;
		raise(message +" at line "+ data.line +" column "+ data.column +" (offset "+ offset +")!", data);
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
		raise("Wrong arguments for construction of "+ id +" ("+ types +")!", 
			{ id: id, obj: obj, args: args, context: "Sermat.materialize" }
		);
	}
	return true;
}

/** `Sermat.CONSTRUCTIONS` holds the default implementations for some of Javascript's base types. 
*/
var CONSTRUCTIONS = {}
/** + All `Boolean`, `Number`, `String`, `Object` and `Array` instances are serialized with their 
	specific syntax and never as constructions. These are added only for compatibility at 
	materialization.
*/
register(CONSTRUCTIONS, Boolean,
	function serialize_Boolean(value) {
		return [!!value];
	},
	function materialize_Boolean(obj, args) { //
		return args && new Boolean(args[0]);
	}
);
	
register(CONSTRUCTIONS, Number,
	function serialize_Number(value) {
		return [+value];
	},
	function materialize_Number(obj, args) {
		return args && new Number(args[0]);
	}
);

register(CONSTRUCTIONS, String,
	function serialize_String(value) {
		return [value +''];
	},
	function materialize_String(obj, args) {
		return args && new String(args[0]);
	}
);

register(CONSTRUCTIONS, Object,
	function serialize_Object(value) { // Should never be called.
		return [value];
	},
	function materialize_Object(obj, args) {
		return args && args[0];
	}
);

register(CONSTRUCTIONS, Array,
	function serialize_Array(value) { // Should never be called.
		return value; 
	},
	function materialize_Array(obj, args) {
		obj = obj || [];
		return args ? obj.concat(args) : obj;
	}
);

/** + `RegExp` instances are serialized with two arguments: a string for the regular expression and 
	a string for its flags.
*/
register(CONSTRUCTIONS, RegExp,
	function serialize_RegExp(value) {
		var comps = /^\/(.+?)\/([a-z]*)$/.exec(value +'');
		if (!comps) {
			raise("Cannot serialize RegExp "+ value +"!", { value: value, context: "Sermat.serialize_RegExp" });
		}
		return [comps[1], comps[2]];
	},
	function materialize_RegExp(obj, args /* [regexp, flags] */) {
		return args 
			&& checkSignature('RegExp', /^(,string){1,2}$/, obj, args) 
			&& (new RegExp(args[0], args[1] || ''));
	}
);

/** + `Date` instances are serialized using its seven UTC numerical components (in this order): 
	year, month, day, hours, minutes, seconds and milliseconds.
*/
register(CONSTRUCTIONS, Date,
	function serialize_Date(value) {
		return [value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 
			value.getUTCHours(), value.getUTCMinutes(), value.getUTCSeconds(), value.getUTCMilliseconds()];
	},
	function materialize_Date(obj, args /*[ years, months, days, hours, minutes, seconds, milliseconds ] */) {
		return args 
			&& checkSignature('Date', /^(,number){1,7}$/, obj, args) 
			&& (new Date(Date.UTC(args[0] |0, +args[1] || 1, args[2] |0, args[3] |0, args[4] |0, args[5] |0, args[6] |0)));
	}
);

/** + `Function` is not registered by default, but it is available. Functions are serialized as 
	required by the `Function` constructor.
*/
register(CONSTRUCTIONS, Function,
	function serialize_Function(value) {
		var comps = /^function\s*[\w$]*\s*\(((\s*[$\w]+\s*,?)*)\)\s*\{([\0-\uFFFF]*)\}$/.exec(value +'');
		if (!comps) {
			raise("Could not serialize Function "+ value +"!", { context: "Sermat.serialize_Function", value: value });
		}
		return comps[1].split(/\s*,\s*/).concat([comps[3]]);
	},
	function materialize_Function(obj, args /* [args..., body] */) {
		return args 
			&& checkSignature('Function', /^(,string)+$/, obj, args) 
			&& (Function.apply(null, args));
	}
);


/** ## Wrap-up #####################################################################################

Here both `Sermat`'s prototype and singleton are set up. 
*/
function sermat(obj, modifiers) {
	return this.mat(this.ser(obj, modifiers));
}

(function (members) {
	Object.keys(members).forEach(function (id) {
		var m = members[id];
		member(Sermat.prototype, id, m);
		member(Sermat, id, typeof m === 'function' ? m.bind(__SINGLETON__) : m);
	});
})({
	'ALLOW_UNDEFINED': ALLOW_UNDEFINED,
	'ALLOW_REPEATED': ALLOW_REPEATED,
	'ALLOW_BINDINGS': ALLOW_BINDINGS,
	'ALLOW_CIRCULAR': ALLOW_CIRCULAR,
	'FORBID_CONSTRUCTIONS': FORBID_CONSTRUCTIONS,
	'CONSTRUCTIONS': CONSTRUCTIONS,
	
	'identifier': identifier,
	'construct': construct,
	'materializeWithConstructor': materializeWithConstructor,
	'serializeWithProperties': serializeWithProperties,
	'type': type,
	'signature': signature,
	'checkSignature': checkSignature,
	
	'serialize': serialize,
	'ser': serialize,
	'materialize': materialize,
	'mat': materialize,
	'sermat': sermat
});
member(Sermat, 'register', __SINGLETON__['register']);
member(Sermat, 'record', __SINGLETON__['record']);

/** The constructors that are registered globally `Sermat` are: `Boolean`, `Number`, `String`, 
`Object`, `Array`, `Date` and `RegExp`. 
*/
[Boolean, Number, String, Object, Array, Date, RegExp
].forEach(function (type) {
	var rec = record(CONSTRUCTIONS, type);
	Sermat.register(type, rec.serializer, rec.materializer);
});

/** Module layout (not frozen in purpose).
*/
Sermat.__name__ = 'Sermat';
Sermat.__init__ = __init__;
Sermat.__dependencies__ = [];

/** See __prologue-node__.js
*/
	return Sermat;
})();

//# sourceMappingURL=sermat-node.js.map