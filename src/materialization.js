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

var RE_IGNORABLES = /(?:\s|\/\*(?:[^*]*|\n|\*+[^\/])*\*+\/)*/,
	RE_NUM = /[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[+-]Infinity/,
	RE_STR = /\"(?:[^\\\"\r\n]|\\[^\r\n])*\"/,
	RE_STR2 = /(?:`(?:[^`]|[\r\n])*`)+/,
	RE_CONS = /(?:true|false|null|undefined|Infinity|NaN)\b/,
	RE_ID = /[a-zA-Z_]+(?:[.-]?[a-zA-Z0-9_])*/,
	RE_BIND = /\$(?:[.-]?[a-zA-Z0-9_])*/,
	RE_SYMBOLS = /[,:[\]{}()=]/,
	RE_EOL = /\r\n?|\n/g,
	LEXER = new RegExp('^'+ RE_IGNORABLES.source +'(?:'+
		'('+ RE_NUM.source 
		+')|('+ RE_STR.source
		+')|('+ RE_STR2.source
		+')|('+ RE_CONS.source
		+')|('+ RE_ID.source
		+')|('+ RE_BIND.source
		+')|('+ RE_SYMBOLS.source 
		+')|$)'),
	LEX_EOI = 0,
	LEX_NUM = 1,
	LEX_STR = 2,
	LEX_STR2 = 3,
	LEX_CONS = 4,
	LEX_ID = 5,
	LEX_BIND = 6,
	// SYMBOLS
	LEX_COMMA    = 7,
	LEX_COLON    = 8,
	LEX_OBRACKET = 9,
	LEX_CBRACKET = 10,
	LEX_OBRACE   = 11,
	LEX_CBRACE   = 12,
	LEX_OPAREN   = 13,
	LEX_CPAREN   = 14,
	LEX_EQUAL    = 15;
	
function materialize(source, modifiers) {
	var input = source,
		offset = 0,
		token = -1, text = '',
		bindings = modifiers && modifiers.bindings || {},
		sermat = this;

	function nextToken() {
		var tokens, len, i, chr;
		if (tokens = LEXER.exec(input)) {
			//console.log(tokens);//LOG Uncomment for debugging.
			len = tokens[0].length;
			input = input.substr(len);
			offset += len;
			text = '';
			for (i = 1, len = tokens.length - 1; i < len; i++) {
				if (tokens[i]) {
					text = tokens[i];
					return token = i;
				}
			} 
			text = tokens[i];
			token = ',:[]{}()='.indexOf(text);
			return token = token < 0 ? LEX_EOI : token + LEX_COMMA;
		}
		error('Invalid character "'+ input.charAt(0) +'"');
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
			case LEX_NUM:
				nextToken();
				return eval(t);
			case LEX_STR:
				nextToken();
				return eval(t);
			case LEX_STR2:
				nextToken();
				return t.substr(1, t.length - 2).replace(/``/g, '`');
			case LEX_OBRACKET:
				nextToken();
				return parseArray([]);
			case LEX_OBRACE:
				nextToken();
				return parseObject({});
			case LEX_BIND:
				return parseBind();
			case LEX_CONS:
				nextToken();
				return eval(t);
			case LEX_ID:
				nextToken();
				shift(LEX_OPAREN);
				return parseConstruction(t, null);
			default:
				error("Expected value but got `"+ t +"` (token="+ token +")!");
		}
	}

	function parseArray(array) {
		if (token !== LEX_CBRACKET) {
			parseElements(array);
		}
		shift(LEX_CBRACKET);
		return array;
	}

	function parseObject(obj) {
		if (token !== LEX_CBRACE) {
			parseElements(obj);
		}
		shift(LEX_CBRACE);
		return obj;
	}

	function parseElements(obj) {
		var i = 0,
			t; 
		while (true) {
			t = text;
			switch (token) {
				case LEX_CONS:
					obj[i++] = eval(t);
					nextToken();
					break;
				case LEX_ID:
					switch (nextToken()) {
						case LEX_COLON:
							nextToken();
							if (t === '__proto__') {
								_setProto(obj, parseValue()); 
							} else {
								obj[t] = parseValue();
							}
							break;
						case LEX_OPAREN:
							nextToken();
							obj[i++] = parseConstruction(t, null);
							break;
						default:
							error();
					}
					break;
				case LEX_STR:
					if (nextToken() === LEX_COLON) {
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
				case LEX_NUM:
					obj[i++] = eval(t);
					nextToken();
					break;
				case LEX_BIND: 
					obj[i++] = parseBind();
					break;
				case LEX_STR2:
				case LEX_OBRACKET:
				case LEX_OBRACE:
					obj[i++] = parseValue();
					break;
				default:
					error("Expected element but got `"+ t +"` (token="+ token +", input='"+ input +"')!"); //FIXME
			}
			if (token === LEX_COMMA) {
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
		if (token === LEX_EQUAL) {
			if (bindings.hasOwnProperty(id)) {
				error("Binding "+ id +" cannot be reassigned");
			}
			nextToken();
			switch (token) {
				case LEX_OBRACKET:
					nextToken();
					return parseArray(bindings[id] = []);
				case LEX_OBRACE:
					nextToken();
					return parseObject(bindings[id] = {});
				case LEX_ID:
					var cons = text;
					nextToken();
					shift(LEX_OPAREN);
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
		if (token !== LEX_CPAREN) {
			parseElements(args);
		}
		shift(LEX_CPAREN);
		return sermat.construct(cons, obj, args);
	}
	
	// parseStart
	nextToken();
	var result = parseValue();
	shift(LEX_EOI);
	return result;
} // materialize