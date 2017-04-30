module.exports = (/** Library wrapper and layout.
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
			writable: flags & 4, 
			configurable: flags & 2, 
			enumerable: flags & 1
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

These are called _constructions_. In order to use them, the custom class' constructor has to be 
registered with two functions: serializer and materializer. The serializer calculates an array of
values that will allow to rebuild (i.e. materialize) the instance being serialized (i.e. 
_stringified_). The materializer creates a new instance based on the previously serialized values.

All constructions use a name to identify the type's custom serializer and materializer. Sermat must 
be able to infer this name from the constructor function of the type. By default the name of the 
constructor function is used, but this can be overriden by setting a `__SERMAT__` property of the 
function.
*/
var FUNCTION_ID_RE = /^\s*function\s+([\w\$]+)/,
	ID_REGEXP = /^[a-zA-Z_][a-zA-Z0-9_]*(?:[\.-][a-zA-Z0-9_]+)*$/;
function identifier(type, must) {
	var id = (type.__SERMAT__ && type.__SERMAT__.identifier)
		|| type.name
		|| (FUNCTION_ID_RE.exec(type +'') || [])[1];
	if (!id && must) {
		raise('identifier', "Could not found id for type!", { type: type });
	}
	return id;
}

/** A `record` for a construction can be obtained using its identifier or the constructor function
of the type.
*/
function record(type) {
	var id = typeof type === 'function' ? identifier(type, true) : type +'';
	return this.registry[id];
}

/** The registry spec for every custom construction usually has four components: an `identifier`, a 
`type` constructor function, a `serializer` function and a `materializer` function. A `global` flag
can also be provided, and if true causes the construction to be added to the `Sermat.CONSTRUCTIONS` 
global registry.

The identifier can be inferred from the constructor function. If a materializer function is not 
specified, it is assumed the serialization is equal to the arguments with which the constructor has 
to be called to recreate the instance. So, a default materializer is created, which calls the 
constructor with the list of values in the text.
*/
function register(registry, spec) {
	if (typeof spec.type !== 'function') {
		raise('register', "No constructor found for type ("+ spec +")!", { spec: spec });
	}
	spec = {
		type: spec.type,
		identifier: (spec.identifier || identifier(spec.type, true)).trim(),
		serializer: spec.serializer,
		materializer: spec.materializer || materializeWithConstructor.bind(this, spec.type),
		global: !!spec.global,
		include: spec.include
	};
	var id = spec.identifier;
	['true', 'false','null','NaN','Infinity',''].forEach(function (invalidId) {
		if (id === invalidId) {
			raise('register', "Invalid identifier '"+ id +"'!", { spec: spec });
		}
	});
	if (registry.hasOwnProperty(id)) {
		raise('register', "Construction '"+ id +"' is already registered!", { spec: spec });
	}
	if (typeof spec.serializer !== 'function') {
		raise('register', "Serializer for '"+ id +"' is not a function!", { spec: spec });
	}
	if (typeof spec.materializer !== 'function') {
		raise('register', "Materializer for '"+ id +"' is not a function!", { spec: spec });
	}
	Object.freeze(spec);
	registry[id] = spec;
	if (spec.global && !CONSTRUCTIONS[id]) {
		CONSTRUCTIONS[id] = spec;
	}
	if (spec.include) {
		this.include(spec.include);
	}
	return spec;
}

/** A registered construction can be removed with the `remove` method giving its identifier.
*/
function remove(registry, id) {
	if (!registry.hasOwnProperty(id)) {
		raise('remove', "A construction for '"+ id +"' has not been registered!", { identifier: id });
	}
	var r = registry[id];
	delete registry[id];
	return r;
}

/** The `include` method is a more convenient and flexible way of registering custom types. If a 
name (i.e. a string) is provided, the corresponding entry in `Sermat.CONSTRUCTIONS` will be added.
If a constructor function is given and it has a `__SERMAT__` member with the type's definitions, 
then this will be registered. An array with a combination of the previous two types registers all
members. Lastly, an spec record can be used as well. The method tries not to raise errors. 
*/
function include(arg) {
	var spec = null;
	switch (typeof arg) {
		case 'function': {
			spec = this.record(arg);
			if (!spec && arg.__SERMAT__) {
				arg.__SERMAT__.type = arg;
				spec = this.register(arg.__SERMAT__);
			}
			return spec;
		}
		case 'string': {
			spec = this.record(arg);
			if (!spec && CONSTRUCTIONS[arg]) {
				spec = this.register(CONSTRUCTIONS[arg]);
			}
			return spec;
		}
		case 'object': {
			if (Array.isArray(arg)) {
				return arg.map((function (c) {
					return this.include(c);
				}).bind(this));
			} else if (typeof arg.type === 'function') {
				return this.record(arg.identifier || arg.type) || this.register(arg);
			} else if (arg && arg.__SERMAT__ && arg.__SERMAT__.include) {
				return this.include(arg.__SERMAT__.include);
			}
		}
		default: raise('include', "Could not include ("+ arg +")!", { arg: arg });
	}
}

/** The `exclude` method is also a convenient way of removing type registrations. Returns the amount
of registrations actually removed.
*/
function exclude(arg) {
	switch (typeof arg) {
		case 'string': {
			if (this.record(arg)) {
				this.remove(arg);
				return 1;
			}
			return 0;
		}
		case 'function': {
			return this.exclude(identifier(arg));
		}
		case 'object': {
			if (Array.isArray(arg)) {
				var r = 0;
				arg.forEach((function (c) {
					r += this.exclude(c);
				}).bind(this));
				return r;
			}
		}
		default: raise('exclude', "Could not exclude ("+ arg +")!", { arg: arg });
	}
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
	identifier. The materialization actually reuses instances, though circular references are still 
	forbidden.

+ `CIRCULAR_MODE`: Similar to `BINDING_MODE`, except that circular references are allowed. This
	still depends on the constructions' materializers supporting circular references.
*/
var BASIC_MODE = 0,
	REPEAT_MODE = 1,
	BINDING_MODE = 2,
	CIRCULAR_MODE = 3;

function _getProto(obj) {
	return typeof Object.getPrototypeOf === 'function' ? Object.getPrototypeOf(obj) : obj.__proto__;
}
	
/** Serialization method can be called as `serialize` or `ser`.
*/
var serialize = (function () {
	function __serializeValue__(ctx, value, eol) {
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
			case 'string': return __serializeString__(value);
			case 'function': // Continue to object, using Function's serializer if it is registered.
			case 'object': return __serializeObject__(ctx, value, eol);
		}
	}
	
	function __serializeString__(str) {
		return JSON.stringify(str);
	}
	
	/** During object serialization two lists are kept. The `parents` list holds all the ancestors 
	of the current object. This is useful to check for circular references. The `visited` list holds
	all previously serialized objects, and is used to check for repeated references and bindings.
	*/
	function __serializeObject__(ctx, obj, eol) {
		if (!obj) {
			return 'null';
		} else if (ctx.parents.indexOf(obj) >= 0 && ctx.mode !== CIRCULAR_MODE) {
			raise('serialize', "Circular reference detected!", { circularReference: obj });
		}
		var output = '', 
			i, len;
		/** If `ctx.visited` is `null`, means the mode is `REPEAT_MODE` and repeated references do
		not have to be checked. This is only an optimization.
		*/
		if (ctx.visited) {
			i = ctx.visited.indexOf(obj);
			if (i >= 0) {
				if (ctx.mode & BINDING_MODE) {
					return '$'+ i;
				} else {
					raise('serialize', "Repeated reference detected!", { repeatedReference: obj });
				}
			} else {
				i = ctx.visited.push(obj) - 1;
				if (ctx.mode & BINDING_MODE) {
					output = '$'+ i + (ctx.pretty ? ' = ' : '=');
				}
			}
		}
		ctx.parents.push(obj);
		var eol2 = eol && eol +'\t';
		if (Array.isArray(obj)) { // Arrays.
		/** An array is serialized as a sequence of values separated by commas between brackets, as 
			arrays are written in plain Javascript. 
		*/
			output += '['+ eol2;
			for (i = 0, len = obj.length; i < len; i++) {
				output += (i ? ','+ eol2 : '')+ __serializeValue__(ctx, obj[i], eol2);
			}
			output += eol +']';
		} else {
			var objProto = _getProto(obj);
			if (obj.constructor === Object || !ctx.useConstructions || 
				ctx.climbPrototypes && !objProto.hasOwnProperty('constructor')) { // Object literals.
			/** An object literal is serialized as a sequence of key-value pairs separated by commas 
				between braces. Each pair is joined by a colon. This is the same syntax that 
				Javascript's object literals follow.
			*/
				i = 0;
				output += '{'+ eol2;
				Object.keys(obj).forEach(function (key) {
					output += (i++ ? ','+ eol2 : '')+ 
						(ID_REGEXP.exec(key) ? key : __serializeString__(key)) +
						(ctx.pretty ? ' : ' : ':') + 
						__serializeValue__(ctx, obj[key], eol2);
				});
				if (ctx.climbPrototypes && !objProto.hasOwnProperty('constructor')) {
					output += (i++ ? ','+ eol2 : '')+ eol2 +'__proto__:'+ 
						__serializeObject__(ctx, objProto, eol);
				}
				output += eol +'}';
			} else { 
			/** Constructions is the term used to custom serializations registered by the user for 
				specific types. They are serialized as an identifier, followed by a sequence of values 
				separated by commas between parenthesis. It ressembles a call to a function in 
				Javascript.
			*/
				var record = ctx.record(obj.constructor) || ctx.autoInclude && ctx.include(obj.constructor);
				if (!record) {
					raise('serialize', 'Unknown type "'+ ctx.sermat.identifier(obj.constructor) +'"!', { unknownType: obj });
				}
				var args = record.serializer.call(ctx.sermat, obj),
					id = record.identifier;
				output += (ID_REGEXP.exec(id) ? id : __serializeString__(id)) +'('+ eol2;
				for (i = 0, len = args.length; i < len; i++) {
					output += (i ? ','+ eol2 : '') + 
						__serializeValue__(ctx, args[i], eol2);
				}
				output += eol +')';
			}
		}
		ctx.parents.pop();
		return output;
	}

	return function serialize(obj, modifiers) {
		modifiers = modifiers || this.modifiers;
		var mode = coalesce(modifiers.mode, this.modifiers.mode),
			pretty = !!coalesce(modifiers.pretty, this.modifiers.pretty);
		return __serializeValue__({
			visited: mode === REPEAT_MODE ? null : [],
			parents: [],
			sermat: this,
			record: this.record.bind(this),
			include: this.include.bind(this),
/** Besides the `mode`, other modifiers of the serialization include:

+ `allowUndefined`: If `true` allows undefined values to be serialized as `null`. If `false` (the 
	default) any undefined value inside the given object will raise an error.

+ `autoInclude`: If `true` forces the registration of types found during the serialization, but not
	in the construction registry.
	
+ `useConstructions=true`: If `false` constructions (i.e. custom serializations) are not used, and 
	all objects are treated as literals (the same way JSON does). It is `true` by default.
	
+ `climbPrototypes=true`: If `true`, every time an object's constructor is not an own property of 
	its prototype, its prototype will be serialized as the `__proto__` property.
	
+ `pretty=false`: If `true` the serialization is formatted with whitespace to make it more readable. 
*/
			mode: mode,
			allowUndefined: coalesce(modifiers.allowUndefined, this.modifiers.allowUndefined),
			autoInclude: coalesce(modifiers.autoInclude, this.modifiers.autoInclude),
			useConstructions: coalesce(modifiers.useConstructions, this.modifiers.useConstructions),
			climbPrototypes: coalesce(modifiers.climbPrototypes, this.modifiers.climbPrototypes),
			pretty: pretty
		}, obj, pretty ? '\n' : '');
	};
})();

/** The function `serializeAsType` allows to add a reference to a constructor to the serialization.
*/
function serializeAsType(constructor) {
	return new type(constructor);
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

function _setProto(obj, proto) {
	if (typeof Object.setPrototypeOf === 'function') {
		return Object.setPrototypeOf(obj, proto);
	} else {
		obj.__proto__ = proto;
		return obj;
	}
}

var RE_IGNORABLES = /(?:\s|\/\*(?:[\0-\)+-.0-\uFFFF]*|\*+[\0-\)+-.0-\uFFFF])*\*+\/)*/,
	RE_NUM = /[+-]?(?:Infinity|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/,
	RE_STR = /\"(?:[^\\\"]|\\[^\n])*\"|``/,
	RE_ID = /[a-zA-Z_](?:[.-]?[a-zA-Z0-9_]+)*/,
	RE_BIND = /\$[a-zA-Z0-9_]+(?:[.-]?[a-zA-Z0-9_]+)*/,
	RE_SYMBOLS = /[\,[\]{:}(=)]/,
	RE_EOL = /\r\n?|\n/g,
	LEXER = new RegExp('^'+ RE_IGNORABLES.source +'(?:'+
		'('+ RE_NUM.source 
		+')|('+ RE_STR.source
		+')|('+ RE_ID.source
		+')|('+ RE_BIND.source
		+')|('+ RE_SYMBOLS.source 
		+')|$)'),
	TOKENS = 'nsib';

function materialize(source) {
	var input = source +'', offset = 0,
		bindings = {},
		construct = this.construct.bind(this),
		token, text;

	function nextToken() {
		var tokens = LEXER.exec(input),
			result, len, i;
		text = '';
		if (!tokens) {
			error('Invalid character "'+ input.charAt(0) +'"');
		} else {
			len = tokens[0].length;
			input = input.substr(len);
			offset += len;
			for (i = 1, len = TOKENS.length; i <= len; i++) {
				if (tokens[i]) {
					token = TOKENS.charAt(i-1);
					text = tokens[i];
					break;
				}
			}
			if (!text) {
				token = tokens[i] || '$';
			}
			return token;
		}
	}
	
	function error(msg) {
		msg = msg || "Parse error";
		offset -= text.length;
		var line = 0, lineStart = 0;
		source.substr(0, offset).replace(RE_EOL, function (match, pos) {
			lineStart = pos + match.length;
			line++;
			return '';
		});
		throw new SyntaxError(msg +" at line "+ (line + 1) +" column "+ (offset - lineStart + 1) 
			+" (offset "+ (offset + 1) +")!");
	}

	function shift(expected) {
		if (token !== expected) {
			error();
		}
		nextToken();
	}

	function parseValue() {
		var t = text;
		switch (token) {
			case 'n': case 's':
				nextToken();
				return eval(t);
			case '[':
				nextToken();
				return parseArray([]);
			case '{':
				nextToken();
				return parseObject({});
			case 'b':
				return parseBind();
			case 'i':
				nextToken();
				if ('true false null NaN Infinity'.indexOf(t) >= 0) {
					return eval(t);
				} else {
					shift('(');
					return parseConstruction(t, null);
				}
			default:
				error();
		}
	}

	function parseArray(array) {
		if (token !== ']') {
			array.push(parseValue());
			while (token === ',') {
				nextToken();
				array.push(parseValue());
			}
			shift(']');
		} else {
			nextToken();
		}
		return array;
	}

	function parseObject(obj) {
		if (token !== '}') {
			parseMember(obj);
			while (token === ',') {
				nextToken();
				parseMember(obj);
			}
			shift('}');
		} else {
			nextToken();
		}
		return obj;
	}

	function parseKey() {
		var t = text;
		switch (token) {
			case 'i': 
				nextToken();
				return t;
			case 's':
				nextToken();
				return eval(t);
			default: 
				error();
		}
	}

	function parseMember(obj) {
		var k = parseKey();
		shift(':');
		if (k === '__proto__') {
			_setProto(obj, parseValue());
		} else {
			obj[k] = parseValue();
		}
		return obj;
	}

	function parseBind() {
		var id = text;
		nextToken();
		if (token === '=') {
			nextToken();
			switch (token) {
				case '[':
					nextToken();
					return parseArray(bindings[id] = []);
				case '{':
					nextToken();
					return parseObject(bindings[id] = {});
				case 'i':
					var cons = text;
					nextToken();
					shift('(');
					return parseConstruction(cons, bindings[id] = construct(cons, null, null));
				default:
					return bindings[id] = parseValue();
			}
		} else {
			return bindings[id];
		}
	}

	function parseConstruction(cons, obj) {
		var args = [];
		if (token !== ')') {
			args.push(parseValue());
			while (token === ',') {
				nextToken();
				args.push(parseValue());
			}
			shift(')');
		} else {
			nextToken();
		}
		return construct(cons, obj, args);
	}
	
	// parseStart
	nextToken();
	var result = parseValue();
	shift('$');
	return result;
} // materialize

/** ## Utilities ###################################################################################

*/

/** `serializeAsProperties` is a generic way of serializing an object, by creating another object 
with some of its properties. This method can be used to quickly implement a serializer function when 
the constructor of the type can be called with an object.
*/
function serializeAsProperties(obj, properties, ownProperties) {
	var result = {}, 
		fromArray = Array.isArray(properties),
		name;
	for (var i in properties) {
		name = properties[i];
		if (!ownProperties || obj.hasOwnProperty(name)) {
			result[fromArray ? name : i] = obj[name];
		}
	}
	return [result];
}

/** `materializeWithConstructor` is a generic way of creating a new instance of the given type
`constructor`. Basically a new object is built using the type's prototype, and then the constructor 
is called on this object and the given arguments (`args`) to initialize it.

This method can be used to quickly implement a materializer function when only a call to a 
constructor function is required. It is the default materialization when no method has been given 
for a registered type.
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

/** `sermat` is a shortcut to materialize a serialization of a value, e.g. to clone the value. 
*/
function sermat(obj, modifiers) {
	return this.mat(this.ser(obj, modifiers));
}

/** ## Constructions for Javascript types ##########################################################

One of Sermat's most important features is extensible handling of custom types. But the library 
provides some implementations for some of Javascript's base types.
*/

/** The `signature` function builds a string representing the types of the arguments (separated by
comma). For each value it is equal to `typeof value` if is not `'object'`, the empty string (for 
`null`) or the name of the value's constructor.

It can be used to quickly check a call to a materializer using a regular expression.
*/
function signature() {
	var r = "", t, v;
	for (var i = 0; i < arguments.length; i++) {
		v = arguments[i];
		t = typeof v;
		if (i) {
			r += ',';
		}
		r += t === 'object' ? (v ? identifier(v.constructor) : '') : t;
	}
	return r;
}

/** The `checkSignature` function checks the types of a call to a materializer using a regular
	expression to match the result of `signature`. This is a simple and quick way of making the
	materializer functions more secure.
*/
function checkSignature(id, regexp, obj, args) {
	var types = signature.apply(this, [obj].concat(args));
	if (!regexp.exec(types)) {
		raise('checkSignature', "Wrong arguments for construction of "+ id +" ("+ types +")!", 
			{ id: id, obj: obj, args: args });
	}
	return true;
}

var assign = Object.assign; //TODO Polyfill.

function ownProps(obj) {
	var r = {};
	Object.keys(obj).forEach(function (k) {
		r[k] = obj[k];
	});
	return r;
}

/** `Sermat.CONSTRUCTIONS` contains the definitions of constructions registered globally. At first 
it includes some implementations for Javascript's base types.
*/
var CONSTRUCTIONS = {};
[
/** All `Boolean`, `Number`, `String`, `Object` and `Array` instances are serialized with their 
	specific syntax and never as constructions. These are added only for compatibility at 
	materialization.
*/
	[Boolean,
		function serialize_Boolean(value) {
			return Object.keys(value).length > 0 ? [!!value, ownProps(value)] : [!!value];
		},
		function materialize_Boolean(obj, args) {
			return args && assign(new Boolean(args[0]), args[1]);
		}
	],
	[Number,
		function serialize_Number(value) {
			return Object.keys(value).length > 0 ? [+value, ownProps(value)] : [+value];
		},
		function materialize_Number(obj, args) {
			return args && assign(new Number(args[0]), args[1]);
		}
	],
	[String,
		function serialize_String(value) {
			return Object.keys(value).length > 0 ? [value +'', ownProps(value)] : [value +'']; //TODO props!
		},
		function materialize_String(obj, args) {
			return args && assign(new String(args[0]), args[1]);
		}
	],
	[Object,
		function serialize_Object(value) { // Should never be called.
			return [value];
		},
		function materialize_Object(obj, args) {
			return args && Object.apply(null, args);
		}
	],
	[Array,
		function serialize_Array(value) { // Should never be called.
			return Object.keys(value).length > 0 ? [value, ownProps(value)] : [value]; 
		},
		function materialize_Array(obj, args) {
			return args && assign(new Array(args[0]), args[1]);
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
			return Object.keys(value).length > 0 ? [comps[1], comps[2], ownProps(value)] 
				: [comps[1], comps[2]];
		},
		function materialize_RegExp(obj, args /* [regexp, flags] */) {
			return args && checkSignature('RegExp', /^(,string){1,2}(,Object)?$/, obj, args)
				&& assign(new RegExp(args[0], typeof args[1] === 'string' ? args[1] : ''), 
					typeof args[1] === 'object' ? args[1] : args[2]);
		}
	],

/** + `Date` instances are serialized using its seven UTC numerical components (in this order): 
	year, month, day, hours, minutes, seconds and milliseconds.
*/
	[Date,
		function serialize_Date(value) {
			var r = [value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 
				value.getUTCHours(), value.getUTCMinutes(), value.getUTCSeconds(), 
				value.getUTCMilliseconds()];
			if (Object.keys(value).length > 0) {
				r.push(ownProps(value));
			}
			return r;
		},
		function materialize_Date(obj, args /*[ years, months, days, hours, minutes, seconds, milliseconds ] */) {
			if (args && checkSignature('Date', /^(,number){1,7}(,Object)?$/, obj, args)) {
				var props = typeof args[args.length-1] === 'object' ? args.pop() : null;
				return assign(new Date(Date.UTC(args[0] |0, +args[1] || 1, args[2] |0, args[3] |0, 
					args[4] |0, args[5] |0, args[6] |0)), props);
			} else {
				return null;
			}
		}
	],

/** + `Function` is not registered by default, but it is available. Functions are serialized as 
	required by the `Function` constructor.
*/
	[Function,
		function serialize_Function(value) {
			//FIXME Cannot serialize arrow functions.
			var comps = /^function\s*[\w$]*\s*\(((:?\s*[$\w]+\s*,?)*)\)\s*\{([\0-\uFFFF]*)\}$/.exec(value +'');
			if (!comps) {
				raise('serialize_Function', "Could not serialize Function "+ value +"!", { value: value });
			}
			return Object.keys(value).length > 0 ? [comps[1], comps[2], ownProps(value)] 
				: [comps[1], comps[2]];
		},
		function materialize_Function(obj, args) {
			return args && checkSignature('Function', /^(,string){2}(,Object)?$/, obj, args) 
				&& assign(new Function(args[0], args[1]), args[2]);
		}
	],
	
/** + Error clases (`Error`, `EvalError`, `RangeError`, `ReferenceError`, `SyntaxError`, `TypeError` 
	and `URIError`) are not registered by default, but are available. Error instances are serialized 
	with their `name`, `message` and `stack`. The `stack` trace is overriden, since it is 
	initialized by the engine when the instance is created. Other properties are not considered, and 
	may become inconsistent (e.g. Firefox's `fileName` and `lineNumber`).
*/
	[Error, serialize_Error, materializer_Error(Error)],
	[EvalError, serialize_Error, materializer_Error(EvalError)],
	[RangeError, serialize_Error, materializer_Error(RangeError)],
	[ReferenceError, serialize_Error, materializer_Error(ReferenceError)],
	[SyntaxError, serialize_Error, materializer_Error(SyntaxError)],
	[TypeError, serialize_Error, materializer_Error(TypeError)],
	[URIError, serialize_Error, materializer_Error(URIError)]
].forEach(function (rec) {
	var id = identifier(rec[0], true);
	member(CONSTRUCTIONS, id, Object.freeze({
		identifier: id,
		type: rec[0],
		serializer: rec[1], 
		materializer: rec[2]
	}), 1);
});

function serialize_Error(obj) {
	return [obj.message, obj.name || '', obj.stack || ''];
}

function materializer_Error(type) {
	return function materialize_Error(obj, args) {
		var r = null;
		if (args) {
			r = new type(args[0] +'');
			r.name = args[1] +'';
			r.stack = args[2] +'';
		}
		return r;
	};
}

/** The pseudoconstruction `type` is used to serialize references to constructor functions of 
registered types. For example, `type("Date")` materializes to the `Date` function.
*/
function type(f) {
	this.typeConstructor = f;
}

member(CONSTRUCTIONS, 'type', type.__SERMAT__ = Object.freeze({
	identifier: 'type',
	type: type,
	serializer: function serialize_type(value) {
		var rec = this.record(value.typeConstructor);
		if (!rec) {
			raise('serialize_type', "Unknown type \""+ identifier(value.typeConstructor) +"\"!", { type: value.typeConstructor });
		} else {
			return [rec.identifier];
		}
	},
	materializer: function materialize_type(obj, args) {
		if (!args) {
			return null;
		} else if (checkSignature('type', /^,string$/, obj, args)) {
			var rec = this.record(args[0]);
			if (rec) {
				return rec.type;
			}
		}
		raise('materialize_type', "Cannot materialize construction for type("+ args +")!", { args: args });
	}
}), 1);

/** ## Wrap-up #####################################################################################

Here both `Sermat`'s prototype and singleton are set up. 
*/
function Sermat(params) {
	var __registry__ = {},
		__modifiers__ = {};
	member(this, 'registry', __registry__);
	member(this, 'register', register.bind(this, __registry__));
	member(this, 'remove', remove.bind(this, __registry__));
	
	params = params || {};
	member(this, 'modifiers', __modifiers__);
	member(__modifiers__, 'mode', coalesce(params.mode, BASIC_MODE), 5);
	member(__modifiers__, 'allowUndefined', coalesce(params.allowUndefined, false), 5);
	member(__modifiers__, 'autoInclude', coalesce(params.autoInclude, true), 5);
	member(__modifiers__, 'useConstructions', coalesce(params.useConstructions, true), 5);
	member(__modifiers__, 'climbPrototypes', coalesce(params.climbPrototypes, true), 5);
	/** The constructors for Javascript's _basic types_ (`Boolean`, `Number`, `String`, `Object`, 
		and `Array`, but not `Function`) are always registered. Also `Date` and `RegExp` are
		supported by default.
	*/
	this.include('Boolean Number String Object Array Date RegExp type'.split(' '));
}

var __members__ = {
	BASIC_MODE: BASIC_MODE,
	REPEAT_MODE: REPEAT_MODE,
	BINDING_MODE: BINDING_MODE,
	CIRCULAR_MODE: CIRCULAR_MODE,
	CONSTRUCTIONS: CONSTRUCTIONS,
	
	identifier: identifier,
	record: record,
	include: include,
	exclude: exclude,
	
	serialize: serialize, ser: serialize,
	serializeAsProperties: serializeAsProperties,
	serializeAsType: serializeAsType,
	signature: signature, checkSignature: checkSignature,
	
	materialize: materialize, mat: materialize,
	construct: construct,
	materializeWithConstructor: materializeWithConstructor,
	
	sermat: sermat
};
Object.keys(__members__).forEach(function (id) {
	var m = __members__[id];
	member(Sermat.prototype, id, m);
});

/** Sermat can be used as a constructor of serializer/materializer components as well as a 
	singleton. Each instance has a separate registry of constructors.
*/
var __SINGLETON__ = new Sermat();

/** The constructions for `Date` and `RegExp` are registered globally. 
*/
__SINGLETON__.include(['Date', 'RegExp']);

Object.keys(__members__).forEach(function (id) {
	var m = __members__[id];
	member(Sermat, id, typeof m === 'function' ? m.bind(__SINGLETON__) : m);
});

['registry', 'register', 'remove', 'modifiers'].forEach(function (id) {
	member(Sermat, id, __SINGLETON__[id]);
});

/** Module layout.
*/
member(Sermat, '__package__', 'sermat');
member(Sermat, '__name__', 'Sermat');
member(Sermat, '__init__', __init__, 4);
member(Sermat, '__dependencies__', [], 4);

/** See __prologue__.js
*/
	return Sermat;
})();
//# sourceMappingURL=sermat-node.js.map