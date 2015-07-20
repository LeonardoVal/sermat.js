/** ## Registry ####################################################################################

Sermat allows an extensible syntax to write and read instances of custom _classes_. The syntax 
ressembles a function call in Javascript. For example:

```
RegExp("\d+", "g")
Date(1999,12,31,23,59,59,999)
```

These are called _constructions_. In order to use this, the custom class' constructor has to be 
registered with a serializer (unparser or _stringifier_) and a materializer (parser or deserializer) 
functions.
*/
function entry(identifier, constructor, serializer, materializer) {
	var r = { 
		identifier: identifier,
		constructor: constructor, 
		serializer: serializer, 
		materializer: materializer 
	};
	Object.freeze(r);
	return r;
}

/** All constructions use a name to identify the type's custom serializer and materializer. Sermat 
must be able to infer this name from the constructor function of the type. By default the name of 
the constructor function is used, but this can be overriden by setting a `__SERMAT__` property
of the function.
*/
var FUNCTION_ID_RE = /^\s*function\s+([\w\$]+)/,
	ID_REGEXP = /^[\$A-Z_a-z][\$\-\.\w]*$/;
function identifier(constructor, must) {
	var id = (constructor.__SERMAT__ && constructor.__SERMAT__.identifier)
		|| constructor.name
		|| (FUNCTION_ID_RE.exec(constructor +'') || [])[1];
	if (!id && must) {
		raise('identifier', "Could not found id for constructor!", { constructorWithoutId: constructor });
	}
	return id;
}

/** A `record` for a construction can be obtained using its identifier or its constructor function. 
If a function is given that is not registered, it will be registered if possible.
*/
function record(constructor) {
	if (typeof constructor === 'string') {
		return this.registry[constructor];
	} else {
		var id = identifier(constructor, true),
		result = this.registry[id];
		return result || this.register(constructor);
	}
}

/** The registry for every custom serializer has three components: an identifier, a serializer 
(unparser or _stringifier_) function and a materializer (parser or deserializer) function. All of 
these can be taken from a member of the constructor function called `__SERMAT__`. Else, both the 
constructor's name is used as identifier and at least the serializer has to be given.

If a materializer function is not specified, it is assumed the serialization is equal to the
arguments with which the constructor has to be called to recreate the instance. So, a default
materializer is created, which calls the constructor with the list of values in the text.
*/
function register(registry, constructor, serializer, materializer) {
	switch (typeof constructor) {
		case 'function': break;
		case 'string': return register(registry, CONSTRUCTIONS[constructor]);
		case 'object': {
			if (Array.isArray(constructor)) {
				return constructor.map(function (c) {
					return register(registry, c);
				});
			} else {
				return register(registry, constructor.constructor, constructor.serializer, constructor.materializer);
			}
		}
		default: raise('register', "Constructor is not a function!", { invalidConstructor: constructor });
	}
	
	var id = identifier(constructor, true);
	if (!ID_REGEXP.exec(id)) {
		raise('register', "Invalid identifier '"+ id +"'!", { invalidId: id });
	}
	if (registry.hasOwnProperty(id)) {
		raise('register', "'"+ id +"' is already registered!", { repeatedId: id });
	}
	var custom = constructor.__SERMAT__;
	if (typeof serializer === 'undefined') {
		serializer = custom && custom.serializer
	}
	if (typeof serializer !== 'function') {
		raise('register', "Serializer for '"+ id +"' is not a function!", { invalidSerializer: serializer });
	}
	if (typeof materializer === 'undefined') {
		materializer = custom && custom.materializer;
		if (typeof materializer !== 'function') {
			materializer = materializeWithConstructor.bind(this, constructor);
		}
	}
	if (typeof materializer !== 'function') {
		raise('register', "Materializer for '"+ id +"' is not a function!", { invalidMaterializer: materializer });
	}
	return registry[id] = entry(id, constructor, serializer, materializer);
}

/** `materializeWithConstructor` is a generic way of creating a new instance of the given 
`constructor`. Basically a new object is built using the constructor's prototype, and then the
constructor is called on this object and the given arguments (`args`) to initialize it.

This method can be used to quickly implement a materializer function when only a call to a 
constructor function is required. It is the default materialization when no method has been given 
for a registered constructor.
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