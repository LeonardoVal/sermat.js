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
	ID_REGEXP = /^[a-zA-Z_][a-zA-Z0-9_]*(?:[\.-][a-zA-Z0-9_]+)*$/;
function identifier(type, must) {
	var id = (type.__SERMAT__ && type.__SERMAT__.identifier)
		|| type.name
		|| (FUNCTION_ID_RE.exec(type +'') || [])[1];
	if (!id && must) {
		throw new Error("Sermat.identifier: Could not found id for type "+ type +"!");
	}
	return id;
}

/** A `record` for a construction can be obtained using its identifier or the constructor function
of the type.
*/
function record(type) {
	var id = typeof type === 'function' ? identifier(type, true) : type +'';
	return this.registry[id];
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
		throw new Error("Sermat.register: No constructor found for type ("+ spec +")!");
	}
	spec = {
		type: spec.type,
		identifier: (spec.identifier || identifier(spec.type, true)).trim(),
		serializer: spec.serializer,
		materializer: spec.materializer || materializeWithConstructor.bind(this, spec.type),
		global: !!spec.global,
		include: spec.include
	};
	var id = spec.identifier;
	['true', 'false','null','NaN','Infinity',''].forEach(function (invalidId) {
		if (id === invalidId) {
			throw new Error("Sermat.register: Invalid identifier '"+ id +"'!");
		}
	});
	if (registry.hasOwnProperty(id)) {
		throw new Error("Sermat.register: Construction '"+ id +"' is already registered!");
	}
	if (typeof spec.serializer !== 'function') {
		throw new Error("Sermat.register: Serializer for '"+ id +"' is not a function!");
	}
	if (typeof spec.materializer !== 'function') {
		throw new Error("Sermat.register: Materializer for '"+ id +"' is not a function!");
	}
	Object.freeze(spec);
	registry[id] = spec;
	if (spec.global && !CONSTRUCTIONS[id]) {
		CONSTRUCTIONS[id] = spec;
	}
	if (spec.include) {
		this.include(spec.include);
	}
	return spec;
}

/** A registered construction can be removed with the `remove` method giving its identifier.
*/
function remove(registry, id) {
	if (!registry.hasOwnProperty(id)) {
		throw new Error("Sermat.remove: A construction for '"+ id +"' has not been registered!");
	}
	var r = registry[id];
	delete registry[id];
	return r;
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
			spec = this.record(arg);
			if (!spec && arg.__SERMAT__) {
				arg.__SERMAT__.type = arg;
				spec = this.register(arg.__SERMAT__);
			}
			return spec;
		}
		case 'string': {
			spec = this.record(arg);
			if (!spec && CONSTRUCTIONS[arg]) {
				spec = this.register(CONSTRUCTIONS[arg]);
			}
			return spec;
		}
		case 'object': {
			if (Array.isArray(arg)) {
				return arg.map((function (c) {
					return this.include(c);
				}).bind(this));
			} else if (typeof arg.type === 'function') {
				return this.record(arg.identifier || arg.type) || this.register(arg);
			} else if (arg && arg.__SERMAT__ && arg.__SERMAT__.include) {
				return this.include(arg.__SERMAT__.include);
			}
		}
		default: throw new Error("Sermat.include: Could not include ("+ arg +")!");
	}
}

/** The `exclude` method is also a convenient way of removing type registrations. Returns the amount
of registrations actually removed.
*/
function exclude(arg) {
	switch (typeof arg) {
		case 'string': {
			if (this.record(arg)) {
				this.remove(arg);
				return 1;
			}
			return 0;
		}
		case 'function': {
			return this.exclude(identifier(arg));
		}
		case 'object': {
			if (Array.isArray(arg)) {
				var r = 0;
				arg.forEach((function (c) {
					r += this.exclude(c);
				}).bind(this));
				return r;
			}
		}
		default: throw new Error("Sermat.exclude: Could not exclude ("+ arg +")!");
	}
}