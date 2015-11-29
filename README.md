Sermat.js
=========

Sermat is a serialization and data exchange format, similar to [JSON](http://json.org/). It is meant to be used when dealing with heavily marshalled interfaces separating the application being developed. Examples of this include the communtication between [web workers](http://www.whatwg.org/specs/web-workers/current-work/) or those and the rendering thread in browsers, or between [iframes](http://www.w3schools.com/html/html_iframe.asp). 

[![Built with Grunt](https://cdn.gruntjs.com/builtwith.png)](http://gruntjs.com/) [![NPM](https://nodei.co/npm/sermat.png?mini=true)](https://www.npmjs.com/package/sermat)

## Design

Sermat goals are the following:

+ _Extend JSON_: All valid JSON strings must be also valid Sermat strings, although the viceversa may not be true.

+ _Allow custom types_: Sermat must be able to deal with instances of types other than the basic Javascript types (booleans, numbers, strings, arrays and object literals). Users must be able to register types to be used (like `Date` or user defined classes), in order to serialize them properly and obtain an equivalent instance after parsing.
	
+ _Handle structures with complicated references_: Users must be able to serialize (and afterwards properly materialize) data structures that are not strictly trees; i.e. values may be referenced more than once, even if that means a cycle of references.

### Minor changes
	
Sermat addresses some minor quirks of JSON. Firstly, serializing `undefined` values will raise an error, unless explicitly permitted. In that case `undefined` will be transformed to `null` in a consistent manner. 

```javascript
JSON.stringify(undefined);
// Results in undefined
Sermat.serialize(undefined);
// Raises "Sermat.serialize: Cannot serialize undefined value!"
Sermat.serialize(undefined, { allowUndefined: true });
// Results in "null"

JSON.stringify({ a: undefined });
// Results in "{}"
Sermat.serialize({ a: undefined }, { allowUndefined: true });
// Results in "{a:null}"
JSON.stringify([undefined]);
// Results in "[null]"
Sermat.serialize([undefined], { allowUndefined: true });
// Results in "[null]"
```

`Infinity` and `NaN` values are allowed, as well as comments, using the block comment syntax of Javascript. Strings may have multiple lines between the double quotes. Also, some escape sequences that are valid in Javascript but not in JSON are accepted by Sermat (e.g. `'\v'` or `'\xA9'`). Keys in object literals don't have to be between double quotes if they comply with [Javascript's rules for identifiers](http://www.w3schools.com/js/js_variables.asp) and if all characters are in the range `[\x00-\x7F]` (dots and dashes are also allowed).

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
Sermat.serialize(new Point2D(44, 173)); // Results in: 'mylib.Point2D(44,173)'
```

The serializer function must return the list of values to put between parenthesis. The materializer function will rebuild the instance using these values. Further details are explained later on.

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

### Pretty printing

The serializer by default produces the text in a compressed form. A more human friendly version of 
this text can be generated with the `pretty` option. It turns this:

```
{a:[1,2,3],b:RegExp("\w+","i")}
```

into this:

```
{
	a : [
		1,
		2,
		3
	],
	b : RegExp(
		"\w+",
		"i"
	)
}
```

Still, the whitespace used to format the output cannot be customized, as with `JSON.stringify`.

## License

Sermat is open source software, licenced under an [MIT license](LICENSE.md) (see LICENSE.md).

## Contact

Suggestions and comments are always welcome at [leonardo.val@creatartis.com](mailto:leonardo.val@creatartis.com).