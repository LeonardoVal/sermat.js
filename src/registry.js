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
function Sermat() {
	var __registry__ = {};
	member(this, 'record', record.bind(this, __registry__));
	member(this, 'register', register.bind(this, __registry__));
}

/** Sermat can be used as a constructor of serializer/materializer components as well as a 
	singleton. Each instance has a separate registry of constructors.
*/
var __SINGLETON__ = new Sermat();

/** All constructions use a name to identify the type's custom serializer and materializer. Sermat 
must be able to infer this name from the constructor function of the type. By default the name of 
the constructor function is used, but this can be overriden by setting a `__SERMAT__` property
of the function.
*/
var FUNCTION_ID_RE = /^\s*function\s+(\w+)/;
function identifier(constructor, must) {
	var id = (constructor.__SERMAT__ && constructor.__SERMAT__.identifier)
		|| constructor.name
		|| (FUNCTION_ID_RE.exec(constructor +'') || [])[1];
	if (!id && must) {
		raise("Could not found id for constructor!", { constructorWithoutId: constructor, context: "SERMAT.identifier" });
	}
	return id;
}

/** A `record` for a construction can be obtain using its identifier or its constructor function. If
	a function is given that is not registered, it will be registered if possible.
*/
function record(__registry__, constructor) {
	if (typeof constructor === 'string') {
		return __registry__[constructor];
	} else {
		var id = identifier(constructor, true),
		result = __registry__[id];
		return result || register(__registry__, constructor);
	}
}

/** The registry for every custom serializer has three components: an identifier, a serializer 
	(unparser or _stringifier_) function and a materializer (parser or deserializer) function. All
	of these can be taken from a member of the constructor function called `__SERMAT__`. Else, both 
	the constructor's name is used as identifier and at least the serializer has to be given.
	
	If a materializer function is not specified, it is assumed the serialization is equal to the
	arguments with which the constructor has to be called to recreate the instance. So, a default
	materializer is created, which calls the constructor with the list of values in the text.
*/
function register(__registry__, constructor, serializer, materializer) {
	var id = identifier(constructor, true);
	if (__registry__.hasOwnProperty(id)) {
		raise("'"+ id +"' is already registered!", { repeatedId: id, context: 'Sermat.register' });
	}
	var custom = constructor.__SERMAT__;
	if (typeof serializer === 'undefined') {
		serializer = custom && custom.serializer
	}
	if (typeof serializer !== 'function') {
		raise("Serializer for '"+ id +"' is not a function!", { invalidSerializer: serializer, context: 'Sermat.register' });
	}
	if (typeof materializer === 'undefined') {
		materializer = custom && custom.materializer;
		if (typeof materializer !== 'function') {
			materializer = materializeWithConstructor.bind(this, constructor);
		}
	}
	if (typeof materializer !== 'function') {
		raise("Materializer for '"+ id +"' is not a function!", { invalidMaterializer: materializer, context: 'Sermat.register' });
	}
	var record = __registry__[id] = { 
		constructor: constructor, 
		identifier: id, 
		serializer: serializer, 
		materializer: materializer 
	};
	Object.freeze(record);
	return record;
}

/** `materializeWithConstructor` is a generic way of creating a new instance of the given 
`constructor`. Basically a new object is built using the constructor's prototype, and then the
constructor is called on this object and the given arguments (`args`) to initialize it.

This method can be used to quickly implement a materializer function when only a call to a 
constructor function is required. It is the default materialization when no method has been 
given for a registered constructor.
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