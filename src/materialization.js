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
		raise("Cannot materialize construction for '"+ id +"'", { invalidId: id, context: "Sermat.construct" });
	}
}

var EOL_RE = /\r\n?|\n/g,
/** The lexer is implemented with a big regular expression that combines all the regular 
	expressions of Sermat's lexemes. The function `String.replace` is used with a callback that 
	performs the actual parsing.
*/
	LEXER_RE = new RegExp([
		/\s+/, // whitespace (1)
		/\/\*(?:[\0-)+-.0-\uFFFF]*|\*+[\0-)+-.0-\uFFFF])*\*+\//, // block comment (2)
		/[\$A-Z_a-z][\$\-\.\w]*/, // identifier (3)
		/[+-]Infinity|[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/, // numerals (4)
		/\"(?:[^\\\"]|\\[\0-\uFFFF])*\"/, // string literals (5)
		/[\[\]\{\}\(\):,=]/, // symbols (6)
		/.|$/ // error (7)
	].map(function (re) {
		re = re +'';
		return '('+ re.substr(1, re.length - 2) +')';
	}).join('|'), 'g'),
/** The parse table was calculated using [JS/CC](http://jscc.phorward-software.com/jscc/jscc.html).
	The generated parser is not used because of two reasons. First, the lexer generated by JS/CC
	is always limited to characters from `\x00` and `\xFF`. Second, because the way it is done here 
	results in less code, even after minimization.
*/
	PARSE_TABLE = {
		"0|1":10,"0|13":2,"0|14":4,"0|15":5,"0|16":6,"0|17":7,"0|18":8,"0|19":9,"0|2":11,"0|20":1,"0|3":3,"0|4":13,"0|6":12,"10|11":-10,"10|22":-10,"10|5":-10,"10|7":-10,"10|9":-10,"11|11":-11,"11|22":-11,"11|5":-11,"11|7":-11,"11|9":-11,"12|2":-13,"12|3":-13,"12|7":-13,"13|1":-19,"13|2":-19,"13|3":-19,"13|4":-19,"13|5":-19,"13|6":-19,"14|1":-23,"14|2":-23,"14|3":-23,"14|4":-23,"14|6":-23,"14|9":-23,"15|2":30,"15|3":33,"15|4":32,"15|6":31,"16|10":34,"17|11":-3,"17|22":-3,"17|5":-3,"17|7":-3,"17|9":-3,"18|10":-16,"19|10":-17,"1|22":0,"20|2":19,"20|21":35,"20|3":18,"21|11":-4,"21|22":-4,"21|5":-4,"21|7":-4,"21|9":-4,"22|11":-20,"22|5":-20,"23|11":-5,"23|22":-5,"23|5":-5,"23|7":-5,"23|9":-5,"24|1":10,"24|13":2,"24|14":4,"24|15":5,"24|16":6,"24|17":7,"24|18":8,"24|19":9,"24|2":11,"24|20":36,"24|3":3,"24|4":13,"24|6":12,"25|11":-6,"25|22":-6,"25|5":-6,"25|7":-6,"25|9":-6,"26|11":-24,"26|9":-24,"27|11":-7,"27|22":-7,"27|5":-7,"27|7":-7,"27|9":-7,"28|1":10,"28|13":2,"28|14":4,"28|15":5,"28|16":6,"28|17":7,"28|18":8,"28|19":9,"28|2":11,"28|20":37,"28|3":3,"28|4":13,"28|6":12,"29|11":-8,"29|22":-8,"29|5":-8,"29|7":-8,"29|9":-8,"2|11":-1,"2|22":-1,"2|5":-1,"2|7":-1,"2|9":-1,"30|11":-2,"30|22":-2,"30|5":-2,"30|7":-2,"30|9":-2,"31|2":-12,"31|3":-12,"31|7":-12,"32|1":-18,"32|2":-18,"32|3":-18,"32|4":-18,"32|5":-18,"32|6":-18,"33|8":38,"34|1":10,"34|13":2,"34|14":4,"34|15":5,"34|16":6,"34|17":7,"34|18":8,"34|19":9,"34|2":11,"34|20":39,"34|3":3,"34|4":13,"34|6":12,"35|10":40,"36|11":-21,"36|5":-21,"37|11":-25,"37|9":-25,"38|1":-22,"38|2":-22,"38|3":-22,"38|4":-22,"38|6":-22,"38|9":-22,"39|11":-14,"39|7":-14,"3|11":-9,"3|12":15,"3|22":-9,"3|5":-9,"3|7":-9,"3|8":14,"3|9":-9,"40|1":10,"40|13":2,"40|14":4,"40|15":5,"40|16":6,"40|17":7,"40|18":8,"40|19":9,"40|2":11,"40|20":41,"40|3":3,"40|4":13,"40|6":12,"41|11":-15,"41|7":-15,"4|2":19,"4|21":16,"4|3":18,"4|7":17,"5|11":20,"5|7":21,"6|1":10,"6|13":2,"6|14":4,"6|15":5,"6|16":6,"6|17":7,"6|18":8,"6|19":9,"6|2":11,"6|20":22,"6|3":3,"6|4":13,"6|5":23,"6|6":12,"7|11":24,"7|5":25,"8|1":10,"8|13":2,"8|14":4,"8|15":5,"8|16":6,"8|17":7,"8|18":8,"8|19":9,"8|2":11,"8|20":26,"8|3":3,"8|4":13,"8|6":12,"8|9":27,"9|11":28,"9|9":29
	},
/** Parsing a Sermat string literal uses `eval` after escaping all ends of lines.
*/
	parseString = (function parseString(regexp, replacer, lit) {
		return eval(lit.replace(regexp, replacer));
	}).bind(null, EOL_RE, function (match) {
		return match === '\n' ? '\\n' : match === '\r' ? '\\r' : '\\r\\n';
	});

function materialize(text) {
	/** Sermat's parser is LALR. It handles two stacks: the `stateStack` one for parsing states 
		and the `valueStack` for intermediate values. Bindings are used to resolve all values that
		appear as words (`true`, `null`, etc.).
	*/
	var valueStack = new Array(50), 
		stateStack = new Array(50), 
		stackPointer = 0,
		construct = this.construct.bind(this),
		bindings = { 'true': true, 'false': false, 'null': null, 'NaN': NaN, 'Infinity': Infinity },
		offset, result;
	stateStack[0] = 0;

	/** Unbound identifiers showing in the text always raise an error. Also, values cannot be rebound.
	*/
	function getBind(id) {
		var value = bindings[id];
		if (typeof value === 'undefined') {
			parseError("'"+ id +"' is not bound", { unboundId: id });	
		}
		return value;
	}

	function setBind(id, value) {
		if (id.charAt(0) != '$') {
			parseError("Invalid binding identifier '"+ id +"'", { invalidId: id });
		}
		if (bindings.hasOwnProperty(id)) {
			parseError("'"+ id +"' is already bound", { boundId: id });
		}
		return (bindings[id] = value);
	}
	
	/** The parser does not keep track of ends of lines. These are calculated when an error must
		be raised.
	*/
	function parseError(message, data) {
		data = data || {};
		data.offset = offset;
		data.context = "Sermat.materialize";
		var line = 0, lineStart = 0;
		text.substr(0, offset).replace(EOL_RE, function (match, pos) {
			lineStart = pos + match.length;
			line++;
			return '';
		});
		data.line = line + 1;
		data.column = offset - lineStart;
		raise(message +" at line "+ data.line +" column "+ data.column +" (offset "+ offset +")!", data);
	}

	/** Being an LALR parser, the _semantics_ is expressed in functions that are called when a reduce 
		actions is made. The following matches with the language's grammar.
	*/
	var ACTIONS = (function () { 
		function return$1($1) {
			return $1;
		}
		function cons($1, $2) {
			var obj = construct($1[1], $1[2], $1[3]);
			if ($1[2] && obj !== $1[2]) {
				parseError("Object initialization for "+ $1[1] +" failed", { oldValue: $1[2], newValue: obj });
			}
			return $1[0] ? this.setBind($1[0], obj) : obj;
		}
		return [null, // ACCEPT
		// `value : atom ;`
			[20, 1, return$1],
		// `value : 'id' '=' 'str' ;`
			[20, 3, function ($1,$2,$3) {
				return setBind($1, $3);
			}],
		// `value : obj0 '}' ;`
			[20, 2, return$1],
		// `value : obj1 '}' ;`
			[20, 2, return$1],
		// `value : array0 ']' ;`
			[20, 2, return$1],
		// `value : array1 ']' ;`
			[20, 2, return$1],
		// `value : cons0 ')' ;`
			[20, 2, cons],
		// `value : cons1 ')' ;`
			[20, 2, cons],
		// `atom : 'id' ;`
			[13, 1, function ($1) {
				return getBind($1);
			}],
		// `atom : 'num' ;`
			[13, 1, Number],
		// `atom : 'str' ;`
			[13, 1, parseString],
		// `obj0 : 'id' '=' '{' ;`
			[14, 3, function ($1,$2,$3) {
				return setBind($1, {});
			}],
		// `obj0 : '{' ;`
			[14, 1, function ($1) {
				return {};
			}],
		// `obj1 : obj0 key ':' value ;`
			[15, 4, function ($1,$2,$3,$4) {
				$1[$2] = $4;
				return $1;
			}],
		// `obj1 : obj1 ',' key ':' value ;`
			[15, 5, function ($1,$2,$3,$4,$5) {
				$1[$3] = $5;
				return $1;
			}],
		// `key : 'id' ;`
			[21, 1, return$1],
		// `key : 'str' ;`
			[21, 1, parseString],
		// `array0 : 'id' '=' '[' ;`
			[16, 3, function ($1,$2,$3) {
				return setBind($1, []);
			}],
		// `array0 : '[' ;`
			[16, 1, function ($1) {
				return [];
			}],
		// `array1 : array0 value ;`
			[17, 2, function ($1,$2) { 
				$1.push($2);
				return $1;
			}],
		// `array1 : array1 ',' value ;`
			[17, 3, function ($1,$2,$3) { 
				$1.push($3);
				return $1;
			}],
		// `cons0 : 'id' '=' 'id' '(' ;`
			[18, 4, function ($1,$2,$3,$4) {
				var obj = construct($3, null, null);
				return obj ? [null, $3, setBind($1, obj), []] : [$1, $3, obj, []];
			}],
		// `cons0 : 'id' '(' ;`
			[18, 2, function ($1,$2,$3) {
				return [null, $1, null, []];
			}],
		// `cons1 : cons0 value ;`
			[19, 2, function ($1,$2) {
				return ($1[3].push($2), $1);
			}],
		// `cons1 : cons1 ',' value ;`
			[19, 3, function ($1,$2,$3) {
				return ($1[3].push($3), $1);
			}]
		];
	})();
	
	/** The actual parser is implemented with the `String.replace` method with a regular expression
		and a function callback. The regular expression deals with all language's lexemes. The 
		function callback handles the parser's stacks.
	*/
	text.replace(LEXER_RE, function (match, $wsp, $comm, $id, $num, $str, $sym, $err, _offset) {
		if ($wsp || $comm) {
			return ''; // Ignore whitespace and comments.
		}
		offset = _offset;
		var symbol = $num ? 1 : $str ? 2 : $id ? 3 : $sym ? '[]{}():,='.indexOf($sym) + 4 : $err ? 23 /* ERROR */ : 22 /* EOF */,
			parseAction, action;
		while (true) {
			parseAction = PARSE_TABLE[stateStack[stackPointer] +'|'+ symbol];
			if (parseAction < 0) {
				action = ACTIONS[-parseAction];
				if (action) { // reduce
					stackPointer += 1 - action[1];
					valueStack[stackPointer] = action[2].apply(null, valueStack.slice(stackPointer, stackPointer + action[1]));
					stateStack[stackPointer] = PARSE_TABLE[stateStack[stackPointer - 1] +'|'+ action[0]]; // GOTO action.
					continue;
				}
			} else if (parseAction > 0) { // shift
				stateStack[++stackPointer] = parseAction;
				valueStack[stackPointer] = match;
				return '';
			} else if (parseAction == 0) { // accept.
				result = valueStack[stackPointer];
				return '';
			}
			parseError("Parse error");
		}
	});
	return result;
}