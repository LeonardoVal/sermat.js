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
		throw new TypeError("Sermat.checkSignature: Wrong arguments for construction of "+ id 
			+" ("+ types +")!");
	}
	return true;
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
		function serialize_Boolean(obj) {
			return _assign([obj.valueOf()], obj);
		},
		function materialize_Boolean(obj, args) {
			return args && _assign(new Boolean(args.shift()), args);
		}
	],
	[Number,
		function serialize_Number(obj) {
			return _assign([obj.valueOf()], obj);
		},
		function materialize_Number(obj, args) {
			return args && _assign(new Number(args.shift()), args);
		}
	],
	[String,
		function serialize_String(obj) {
			var r = [''+ obj.valueOf()],
				len = obj.length;
			Object.keys(obj).forEach(function (k) {
				if ((k|0) - k !== 0) {
					r[k] = obj[k];	
				} else if (+k < 0 || +k >= obj.length) {
					throw new TypeError('Sermat.ser: Cannot serialize String instances with'
						+' integer properties (like <'+ k +'>)!');
				}
			});
			return r;
		},
		function materialize_String(obj, args) {
			return args && _assign(new String(args.shift()), args);
		}
	],
	[Object,
		function serialize_Object(value) {
			throw new TypeError("Sermat.ser: Object literals should not be serialized by a construction!"); 
		},
		function materialize_Object(obj, args) {
			return args && Object.apply(null, args);
		}
	],
	[Array,
		function serialize_Array(value) {
			throw new TypeError("Sermat.ser: Arrays should not be serialized by a construction!"); 
		},
		function materialize_Array(obj, args) {
			return args;
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
			return Object.keys(value).length > 0 ? [comps[1], comps[2], _assign({}, value)] 
				: [comps[1], comps[2]];
		},
		function materialize_RegExp(obj, args /* [regexp, flags] */) {
			return args && checkSignature('RegExp', /^(,string){1,2}(,Object)?$/, obj, args)
				&& _assign(new RegExp(args[0], typeof args[1] === 'string' ? args[1] : ''), 
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
				r.push(_assign({}, value));
			}
			return r;
		},
		function materialize_Date(obj, args /*[ years, months, days, hours, minutes, seconds, milliseconds ] */) {
			if (args && checkSignature('Date', /^(,number){1,7}(,Object)?$/, obj, args)) {
				var props = typeof args[args.length-1] === 'object' ? args.pop() : null;
				return _assign(new Date(Date.UTC(args[0] |0, +args[1] || 1, args[2] |0, args[3] |0, 
					args[4] |0, args[5] |0, args[6] |0)), props);
			} else {
				return null;
			}
		}
	],

/** + `Function` is not registered by default, but it is available. Functions are serialized as 
	required by the `Function` constructor.
*/
//FIXME Functions' names are not serialized.
//FIXME Cannot serialize arrow functions.
	[Function,
		function serialize_Function(obj) {
			var comps = /^function\s*[\w$]*\s*\(((?:\s*[$\w]+\s*,?)*)\)\s*\{([\0-\uFFFF]*)\}$/.exec(obj +'');
			if (!comps) {
				throw new TypeError("Could not serialize Function ("+ obj +")!");
			}
			return Object.keys(obj).length > 0 ? [comps[1], comps[2], _assign({}, obj)] 
				: [comps[1], comps[2]];
		},
		function materialize_Function(obj, args) {
			return args && checkSignature('Function', /^(,string){2}(,Object)?$/, obj, args) 
				&& _assign(new Function(args[0], args[1]), args[2]);
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
	[URIError, serialize_Error, materializer_Error(URIError)],
/**TODO Register $new & $extend
*/
].forEach(function (rec) {
	var id = identifier(rec[0], true);
	member(CONSTRUCTIONS, id, Object.freeze({
		identifier: id,
		type: rec[0],
		serializer: rec[1], 
		materializer: rec[2]
	}), 1);
});

//FIXME Serialization does not consider own properties.
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

function $new() {
	var args = arguments,
		cons = args.shift();
	return new (Function.prototype.bind.apply(cons, args))();	
}