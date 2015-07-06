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
	var ID_REGEXP = /^[\$A-Z_a-z][\$0-9\-\.A-Z_a-z]*$/;

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
			var record = ctx.record(obj.constructor),
				args = record.serializer(obj),
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
			record: this.record.bind(this),
			modifiers: modifiers 
		}, obj);
	};
})();