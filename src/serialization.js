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
			var record = ctx.sermat.record(obj.constructor, true),
				args = record.serializer.call(ctx.sermat, obj),
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
		modifiers = modifiers || this.modifiers;
		return __serializeValue__({
			sermat: this,
			visited: [], 
			parents: [],
			// Modifiers
			mode: coalesce(modifiers.mode, this.modifiers.mode),
			allowUndefined: coalesce(modifiers.allowUndefined, this.modifiers.allowUndefined),
			useConstructions: coalesce(modifiers.useConstructions, this.modifiers.useConstructions)
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