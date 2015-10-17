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
			return args && Object.apply(null, args);
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
				value.getUTCHours(), value.getUTCMinutes(), value.getUTCSeconds(), 
				value.getUTCMilliseconds()];
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
registered types. For example, `type(Date)` materializes to the `Date` function.
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