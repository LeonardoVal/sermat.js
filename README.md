Sermat.js
=========

Sermat is a serialization and data exchange format, similar to [JSON](http://json.org/). It is meant to be used when dealing with heavily marshalled interfaces separating the application being developed. Examples of this include the communtication between [web workers](http://www.whatwg.org/specs/web-workers/current-work/) or those and the rendering thread in browsers, or between [iframes](http://www.w3schools.com/html/html_iframe.asp). 

[![Built with Grunt](https://cdn.gruntjs.com/builtwith.png)](http://gruntjs.com/) [![NPM](https://nodei.co/npm/sermat.png?mini=true)](https://www.npmjs.com/package/sermat)

## Format

Sermat goals are the following:

+ _Extend JSON_: All valid JSON strings must be also valid Sermat strings, although the viceversa may not be true.

+ _Allow custom types_: Sermat must be able to deal with instances of types other than the basic Javascript types (booleans, numbers, strings, arrays and object literals). Users must be able to register types to be used (like `Date` or user defined classes), in order to serialize them properly and obtain an equivalent instance after parsing.
	
+ _Handle structures with complicated references_: Users must be able to serialize (and afterwards properly materialize) data structures that are not strictly trees; i.e. values may be referenced more than once, even if that means a cycle of references.

### Minor changes
	
Sermat addresses some minor quirks of JSON. Firstly, serializing `undefined` values will raise an error by default. The modifier `onUndefined` can be set to transform `undefined` values in a consistent manner. 

```javascript
JSON.stringify(undefined)
// Results in undefined
Sermat.serialize(undefined)
// Throws TypeError("Sermat.serialize: Cannot serialize undefined value!")
Sermat.serialize(undefined, { onUndefined: null })
// Results in "null"
Sermat.serialize(undefined, { onUndefined: MyErrorType })
// Throws MyErrorType("Sermat.serialize: Cannot serialize undefined value!")
Sermat.serialize(undefined, { onUndefined: (void 0) })
// Results in "undefined".

JSON.stringify({ a: undefined })
// Results in "{}"
Sermat.serialize({ a: undefined }, { onUndefined: null })
// Results in "{a:null}"
JSON.stringify([undefined])
// Results in "[null]"
Sermat.serialize([undefined], { onUndefined: null })
// Results in "[null]"
```

`Infinity` and `NaN` values are allowed, as well as comments, using the block comment syntax of Javascript. Keys in object literals don't have to be between double quotes if they comply with [Javascript's rules for identifiers](http://www.w3schools.com/js/js_variables.asp) and if all characters are in the range `[\x00-\x7F]` (dots and dashes are also allowed).

```javascript
JSON.stringify(-Infinity)
// Results in 'null'.
Sermat.ser(Infinity)
// Results in '-Infinity'.
JSON.stringify(NaN)
// Results in 'null'.
Sermat.ser(NaN)
// Results in 'NaN'.
JSON.stringify({x:1,"y.z":2,"@":3});
// Results in '{"x":1,"y.z":2,"@":3}'.
Sermat.ser({x:1,"y.z":2,"@":3});
// Results in '{x:1,y.z:2,"@":3}'.
```

### Constructions

One of the more important aspects of Sermat are _constructions_: a way of customizing serialization and materialization for particular types. The user may register custom methods for serializing and materializing objects built with a given constructor (e.g. `Date`). These objects will be written in text form in a similar way a function call is written in Javascript.

```javascript
Sermat.serialize(new Date());
// Results like this: 'Date(2015,6,5,6,33,47,123)'.
Sermat.serialize(/\d+/g);
// Results in: 'RegExp("\\\\d+","g")'.
```

When parsed, the result will be a properly initialized instance of the corresponding type. Some Javascript base types are implemented _out-of-the-box_. Implementations for custom types can be defined with `Sermat.register` or adding a `__SERMAT__` member to the constructor. In the following example the identifier is defined to be `mylib.Point2D`, instead of the default `Point2D`.

```javascript
function Point2D(x, y) {
	this.x = +x;
	this.y = +y;
}
Sermat.serialize(new Point2D(44, 173)); // Raises "Sermat.record: Unknown type \"Point2D\"!"
Point2D.__SERMAT__ = {
	identifier: "mylib.Point2D",
	serializer: function serialize_Point2D(obj) {
		return [obj.x, obj.y];
	},
	materializer: function materialize_Point2D(obj, args) {
		return args && (new Point2D(+args[0], +args[1]));
	}
};
Sermat.include(Point2D);
Sermat.serialize(new Point2D(44, 173)); // Results in: 'mylib.Point2D(44,173)'.
```

The serializer function must return the list of values to put between parenthesis. The materializer function will rebuild the instance using these values. Further details are explained later on.

Constructions are also used in some situations for native Javascript. For example when values like `true`, `12` or `[1,2,3]` are treated as objects.
```javascript
Sermat.ser(Object(true));
// Results in "Boolean(true)"
Sermat.ser(Object.assign(Object(true), {x:1}));
// Results in "Boolean(true,{x:1})".
Sermat.serialize(Object.assign([1,2,3], {x:1}));
// Results like this: 'Array([1,2,3],{x:1})'.
```

### References 

Sermat by default does not allow objects to be serialized more than once. Having the same object as a component in more than one place causes an error. For example:

```javascript
var obj1 = {a: 7};
Sermat.serialize([obj1, obj1]);
// Raises "Sermat.serialize: Repeated reference detected!"
```

This behaviour can be changed in two ways. The first one is simply to allow values to be serialized more than once, like JSON does. 

```javascript
JSON.stringify([obj1, obj1]);
// Results in '[{"a":7},{"a":7}]'.
Sermat.serialize([obj1, obj1], { mode: Sermat.REPEAT_MODE });
// Results in '[{a:7},{a:7}]'.
```

The second one is part of another important feature called _bindings_. This is a syntax that allows to bind values to identifiers (starting with `$`) so they can be reused in another place. When parsed the resulting data structure is an acyclic graph instead of a tree.

```javascript
Sermat.serialize([obj1, obj1], { mode: Sermat.BINDING_MODE });
// Results in '$0=[$1={a:7},$1]'.
```

Circular references are not supported by only allowing bindings. To make this work, circular references have to be allowed explicitly.

```javascript
obj1.b = obj1;
Sermat.serialize([obj1, obj1], { mode: Sermat.BINDING_MODE });
// Raises "Sermat.serialize: Circular reference detected!"
Sermat.serialize([obj1, obj1], { mode: Sermat.CIRCULAR_MODE });
// Results in '$0=[$1={a:7,b:$1},$1]'.
```

Circular reference support in constructions requires the materializer functions to follow this protocol. If a new instance must be built the `obj` argument will be `null`, else it will have an instance already built to initialize. If an empty instance must be built the `args` argument will be `null`, else it will have the arguments for the objects constructor (either with or without `new`).

When a construction is being parsed (after the identifier and before its arguments) the corresponding materializer is called without arguments (`obj` and `args` both equal to `null`). If a new _empty_ instance can be built it must be returned. The materializer will be called again later (after the arguments have been parsed) with `obj` equal to this result, so the new instance can be properly initialized. If the materializer cannot build an _empty_ instance, it must returns `null`. This defers building the new object to after the arguments have been parsed, but then circular references cannot be properly parsed.

This example show both cases. It uses the `sermat` function, which basically serializes a value and then materializes it back, effectively cloning it.

```javascript
function Refs(refs) {
	this.refs = Array.isArray(refs) ? refs : refs ? [refs] : [];
}
Refs.ALLOW_EMPTY_INSTANCES = false;
Sermat.register({
	type: Refs, 
	serializer: function serialize_Refs(obj) {
		return obj.refs;
	},
	materializer: function materialize_Refs(obj, args) {
		if (args === null) {
			return Refs.ALLOW_EMPTY_INSTANCES ? (new Refs()) : null; 
		} else if (obj !== null) {
			Refs.call(obj, args);
			return obj;
		} else {
			return new Refs(args);
		}
	}
});
var refs1 = new Refs(obj1);
refs1.refs.push(refs1);
Sermat.mode = Sermat.CIRCULAR_MODE;
Sermat.sermat(refs1); // Raises "Sermat.materialize: '$xx' is not bound at ...!".
Refs.ALLOW_EMPTY_INSTANCES = true;
Sermat.sermat(refs1); // Returns a copy of refs1.
```

## Library

The library has many versions available for browsers, [node](https://nodejs.org/docs/latest/api/modules.html), 
[AMD](http://requirejs.org/docs/whyamd.html) and [UMD](https://github.com/umdjs/umd). `Sermat` is 
the module, a singleton and a constructor of serializers and materializers.

### Definitions

Sermat objects have a `serialize` or `ser` method to serialize values, which is the equivalent to 
`JSON.stringify`. The `materialize` or `mat` method is used to parse and rebuild a serialized value,
which is equivalent to `JSON.parse`. The Sermat objects have a set of _modifiers_ to the behaviours
of these methods:

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

Modifiers can also be overriden in the second argument of the methods.

### Pretty printing

The serializer by default produces the text in a compressed form. A more human friendly version of 
this text can be generated with the `pretty` option. Calling `Sermat.ser({a:[1,2,3],b:/\w+/i})` 
results like this:

```
{a:[1,2,3],b:RegExp("\\w+","i")}
```

while `Sermat.ser({a:[1,2,3],b:/\w+/i}, { pretty: true })` into this:

```
{
	a : [
		1,
		2,
		3
	],
	b : RegExp(
		"\\w+",
		"i"
	)
}
```

Still, the whitespace used to format the output cannot be customized, as with `JSON.stringify`.

## License

Sermat is open source software, licenced under an [MIT license](LICENSE.md) (see LICENSE.md).

## Contact

Suggestions and comments are always welcome at [leonardo.val@creatartis.com](mailto:leonardo.val@creatartis.com).