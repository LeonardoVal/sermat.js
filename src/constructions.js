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
		if (!args) {
			return null;
		}
		if (!/^(,string){1,2}$/.exec(signature(obj, args))) {
			raise("Cannot materialize RegExp!", { obj: obj, args: args, context: "Sermat.materialize_RegExp" });
		}
		return new RegExp(args[0], args[1] || '');
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
		if (!args) {
			return null;
		}
		if (!/^(,number){1,7}$/.exec(signature(obj, args))) {
			raise("Cannot materialize Date!", { obj: obj, args: args, context: "Sermat.materialize_Date" });
		}
		return new Date(Date.UTC(args[0] |0, +args[1] || 1, args[2] |0, args[3] |0, args[4] |0, args[5] |0, args[6] |0));
	}
);

/** + `Function` is not registered by default, but it is available. Functions are serialized as 
	required by the `Function` constructor.
*/
register(CONSTRUCTIONS, Function,
	function serialize_Function(value) {
		var comps = /^function\s*[\w$]*\s*\(((\s*[$\w]+\s*,?)*)\)\s*\{(.*)\}$/.exec(value +'');
		if (!comps) {
			raise("Could not serialize Function "+ value +"!", { context: "Sermat.serialize_Function", value: value });
		}
		return comps[1].split(/\s*,\s*/).concat([comps[3]]);
	},
	function materialize_Function(obj, args /* [args..., body] */) {
		if (!args) {
			return null;
		}
		if (!/^(,string)+$/.exec(signature(obj, args))) {
			raise("Cannot materialize Function!", { obj: obj, args: args, context: "Sermat.materialize_Function" });
		}
		return Function.apply(null, args);
	}
);
