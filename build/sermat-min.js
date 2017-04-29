var Sermat=function __init__(){"use strict";function raise(a,b,c){var d=new Error("Sermat."+a+": "+b);throw c&&(d.data=c),d}function member(a,b,c,d){d=0|d,Object.defineProperty(a,b,{value:c,writable:4&d,configurable:2&d,enumerable:1&d})}function coalesce(a,b){return"undefined"==typeof a?b:a}function identifier(a,b){var c=a.__SERMAT__&&a.__SERMAT__.identifier||a.name||(FUNCTION_ID_RE.exec(a+"")||[])[1];return!c&&b&&raise("identifier","Could not found id for type!",{type:a}),c}function record(a){var b="function"==typeof a?identifier(a,!0):a+"";return this.registry[b]}function register(a,b){"function"!=typeof b.type&&raise("register","No constructor found for type ("+b+")!",{spec:b}),b={type:b.type,identifier:(b.identifier||identifier(b.type,!0)).trim(),serializer:b.serializer,materializer:b.materializer||materializeWithConstructor.bind(this,b.type),global:!!b.global,include:b.include};var c=b.identifier;return["true","false","null","NaN","Infinity",""].forEach(function(a){c===a&&raise("register","Invalid identifier '"+c+"'!",{spec:b})}),a.hasOwnProperty(c)&&raise("register","Construction '"+c+"' is already registered!",{spec:b}),"function"!=typeof b.serializer&&raise("register","Serializer for '"+c+"' is not a function!",{spec:b}),"function"!=typeof b.materializer&&raise("register","Materializer for '"+c+"' is not a function!",{spec:b}),Object.freeze(b),a[c]=b,b.global&&!CONSTRUCTIONS[c]&&(CONSTRUCTIONS[c]=b),b.include&&this.include(b.include),b}function remove(a,b){a.hasOwnProperty(b)||raise("remove","A construction for '"+b+"' has not been registered!",{identifier:b});var c=a[b];return delete a[b],c}function include(a){var b=null;switch(typeof a){case"function":return b=this.record(a),!b&&a.__SERMAT__&&(a.__SERMAT__.type=a,b=this.register(a.__SERMAT__)),b;case"string":return b=this.record(a),!b&&CONSTRUCTIONS[a]&&(b=this.register(CONSTRUCTIONS[a])),b;case"object":if(Array.isArray(a))return a.map(function(a){return this.include(a)}.bind(this));if("function"==typeof a.type)return this.record(a.identifier||a.type)||this.register(a);if(a&&a.__SERMAT__&&a.__SERMAT__.include)return this.include(a.__SERMAT__.include);default:raise("include","Could not include ("+a+")!",{arg:a})}}function exclude(a){switch(typeof a){case"string":return this.record(a)?(this.remove(a),1):0;case"function":return this.exclude(identifier(a));case"object":if(Array.isArray(a)){var b=0;return a.forEach(function(a){b+=this.exclude(a)}.bind(this)),b}default:raise("exclude","Could not exclude ("+a+")!",{arg:a})}}function serializeAsType(a){return new type(a)}function construct(a,b,c){var d=this.record(a);return d?d.materializer.call(this,b,c):void raise("construct","Cannot materialize construction for '"+a+"'",{invalidId:a})}function materialize(source){function nextToken(){var a,b,c=LEXER.exec(input);if(text="",c){for(a=c[0].length,input=input.substr(a),offset+=a,b=1,a=TOKENS.length;b<=a;b++)if(c[b]){token=TOKENS.charAt(b-1),text=c[b];break}return text||(token=c[b]||"$"),token}error('Invalid character "'+input.charAt(0)+'"')}function error(a){a=a||"Parse error",offset-=text.length;var b=0,c=0;throw source.substr(0,offset).replace(RE_EOL,function(a,d){return c=d+a.length,b++,""}),new SyntaxError(a+" at line "+(b+1)+" column "+(offset-c+1)+" (offset "+(offset+1)+")!")}function shift(a){token!==a&&error(),nextToken()}function parseValue(){var t=text;switch(token){case"n":case"s":return nextToken(),eval(t);case"[":return nextToken(),parseArray([]);case"{":return nextToken(),parseObject({});case"b":return parseBind();case"i":return nextToken(),"true false null NaN Infinity".indexOf(t)>=0?eval(t):(shift("("),parseConstruction(t,null));default:error()}}function parseArray(a){if("]"!==token){for(a.push(parseValue());","===token;)nextToken(),a.push(parseValue());shift("]")}else nextToken();return a}function parseObject(a){if("}"!==token){for(parseMember(a);","===token;)nextToken(),parseMember(a);shift("}")}else nextToken();return a}function parseKey(){var t=text;switch(token){case"i":return nextToken(),t;case"s":return nextToken(),eval(t);default:error()}}function parseMember(a){var b=parseKey();return shift(":"),a[b]=parseValue(),a}function parseBind(){var a=text;if(nextToken(),"="!==token)return bindings[a];switch(nextToken(),token){case"[":return nextToken(),parseArray(bindings[a]=[]);case"{":return nextToken(),parseObject(bindings[a]={});case"i":var b=text;return nextToken(),shift("("),parseConstruction(b,bindings[a]=construct(b,null,null));default:return bindings[a]=parseValue()}}function parseConstruction(a,b){var c=[];if(")"!==token){for(c.push(parseValue());","===token;)nextToken(),c.push(parseValue());shift(")")}else nextToken();return construct(a,b,c)}var input=source+"",offset=0,bindings={},construct=this.construct.bind(this),token,text;nextToken();var result=parseValue();return shift("$"),result}function serializeAsProperties(a,b,c){var d,e={},f=Array.isArray(b);for(var g in b)d=b[g],c&&!a.hasOwnProperty(d)||(e[f?d:g]=a[d]);return[e]}function materializeWithConstructor(a,b,c){return b||(b=Object.create(a.prototype),c)?(a.apply(b,c),b):b}function sermat(a,b){return this.mat(this.ser(a,b))}function signature(){for(var a,b,c="",d=0;d<arguments.length;d++)b=arguments[d],a=typeof b,d&&(c+=","),c+="object"===a?b?identifier(b.constructor):"":a;return c}function checkSignature(a,b,c,d){var e=signature.apply(this,[c].concat(d));return b.exec(e)||raise("checkSignature","Wrong arguments for construction of "+a+" ("+e+")!",{id:a,obj:c,args:d}),!0}function serialize_Error(a){return[a.message,a.name||"",a.stack||""]}function materializer_Error(a){return function(b,c){var d=null;return c&&(d=new a(c[0]+""),d.name=c[1]+"",d.stack=c[2]+""),d}}function type(a){this.typeConstructor=a}function Sermat(a){var b={},c={};member(this,"registry",b),member(this,"register",register.bind(this,b)),member(this,"remove",remove.bind(this,b)),a=a||{},member(this,"modifiers",c),member(c,"mode",coalesce(a.mode,BASIC_MODE),5),member(c,"allowUndefined",coalesce(a.allowUndefined,!1),5),member(c,"autoInclude",coalesce(a.autoInclude,!0),5),member(c,"useConstructions",coalesce(a.useConstructions,!0),5),this.include("Boolean Number String Object Array Date RegExp type".split(" "))}var FUNCTION_ID_RE=/^\s*function\s+([\w\$]+)/,ID_REGEXP=/^[a-zA-Z_][a-zA-Z0-9_]*(?:[\.-][a-zA-Z0-9_]+)*$/,BASIC_MODE=0,REPEAT_MODE=1,BINDING_MODE=2,CIRCULAR_MODE=3,serialize=function(){function a(a,d,e){switch(typeof d){case"undefined":if(a.allowUndefined)return"null";raise("serialize","Cannot serialize undefined value!");case"boolean":case"number":return d+"";case"string":return b(d);case"function":case"object":return c(a,d,e)}}function b(a){return JSON.stringify(a)}function c(c,d,e){if(!d)return"null";c.parents.indexOf(d)>=0&&c.mode!==CIRCULAR_MODE&&raise("serialize","Circular reference detected!",{circularReference:d});var f,g,h="";if(c.visited)if(f=c.visited.indexOf(d),f>=0){if(c.mode&BINDING_MODE)return"$"+f;raise("serialize","Repeated reference detected!",{repeatedReference:d})}else f=c.visited.push(d)-1,c.mode&BINDING_MODE&&(h="$"+f+(c.pretty?" = ":"="));c.parents.push(d);var i=e&&e+"\t";if(Array.isArray(d)){for(h+="["+i,f=0,g=d.length;f<g;f++)h+=(f?","+i:"")+a(c,d[f],i);h+=e+"]"}else if(d.constructor!==Object&&c.useConstructions){var j=c.record(d.constructor)||c.autoInclude&&c.include(d.constructor);j||raise("serialize",'Unknown type "'+c.sermat.identifier(d.constructor)+'"!',{unknownType:d});var k=j.serializer.call(c.sermat,d),l=j.identifier;for(h+=(ID_REGEXP.exec(l)?l:b(l))+"("+i,f=0,g=k.length;f<g;f++)h+=(f?","+i:"")+a(c,k[f],i);h+=e+")"}else f=0,h+="{"+i,Object.keys(d).forEach(function(e){h+=(f++?","+i:"")+(ID_REGEXP.exec(e)?e:b(e))+(c.pretty?" : ":":")+a(c,d[e],i)}),h+=e+"}";return c.parents.pop(),h}return function(b,c){c=c||this.modifiers;var d=coalesce(c.mode,this.modifiers.mode),e=!!coalesce(c.pretty,this.modifiers.pretty);return a({visited:d===REPEAT_MODE?null:[],parents:[],sermat:this,record:this.record.bind(this),include:this.include.bind(this),mode:d,allowUndefined:coalesce(c.allowUndefined,this.modifiers.allowUndefined),autoInclude:coalesce(c.autoInclude,this.modifiers.autoInclude),useConstructions:coalesce(c.useConstructions,this.modifiers.useConstructions),pretty:e},b,e?"\n":"")}}(),RE_IGNORABLES=/(?:\s|\/\*(?:[\0-\)+-.0-\uFFFF]*|\*+[\0-\)+-.0-\uFFFF])*\*+\/)*/,RE_NUM=/[+-]?(?:Infinity|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/,RE_STR=/\"(?:[^\\\"]|\\[^\n])*\"|``/,RE_ID=/[a-zA-Z_](?:[.-]?[a-zA-Z0-9_]+)*/,RE_BIND=/\$[a-zA-Z0-9_]+(?:[.-]?[a-zA-Z0-9_]+)*/,RE_SYMBOLS=/[\,[\]{:}(=)]/,RE_EOL=/\r\n?|\n/g,LEXER=new RegExp("^"+RE_IGNORABLES.source+"(?:("+RE_NUM.source+")|("+RE_STR.source+")|("+RE_ID.source+")|("+RE_BIND.source+")|("+RE_SYMBOLS.source+")|$)"),TOKENS="nsib",CONSTRUCTIONS={};[[Boolean,function(a){return[!!a]},function(a,b){return b&&new Boolean(b[0])}],[Number,function(a){return[+a]},function(a,b){return b&&new Number(b[0])}],[String,function(a){return[a+""]},function(a,b){return b&&new String(b[0])}],[Object,function(a){return[a]},function(a,b){return b&&Object.apply(null,b)}],[Array,function(a){return a},function(a,b){return a=a||[],b?a.concat(b):a}],[RegExp,function(a){var b=/^\/(.+?)\/([a-z]*)$/.exec(a+"");return b||raise("serialize_RegExp","Cannot serialize RegExp "+a+"!",{value:a}),[b[1],b[2]]},function(a,b){return b&&checkSignature("RegExp",/^(,string){1,2}$/,a,b)&&new RegExp(b[0],b[1]||"")}],[Date,function(a){return[a.getUTCFullYear(),a.getUTCMonth(),a.getUTCDate(),a.getUTCHours(),a.getUTCMinutes(),a.getUTCSeconds(),a.getUTCMilliseconds()]},function(a,b){return b&&checkSignature("Date",/^(,number){1,7}$/,a,b)&&new Date(Date.UTC(0|b[0],+b[1]||1,0|b[2],0|b[3],0|b[4],0|b[5],0|b[6]))}],[Function,function(a){var b=/^function\s*[\w$]*\s*\(((\s*[$\w]+\s*,?)*)\)\s*\{([\0-\uFFFF]*)\}$/.exec(a+"");return b||raise("serialize_Function","Could not serialize Function "+a+"!",{value:a}),b[1].split(/\s*,\s*/).concat([b[3]])},function(a,b){return b&&checkSignature("Function",/^(,string)+$/,a,b)&&Function.apply(null,b)}],[Error,serialize_Error,materializer_Error(Error)],[EvalError,serialize_Error,materializer_Error(EvalError)],[RangeError,serialize_Error,materializer_Error(RangeError)],[ReferenceError,serialize_Error,materializer_Error(ReferenceError)],[SyntaxError,serialize_Error,materializer_Error(SyntaxError)],[TypeError,serialize_Error,materializer_Error(TypeError)],[URIError,serialize_Error,materializer_Error(URIError)]].forEach(function(a){var b=identifier(a[0],!0);member(CONSTRUCTIONS,b,Object.freeze({identifier:b,type:a[0],serializer:a[1],materializer:a[2]}),1)}),member(CONSTRUCTIONS,"type",type.__SERMAT__=Object.freeze({identifier:"type",type:type,serializer:function(a){var b=this.record(a.typeConstructor);return b?[b.identifier]:void raise("serialize_type",'Unknown type "'+identifier(a.typeConstructor)+'"!',{type:a.typeConstructor})},materializer:function(a,b){if(!b)return null;if(checkSignature("type",/^,string$/,a,b)){var c=this.record(b[0]);if(c)return c.type}raise("materialize_type","Cannot materialize construction for type("+b+")!",{args:b})}}),1);var __members__={BASIC_MODE:BASIC_MODE,REPEAT_MODE:REPEAT_MODE,BINDING_MODE:BINDING_MODE,CIRCULAR_MODE:CIRCULAR_MODE,CONSTRUCTIONS:CONSTRUCTIONS,identifier:identifier,record:record,include:include,exclude:exclude,serialize:serialize,ser:serialize,serializeAsProperties:serializeAsProperties,serializeAsType:serializeAsType,signature:signature,checkSignature:checkSignature,materialize:materialize,mat:materialize,construct:construct,materializeWithConstructor:materializeWithConstructor,sermat:sermat};Object.keys(__members__).forEach(function(a){var b=__members__[a];member(Sermat.prototype,a,b)});var __SINGLETON__=new Sermat;return __SINGLETON__.include(["Date","RegExp"]),Object.keys(__members__).forEach(function(a){var b=__members__[a];member(Sermat,a,"function"==typeof b?b.bind(__SINGLETON__):b)}),["registry","register","remove","modifiers"].forEach(function(a){member(Sermat,a,__SINGLETON__[a])}),member(Sermat,"__package__","sermat"),member(Sermat,"__name__","Sermat"),member(Sermat,"__init__",__init__,4),member(Sermat,"__dependencies__",[],4),Sermat}();
//# sourceMappingURL=sermat-min.js.map