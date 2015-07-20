/** ## Wrap-up #####################################################################################

Here both `Sermat`'s prototype and singleton are set up. 
*/
function Sermat(params) {
	var __registry__ = {},
		__register__ = register.bind(this, __registry__);
	member(this, 'registry', __registry__);
	member(this, 'register', __register__);
	params = params || {};
	this.mode = coalesce(params.mode, BASIC_MODE);
	this.allowUndefined = coalesce(params.allowUndefined, false);
	this.useConstructions = coalesce(params.useConstructions, true);
	/** The constructors for Javascript's _basic types_ (`Boolean`, `Number`, `String`, `Object`, 
		and `Array`, but not `Function`) are always registered. 
	*/
	__register__(['Boolean', 'Number', 'String', 'Object', 'Array']);
}

/** Sermat can be used as a constructor of serializer/materializer components as well as a 
	singleton. Each instance has a separate registry of constructors.
*/
var __SINGLETON__ = new Sermat();

/** The constructions for `Date` and `RegExp` are registered globally. 
*/
__SINGLETON__.register(['Date', 'RegExp']);

(function (members) {
	Object.keys(members).forEach(function (id) {
		var m = members[id];
		member(Sermat.prototype, id, m);
		member(Sermat, id, typeof m === 'function' ? m.bind(__SINGLETON__) : m);
	});
})({
	'BASIC_MODE': BASIC_MODE,
	'REPEAT_MODE': REPEAT_MODE,
	'BINDING_MODE': BINDING_MODE,
	'CIRCULAR_MODE': CIRCULAR_MODE,
	'CONSTRUCTIONS': CONSTRUCTIONS,
	
	'identifier': identifier,
	'record': record,
	
	'serialize': serialize, 'ser': serialize,
	'serializeWithProperties': serializeWithProperties,
	
	'materialize': materialize, 'mat': materialize,
	'construct': construct,
	'type': type,
	'signature': signature, 'checkSignature': checkSignature,
	'materializeWithConstructor': materializeWithConstructor,
	
	'sermat': function sermat(obj, modifiers) {
		return this.mat(this.ser(obj, modifiers));
	}
});
member(Sermat, 'registry', __SINGLETON__.registry);
member(Sermat, 'register', __SINGLETON__.register);

/** Module layout (not frozen in purpose).
*/
member(Sermat, '__package__', 'sermat');
member(Sermat, '__name__', 'Sermat');
Sermat.__init__ = __init__;
Sermat.__dependencies__ = [];