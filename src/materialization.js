/** ## Materialization #############################################################################

The `materialize` method is similar to JSON's `parse` method. It takes text and parses it to produce
the data structure it represents.
*/

/** The `construct` method seeks for a materializer for the given identifier and calls it.
*/
function construct(id, obj, args) {
	var record = this.record(id);
	if (record) {
		return record.materializer.call(this, obj, args);
	} else {
		throw new SyntaxError("Sermat.construct: Cannot materialize type '"+ id +"'");
	}
}

var RE_IGNORABLES = /(?:\s|\/\*(?:[\0-\)+-.0-\uFFFF]*|\*+[\0-\)+-.0-\uFFFF])*\*+\/)*/,
	RE_NUM = /[+-]?(?:Infinity|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/,
	RE_STR = /\"(?:[^\\\"\n]|\\[^\n])*\"|`(?:[^\\\`]|\\.)*`/,
	RE_ID = /[a-zA-Z_](?:[.-]?[a-zA-Z0-9_]+)*/,
	RE_BIND = /\$[a-zA-Z0-9_]+(?:[.-]?[a-zA-Z0-9_]+)*/,
	RE_SYMBOLS = /[\,[\]{:}(=)]/,
	RE_EOL = /\r\n?|\n/g,
	LEXER = new RegExp('^'+ RE_IGNORABLES.source +'(?:'+
		'('+ RE_NUM.source 
		+')|('+ RE_STR.source
		+')|('+ RE_ID.source
		+')|('+ RE_BIND.source
		+')|('+ RE_SYMBOLS.source 
		+')|$)'),
	TOKENS = 'nsib',
	/** These are the constant values handled by the format.
	*/
	CONSTANTS = {
		'undefined': void 0,
		'true': true,
		'false': false,
		'null': null, 
		'NaN': NaN,
		'Infinity': Infinity
	};
	
function materialize(source, modifiers) {
	var input = source +'', 
		offset = 0,
		token, text,
		bindings = modifiers && modifiers.bindings || {},
		sermat = this;

	function nextToken() {
		var tokens = LEXER.exec(input),
			result, len, i;
		text = '';
		if (!tokens) {
			error('Invalid character "'+ input.charAt(0) +'"');
		} else {
			len = tokens[0].length;
			input = input.substr(len);
			offset += len;
			for (i = 1, len = TOKENS.length; i <= len; i++) {
				if (tokens[i]) {
					token = TOKENS.charAt(i-1);
					text = tokens[i];
					break;
				}
			}
			if (!text) {
				token = tokens[i] || '$';
			}
			return token;
		}
	}
	
	function error(msg) {
		msg = msg || "Parse error";
		offset -= text.length;
		var line = 0, lineStart = 0;
		source.substr(0, offset).replace(RE_EOL, function (match, pos) {
			lineStart = pos + match.length;
			line++;
			return '';
		});
		throw new SyntaxError("Sermat.mat: "+ msg +" at line "+ (line + 1) +" column "+ 
			(offset - lineStart) +" (offset "+ (offset + 1) +")!");
	}

	function shift(expected) {
		if (token !== expected) {
			error("Parse error. Expected <"+ expected +"> but got <"+ (text || token) +">");
		}
		nextToken();
	}

	function parseValue() {
		var t = text;
		switch (token) {
			case 'n':
				nextToken();
				return Number(t);
			case 's':
				nextToken();
				return t.charAt(0) === '`' ? t.substr(1, t.length - 2).replace(/\\`/g, '`') : eval(t);
			case '[':
				nextToken();
				return parseArray([]);
			case '{':
				nextToken();
				return parseObject({});
			case 'b':
				return parseBind();
			case 'i':
				nextToken();
				if (CONSTANTS.hasOwnProperty(t)) {
					return CONSTANTS[t];
				} else {
					shift('(');
					return parseConstruction(t, null);
				}
			default:
				error();
		}
	}

	function parseArray(array) {
		if (token !== ']') {
			parseElements(array);
		}
		shift(']');
		return array;
	}

	function parseObject(obj) {
		if (token !== '}') {
			parseElements(obj);
		}
		shift('}');
		return obj;
	}

	function parseElements(obj) {
		var i = 0,
			t; 
		while (true) {
			t = text;
			switch (token) {
				case 'i':
					if (!CONSTANTS.hasOwnProperty(t)) {
						switch (nextToken()) {
							case ':':
								nextToken();
								if (t === '__proto__') {
									_setProto(obj, parseValue()); 
								} else {
									obj[t] = parseValue();
								}
								break;
							case '(':
								nextToken();
								obj[i++] = parseConstruction(t, null);
								break;
							default:
								error();
						}
					} else {
						obj[i++] = CONSTANTS[t];
						nextToken();
					}
					break;
				case 's':
					if (nextToken() === ':') {
						nextToken();
						if (t === '__proto__') {
							_setProto(obj, parseValue()); 
						} else {
							obj[eval(t)] = parseValue();
						}
					} else {
						obj[i++] = eval(t);
					}
					break;
				case 'n':
					obj[i++] = eval(t);
					nextToken();
					break;
				case 'b': 
					obj[i++] = parseBind();
					break;
				case '[': case '{':
					obj[i++] = parseValue();
					break;
				default:
					error();
			}
			if (token === ',') {
				nextToken();
			} else {
				break;
			}
		}
		return obj;
	}

	function parseBind() {
		var id = text;
		nextToken();
		if (token === '=') {
			if (bindings.hasOwnProperty(id)) {
				error("Binding "+ id +" cannot be reassigned");
			}
			nextToken();
			switch (token) {
				case '[':
					nextToken();
					return parseArray(bindings[id] = []);
				case '{':
					nextToken();
					return parseObject(bindings[id] = {});
				case 'i':
					var cons = text;
					nextToken();
					shift('(');
					return bindings[id] = parseConstruction(cons, bindings[id] = sermat.construct(cons, null, null));
				default:
					return bindings[id] = parseValue();
			}
		} else if (bindings.hasOwnProperty(id)) {
			return bindings[id];
		} else {
			var rec = sermat.record(id.substr(1));
			if (rec) {
				return rec.type;
			} else {
				throw new ReferenceError('Sermat.mat: '+ id +' is not defined!');
			}
		}
	}

	function parseConstruction(cons, obj) {
		var args = [];
		if (token !== ')') {
			parseElements(args);
		}
		shift(')');
		return sermat.construct(cons, obj, args);
	}
	
	// parseStart
	nextToken();
	var result = parseValue();
	shift('$');
	return result;
} // materialize