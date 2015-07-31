/** ## Wrap-up #####################################################################################

Here both `Sermat`'s prototype and singleton are set up. 
*/
function Sermat(params) {
	var __registry__ = {},
		__register__ = register.bind(this, __registry__),
		__modifiers__ = {};
	member(this, 'registry', __registry__);
	member(this, 'register', __register__);
	
	params = params || {};
	member(this, 'modifiers', __modifiers__);
	member(__modifiers__, 'allowUndefined', coalesce(params.allowUndefined, false), 5);
	member(__modifiers__, 'mode', coalesce(params.mode, BASIC_MODE), 5);
	member(__modifiers__, 'useConstructions', coalesce(params.useConstructions, true), 5);
	/** The constructors for Javascript's _basic types_ (`Boolean`, `Number`, `String`, `Object`, 
		and `Array`, but not `Function`) are always registered. 
	*/
	this.include(['Boolean', 'Number', 'String', 'Object', 'Array']);
}

var __members__ = {
	'BASIC_MODE': BASIC_MODE,
	'REPEAT_MODE': REPEAT_MODE,
	'BINDING_MODE': BINDING_MODE,
	'CIRCULAR_MODE': CIRCULAR_MODE,
	'CONSTRUCTIONS': CONSTRUCTIONS,
	
	'identifier': identifier,
	'record': record,
	'include': include,
	
	'serialize': serialize, 'ser': serialize,
	'serializeAsProperties': serializeAsProperties,
	
	'materialize': materialize, 'mat': materialize,
	'construct': construct,
	'type': type,
	'signature': signature, 'checkSignature': checkSignature,
	'materializeWithConstructor': materializeWithConstructor,
	
	'sermat': sermat
};
Object.keys(__members__).forEach(function (id) {
	var m = __members__[id];
	member(Sermat.prototype, id, m);
});

/** Sermat can be used as a constructor of serializer/materializer components as well as a 
	singleton. Each instance has a separate registry of constructors.
*/
var __SINGLETON__ = new Sermat();

/** The constructions for `Date` and `RegExp` are registered globally. 
*/
__SINGLETON__.include(['Date', 'RegExp']);

Object.keys(__members__).forEach(function (id) {
	var m = __members__[id];
	member(Sermat, id, typeof m === 'function' ? m.bind(__SINGLETON__) : m);
});

member(Sermat, 'registry', __SINGLETON__.registry);
member(Sermat, 'register', __SINGLETON__.register);
member(Sermat, 'modifiers', __SINGLETON__.modifiers);

/** Module layout.
*/
member(Sermat, '__package__', 'sermat');
member(Sermat, '__name__', 'Sermat');
member(Sermat, '__init__', __init__, 4);
member(Sermat, '__dependencies__', [], 4);