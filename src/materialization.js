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
	RE_STR = /\"(?:[^\\\"]|\\[^\n])*\"|``/,
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
	CONSTANTS = { undefined: void 0, true: true, false: false, null: null, 
		NaN: NaN, Infinity: Infinity };
	
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
			(offset - lineStart + 1) +" (offset "+ (offset + 1) +")!");
	}

	function shift(expected) {
		if (token !== expected) {
			error();
		}
		nextToken();
	}

	function parseValue() {
		var t = text;
		switch (token) {
			case 'n': case 's':
				nextToken();
				return eval(t);
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
			array.push(parseValue());
			while (token === ',') {
				nextToken();
				array.push(parseValue());
			}
			shift(']');
		} else {
			nextToken();
		}
		return array;
	}

	function parseObject(obj) {
		if (token !== '}') {
			parseMember(obj);
			while (token === ',') {
				nextToken();
				parseMember(obj);
			}
			shift('}');
		} else {
			nextToken();
		}
		return obj;
	}

	function parseKey() {
		var t = text;
		switch (token) {
			case 'i': 
				nextToken();
				return t;
			case 's':
				nextToken();
				return eval(t);
			default: 
				error();
		}
	}

	function parseMember(obj) {
		var k = parseKey();
		shift(':');
		if (k === '__proto__') {
			_setProto(obj, parseValue());
		} else {
			obj[k] = parseValue();
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
					return parseConstruction(cons, bindings[id] = sermat.construct(cons, null, null));
				default:
					return bindings[id] = parseValue();
			}
		} else {
			return bindings[id];
		}
	}

	function parseConstruction(cons, obj) {
		var args = [];
		if (token !== ')') {
			args.push(parseValue());
			while (token === ',') {
				nextToken();
				args.push(parseValue());
			}
			shift(')');
		} else {
			nextToken();
		}
		return sermat.construct(cons, obj, args);
	}
	
	// parseStart
	nextToken();
	var result = parseValue();
	shift('$');
	return result;
} // materialize