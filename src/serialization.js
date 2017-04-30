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