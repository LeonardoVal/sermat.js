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

/** `serializeWithConstructor` serializes the `obj` object with a list of properties inferred from
the `constructor`'s formal argument list.
*/
function serializeWithConstructor(constructor, obj) {
	var str = constructor +'',
		comps = /^function\s*[\w$]*\s*\(([^)]*)\)\s*\{/.exec(str)
		|| /^\(([^)]*)\)\s*=>/.exec(str);
	if (comps && comps[1]) {
		return comps[1].split(/\s*,\s*/).map(function (k) {
			return obj[k];
		});
	} else {
		throw new TypeError("Cannot infer a serialization from constructor ("+ constructor +")!");
	}
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

/** The `clone` function makes a deep copy of a value, taking advantage of Sermat's definitions. It
is like `Sermat.sermat`, but without dealing with text.
*/
function clone(obj, modifiers) {
	var sermat = this,
		visited = [],
		cloned = [],
		useConstructions = _modifier(modifiers, 'useConstructions', this.modifiers.useConstructions),
		autoInclude = _modifier(modifiers, 'autoInclude', this.modifiers.autoInclude),
		climbPrototypes = _modifier(modifiers, 'climbPrototypes', this.modifiers.climbPrototypes);
	
	function cloneObject(obj) {
		visited.push(obj);
		var isArray = Array.isArray(obj),
			clonedObj;
		if (isArray || obj.constructor === Object || !useConstructions) {
			clonedObj = isArray ? [] : {};
			if (climbPrototypes) { 
				var objProto = _getProto(obj);
				if (!objProto.hasOwnProperty('constructor')) {
					_setProto(clonedObj, cloneObject(objProto));
				}
			}
			cloned.push(clonedObj);
			Object.keys(obj).forEach(function (k) {
				clonedObj[k] = cloneValue(obj[k]);
			});
		} else { // Constructions.
			var record = sermat.record(obj.constructor)
				|| autoInclude && sermat.include(obj.constructor);
			if (!record) {
				throw new TypeError("Sermat.clone: Unknown type \""+ sermat.identifier(obj.constructor) +"\"!");
			}
			clonedObj = record.materializer.call(sermat, null, null);
			cloned.push(clonedObj);
			record.materializer.call(sermat, clonedObj, record.serializer.call(sermat, obj));
		}
		return clonedObj;
	}
	
	function cloneValue(value) {
		switch (typeof value) {
			case 'undefined':
			case 'boolean':
			case 'number':   
			case 'string':
			case 'function':
				return value;
			case 'object':
				if (value === null) {
					return null;
				}
				var i = visited.indexOf(value);
				return i >= 0 ? cloned[i] : cloneObject(value);
			default: 
				throw new Error('Unsupported type '+ typeof value +'!');
		}
	}
	
	return cloneValue(obj);
}

/** The `hashCode` function calculates an integer hash for the given value. It is mostly inspired by
the same method in Java objects.
*/
function hashCode(value, modifiers) {
	var sermat = this,
		visited = [],
		hashCodes = [],
		useConstructions = _modifier(modifiers, 'useConstructions', this.modifiers.useConstructions),
		autoInclude = _modifier(modifiers, 'autoInclude', this.modifiers.autoInclude),
		climbPrototypes = _modifier(modifiers, 'climbPrototypes', this.modifiers.climbPrototypes);

	function hashObject(obj) {
		var hash = 1,
			hashIndex = visited.push(obj);
		hashCodes.push(0);
		if (Array.isArray(obj) || obj.constructor === Object || !useConstructions) {
			if (climbPrototypes) { 
				var objProto = _getProto(obj);
				if (!objProto.hasOwnProperty('constructor')) {
					hash = hashObject(objProto);
				}
			}
			var hashes = [];
			for (var k in obj) {
				hashes.push(hashValue(k) ^ hashValue(obj[k]));
			}
			hashes.sort(function (x,y) {
				return x - y;
			}).forEach(function (x) {
				hash = (31 * hash + x) |0;
			});
		} else { // Constructions.
			var record = sermat.record(obj.constructor)
				|| autoInclude && sermat.include(obj.constructor);
			if (!record) {
				throw new TypeError("Sermat.hashCode: Unknown type \""+ sermat.identifier(obj.constructor) +"\"!");
			}
			return hashObject(record.serializer.call(sermat, obj));
		}
		hashCodes[hashIndex] = hash;
		return hash;
	}
		
	function hashValue(value) {
		switch (typeof value) {
			case 'undefined':
			case 'boolean':   
			case 'number': return value >>> 0;
			case 'string':
				var result = 5381;
				for (var i = 0, len = value.length & 0x1F; i < len; i++) { 
					result = result * 33 ^ value.charCodeAt(i);
				}
				return result >>> 0;
			case 'function':
			case 'object':
				if (value === null) {
					return 0;
				}
				var i = visited.indexOf(value);
				return i >= 0 ? hashCodes[i] : hashObject(value);
			default: 
				throw new Error('Unsupported type '+ typeof value +'!');
		}
	}
	
	return hashValue(value);
}