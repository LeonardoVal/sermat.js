/** ## Wrap-up #####################################################################################

Here both `Sermat`'s prototype and singleton are set up. 
*/
function sermat(obj, modifiers) {
	return this.mat(this.ser(obj, modifiers));
}

(function (members) {
	Object.keys(members).forEach(function (id) {
		var m = members[id];
		member(Sermat.prototype, id, m);
		member(Sermat, id, typeof m === 'function' ? m.bind(__SINGLETON__) : m);
	});
})({
	'ALLOW_UNDEFINED': ALLOW_UNDEFINED,
	'ALLOW_REPEATED': ALLOW_REPEATED,
	'ALLOW_BINDINGS': ALLOW_BINDINGS,
	'ALLOW_CIRCULAR': ALLOW_CIRCULAR,
	'FORBID_CONSTRUCTIONS': FORBID_CONSTRUCTIONS,
	'CONSTRUCTIONS': CONSTRUCTIONS,
	
	'identifier': identifier,
	'construct': construct,
	'materializeWithConstructor': materializeWithConstructor,
	'serializeWithProperties': serializeWithProperties,
	'type': type,
	'signature': signature,
	'checkSignature': checkSignature,
	
	'serialize': serialize,
	'ser': serialize,
	'materialize': materialize,
	'mat': materialize,
	'sermat': sermat
});
member(Sermat, 'register', __SINGLETON__['register']);
member(Sermat, 'record', __SINGLETON__['record']);

/** The constructors that are registered globally `Sermat` are: `Boolean`, `Number`, `String`, 
`Object`, `Array`, `Date` and `RegExp`. 
*/
[Boolean, Number, String, Object, Array, Date, RegExp
].forEach(function (type) {
	var rec = record(CONSTRUCTIONS, type);
	Sermat.register(type, rec.serializer, rec.materializer);
});

/** Freeze Sermat's prototype and singleton.
*/
Object.freeze(Sermat);
Object.freeze(Sermat.prototype);