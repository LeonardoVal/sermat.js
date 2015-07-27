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
	ID_REGEXP = /^[\$A-Z_a-z][\$\-\.\w]*$/;
function identifier(type, must) {
	var id = (type.__SERMAT__ && type.__SERMAT__.identifier)
		|| type.name
		|| (FUNCTION_ID_RE.exec(constructor +'') || [])[1];
	if (!id && must) {
		raise('identifier', "Could not found id for type!", { type: type });
	}
	return id;
}

/** A `record` for a construction can be obtained using its identifier or the constructor function
of the type.
*/
function record(type, must) {
	var id = typeof type === 'function' ? identifier(type, true) : type +'',
		result = this.registry[id];
	if (!result && must) {
		raise('record', 'Unknown type "'+ id +'"!', { type: type });
	}
	return result;
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
		raise('register', 'No constructor found for type ('+ spec +')!', { spec: spec });
	}
	var id = spec.identifier;
	if (!id) {
		id = spec.identifier = identifier(spec.type, true);
	}
	if (!ID_REGEXP.exec(id)) {
		raise('register', "Invalid identifier '"+ id +"'!", { spec: spec });
	}
	if (registry.hasOwnProperty(id)) {
		raise('register', "'"+ id +"' is already registered!", { spec: spec });
	}
	if (typeof spec.serializer !== 'function') {
		raise('register', "Serializer for '"+ spec.identifier +"' is not a function!", { spec: spec });
	}
	if (!spec.materializer) {
		spec.materializer = materializeWithConstructor.bind(this, spec.type);
	}
	if (typeof spec.materializer !== 'function') {
		raise('register', "Materializer for '"+ id +"' is not a function!", { spec: spec });
	}
	Object.freeze(spec);
	registry[id] = spec;
	if (spec.global && !CONSTRUCTIONS[id]) {
		CONSTRUCTIONS[id] = spec;
	}
	return spec;
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
			spec = arg.__SERMAT__;
			if (spec && !this.record(arg)) {
				spec.type = arg;
				spec = this.register(spec);
			}
			break;
		}
		case 'string': {
			if (CONSTRUCTIONS[arg] && !this.registry[arg]) {
				spec = this.register(CONSTRUCTIONS[arg]);
			}
			break;
		}
		case 'object': {
			if (Array.isArray(arg)) {
				return arg.map((function (c) {
					return this.include(c);
				}).bind(this));
			} else {
				spec = arg;
				if (spec.identifier ? !this.registry[spec.identifier] : !this.record(spec.constructor)) {
					spec = this.register(spec);
				}
			}
			break;
		}
		default: raise('register', "Could not include ("+ arg +")!", { arg: arg });
	}
	if (spec && spec.include) {
		this.include(spec.include);
	}
	return spec;
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