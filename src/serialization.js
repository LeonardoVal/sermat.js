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

/** Serialization method can be called as `serialize` or `ser`. Besides the `mode`, other modifiers
of the serialization include:

+ `onUndefined=TypeError`: If it is a constructor for a subtype of `Error`, it is used to throw an
	exception when an undefined is found. If it is other type function, it is used as a callback.
	Else the value of this modifier is serialized as in place of the undefined value, and if it is
	undefined itself the `undefined` string is used.

+ `autoInclude`: If `true` forces the registration of types found during the serialization, but not
	in the construction registry.

+ `useConstructions=true`: If `false` constructions (i.e. custom serializations) are not used, and
	all objects are treated as literals (the same way JSON does). It is `true` by default.

+ `climbPrototypes=true`: If `true`, every time an object's constructor is not an own property of
	its prototype, its prototype will be serialized as the `__proto__` property.

+ `pretty=false`: If `true` the serialization is formatted with whitespace to make it more readable.
*/
//TODO Allow modifiers.bindings.
function serialize(obj, modifiers) {
	var sermat = this,
		mode = _modifier(modifiers, 'mode', this.modifiers.mode),
		pretty = _modifier(modifiers, 'pretty', this.modifiers.pretty),
		onUndefined = _modifier(modifiers, 'onUndefined', this.modifiers.onUndefined),
		autoInclude = _modifier(modifiers, 'autoInclude', this.modifiers.autoInclude),
		useConstructions = _modifier(modifiers, 'useConstructions', this.modifiers.useConstructions),
		climbPrototypes = _modifier(modifiers, 'climbPrototypes', this.modifiers.climbPrototypes),
		visited = mode === REPEAT_MODE ? null : [],
		parents = [],
		_colon = pretty ? ' : ' : ':',
		_equal = pretty ? ' = ' : '=';

	function serializeValue(value, eol) {
		switch (typeof value) {
			case 'undefined': return serializeUndefined();
			case 'boolean':
			case 'number': return value +'';
			case 'string': return serializeString(value);
			case 'function': return serializeFunction(value, eol);
			case 'object': return serializeObject(value, eol);
		}
	}

	/** The `undefined` special value can be handled in many ways, depending on the `onUndefined`
	modifier. If it is a constructor for a subtype of `Error`, it is used to throw an exception. If
	it other type function, it is used as a callback. Else the value is serialized as it is, even if
	it is `undefined` itself.
	*/
	function serializeUndefined() {
		switch (typeof onUndefined) {
			case 'undefined':
				return 'undefined';
			case 'function': {
				if (onUndefined.prototype instanceof Error) {
					throw new onUndefined("Sermat.ser: Cannot serialize undefined value!");
				} else {
					var v = onUndefined.call(null); // Use the given function as callback.
					return (typeof v === 'undefined') ? 'undefined' : serializeValue(v);
				}
			}
			default: return serializeValue(onUndefined);
		}
	}

	function serializeString(str) {
		return JSON.stringify(str);
	}

	function serializeFunction(f, eol) {
		var rec = sermat.identifier(f, false) ? sermat.record(f) : null;
		if (rec) {
			return '$'+ rec.identifier;
		} else {
			// Continue to object, using Function's serializer if it is registered.
			return serializeObject(f, eol);
		}
	}

	/** During object serialization two lists are kept. The `parents` list holds all the ancestors
	of the current object. This is useful to check for circular references. The `visited` list holds
	all previously serialized objects, and is used to check for repeated references and bindings.
	*/
	function serializeObject(obj, eol) {
		if (!obj) {
			return 'null';
		} else if (parents.indexOf(obj) >= 0 && mode !== CIRCULAR_MODE) {
			throw new TypeError("Sermat.ser: Circular reference detected!");
		}
		var output = '',
			i, len;
		/** If `visited` is `null`, means the mode is `REPEAT_MODE` and repeated references do
		not have to be checked. This is only an optimization.
		*/
		if (visited) {
			i = visited.indexOf(obj);
			if (i >= 0) {
				if (mode & BINDING_MODE) {
					return '$'+ i;
				} else {
					throw new TypeError("Sermat.ser: Repeated reference detected!");
				}
			} else {
				i = visited.push(obj) - 1;
				if (mode & BINDING_MODE) {
					output = '$'+ i + _equal;
				}
			}
		}
		parents.push(obj);
		var eol2 = eol && eol +'\t';
		if (_isArray(obj)) { // Arrays.
			output += serializeArray(obj, eol, eol2);
		} else {
			/** An object literal is serialized as a sequence of key-value pairs separated by commas
				between braces. Each pair is joined by a colon. This is the same syntax that
				Javascript's object literals follow.
			*/
			var objProto = _getProto(obj),
				elems = '';
			if (obj.constructor === Object || !useConstructions ||
					climbPrototypes && !objProto.hasOwnProperty('constructor')) {
				elems = serializeElements(obj, eol, eol2);
			/** The object's prototype not having its constructor as an own property is understood
				as an indication that the prototype has been altered, and hence needs to be
				serialized. If the `climbPrototypes` modifier is `true`, the object's prototype is
				added to the serialization as the `__proto__` property.
			*/
				if (climbPrototypes && !objProto.hasOwnProperty('constructor')) {
					elems += (elems ? ','+ eol2 : '') +'__proto__'+ _colon
						+ serializeObject(objProto, eol);
				}
				output += '{'+ eol2 + elems + eol +'}';
			} else {
			/** Constructions is the term used to custom serializations registered by the user for
				specific types. They are serialized as an identifier, followed by a sequence of
				values 	separated by commas between parenthesis. It ressembles a call to a function
				in Javascript.
			*/
				var record = sermat.record(obj.constructor)
					|| autoInclude && sermat.include(obj.constructor);
				if (!record) {
					throw new TypeError("Sermat.ser: Unknown type \""+
						sermat.identifier(obj.constructor) +"\"!");
				}
				var args = record.serializer.call(sermat, obj),
					id = record.identifier;
				if (Array.isArray(args)) {
					output += (ID_REGEXP.exec(id) ? id : serializeString(id)) +'('+ eol2
						+ serializeElements(args, eol, eol2) + eol +')';
				} else {
					output += serializeObject(args, eol);
				}
			}
		}
		parents.pop();
		return output;
	}

	function serializeArray(obj, eol, eol2) {
		/** An array is serialized as a sequence of values separated by commas between brackets,
		as arrays are written in plain Javascript.
		*/
		return '['+ eol2 + serializeElements(obj, eol, eol2) + eol +']';
	}

	function serializeElements(obj, eol, eol2) {
		var output = '',
			_comma = ','+ eol2,
			i = 0,
			isArray = Array.isArray(obj),
			len = isArray ? obj.length : 0;
		if (len > 0) {
			output += serializeValue(obj[i], eol2);
			for (i++; i < len; i++) {
				output += _comma + serializeValue(obj[i], eol2);
			}
		}
		Object.keys(obj).forEach(function (k) {
			if (isArray && (k|0) - k === 0) {
				return;
			}
			if (i > 0) {
				output += _comma;
			}
			output += (ID_REGEXP.exec(k) ? k : serializeString(k)) + _colon +
				serializeValue(obj[k], eol2);
			i++;
		});
		return output;
	}

	return serializeValue(obj, pretty ? '\n' : '');
}
