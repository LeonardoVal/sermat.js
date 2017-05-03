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