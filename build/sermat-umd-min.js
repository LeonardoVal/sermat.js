(function(a){"use strict";"function"==typeof define&&define.amd?define([],a):"object"==typeof exports&&module.exports?module.exports=a():this.Sermat=a()}).call(this,function __init__(){"use strict";function member(a,b,c,d){d=0|d,Object.defineProperty(a,b,{value:c,writable:4&d,configurable:2&d,enumerable:1&d})}function _modifier(a,b,c){return a&&a.hasOwnProperty(b)?a[b]:c}function identifier(a,b){var c=a.__SERMAT__&&a.__SERMAT__.identifier||a.name||(FUNCTION_ID_RE.exec(a+"")||[])[1];if(!c&&b)throw new Error("Sermat.identifier: Could not found id for type "+a+"!");return c}function record(a){var b="function"==typeof a?identifier(a,!0):a+"";return this.registry[b]}function register(a,b){if("function"!=typeof b.type)throw new Error("Sermat.register: No constructor found for type ("+b+")!");b={type:b.type,identifier:(b.identifier||identifier(b.type,!0)).trim(),serializer:b.serializer||serializeWithConstructor.bind(this,b.type),materializer:b.materializer||materializeWithConstructor.bind(this,b.type),global:!!b.global,include:b.include};var c=b.identifier;if(INVALID_ID_RE.test(c))throw new Error("Sermat.register: Invalid identifier '"+c+"'!");if(a.hasOwnProperty(c))throw new Error("Sermat.register: Construction '"+c+"' is already registered!");if("function"!=typeof b.serializer)throw new Error("Sermat.register: Serializer for '"+c+"' is not a function!");if("function"!=typeof b.materializer)throw new Error("Sermat.register: Materializer for '"+c+"' is not a function!");return Object.freeze(b),a[c]=b,b.global&&!CONSTRUCTIONS[c]&&(CONSTRUCTIONS[c]=b),b.include&&this.include(b.include),b}function remove(a,b){if(!a.hasOwnProperty(b))throw new Error("Sermat.remove: A construction for '"+b+"' has not been registered!");var c=a[b];return delete a[b],c}function include(a){var b=null;switch(typeof a){case"function":return b=this.record(a),!b&&a.__SERMAT__&&(b=a.__SERMAT__,a.hasOwnProperty("__SERMAT__")||b.inheritable||(b=Object.assign({},b),b.identifier=this.identifier(a,!0)),b.type=a,b=this.register(b)),b;case"string":return b=this.record(a),!b&&CONSTRUCTIONS[a]&&(b=this.register(CONSTRUCTIONS[a])),b;case"object":if(Array.isArray(a))return a.map(function(a){return this.include(a)}.bind(this));if("function"==typeof a.type)return this.record(a.identifier||a.type)||this.register(a);if(a&&a.__SERMAT__&&a.__SERMAT__.include)return this.include(a.__SERMAT__.include);default:throw new Error("Sermat.include: Could not include ("+a+")!")}}function exclude(a){switch(typeof a){case"string":return this.record(a)?(this.remove(a),1):0;case"function":return this.exclude(identifier(a));case"object":if(Array.isArray(a)){var b=0;return a.forEach(function(a){b+=this.exclude(a)}.bind(this)),b}default:throw new Error("Sermat.exclude: Could not exclude ("+a+")!")}}function serialize(a,b){function c(a,b){switch(typeof a){case"undefined":return d();case"boolean":case"number":return a+"";case"string":return e(a);case"function":return f(a,b);case"object":return g(a,b)}}function d(){switch(typeof m){case"undefined":return"undefined";case"function":if(m.prototype instanceof Error)throw new m("Sermat.ser: Cannot serialize undefined value!");var a=m.call(null);return"undefined"==typeof a?"undefined":c(a);default:return c(m)}}function e(a){return JSON.stringify(a)}function f(a,b){var c=j.identifier(a,!1)?j.record(a):null;return c?"$"+c.identifier:g(a,b)}function g(a,b){if(!a)return"null";if(r.indexOf(a)>=0&&k!==CIRCULAR_MODE)throw new TypeError("Sermat.ser: Circular reference detected!");var c,d="";if(q){if(c=q.indexOf(a),c>=0){if(k&BINDING_MODE)return"$"+c;throw new TypeError("Sermat.ser: Repeated reference detected!")}c=q.push(a)-1,k&BINDING_MODE&&(d="$"+c+t)}r.push(a);var f=b&&b+"\t";if(_isArray(a))d+=h(a,b,f);else{var l=_getProto(a),m="";if(a.constructor===Object||!o||p&&!l.hasOwnProperty("constructor"))m=i(a,b,f),p&&!l.hasOwnProperty("constructor")&&(m+=(m?","+f:"")+"__proto__"+s+g(l,b)),d+="{"+f+m+b+"}";else{var u=j.record(a.constructor)||n&&j.include(a.constructor);if(!u)throw new TypeError('Sermat.ser: Unknown type "'+j.identifier(a.constructor)+'"!');var v=u.serializer.call(j,a),w=u.identifier;d+=Array.isArray(v)?(ID_REGEXP.exec(w)?w:e(w))+"("+f+i(v,b,f)+b+")":g(v,b)}}return r.pop(),d}function h(a,b,c){return"["+c+i(a,b,c)+b+"]"}function i(a,b,f){var g="",h="",i=0,j=","+f;return Object.keys(a).forEach(function(b){if(g+=h,(0|b)-b!==0)g+=(ID_REGEXP.exec(b)?b:e(b))+s;else for(;b-i>0;i++)g+=d()+j;g+=c(a[b],f),h=j,i++}),g}var j=this,k=_modifier(b,"mode",this.modifiers.mode),l=_modifier(b,"pretty",this.modifiers.pretty),m=_modifier(b,"onUndefined",this.modifiers.onUndefined),n=_modifier(b,"autoInclude",this.modifiers.autoInclude),o=_modifier(b,"useConstructions",this.modifiers.useConstructions),p=_modifier(b,"climbPrototypes",this.modifiers.climbPrototypes),q=k===REPEAT_MODE?null:[],r=[],s=l?" : ":":",t=l?" = ":"=";return c(a,l?"\n":"")}function construct(a,b,c){var d=this.record(a);if(d)return d.materializer.call(this,b,c);throw new SyntaxError("Sermat.construct: Cannot materialize type '"+a+"'")}function materialize(source,modifiers){function nextToken(){var a,b,c;if(a=LEXER.exec(input)){for(b=a[0].length,input=input.substr(b),offset+=b,text="",c=1,b=a.length-1;c<b;c++)if(a[c])return text=a[c],token=c;return text=a[c],token=",:[]{}()=".indexOf(text),token=token<0?LEX_EOI:token+LEX_COMMA}error('Invalid character "'+input.charAt(0)+'"')}function error(a){a=a||"Parse error",offset-=text.length;var b=0,c=0;throw source.substr(0,offset).replace(RE_EOL,function(a,d){return c=d+a.length,b++,""}),new SyntaxError("Sermat.mat: "+a+" at line "+(b+1)+" column "+(offset-c)+" (offset "+(offset+1)+")!")}function shift(a){token!==a&&error("Parse error. Expected <"+a+"> but got <"+(text||token)+">"),nextToken()}function parseValue(){var t=text;switch(token){case LEX_NUM:return nextToken(),eval(t);case LEX_STR:return nextToken(),eval(t);case LEX_STR2:return nextToken(),t.substr(1,t.length-2).replace(/``/g,"`");case LEX_OBRACKET:return nextToken(),parseArray([]);case LEX_OBRACE:return nextToken(),parseObject({});case LEX_BIND:return parseBind();case LEX_CONS:return nextToken(),eval(t);case LEX_ID:return nextToken(),shift(LEX_OPAREN),parseConstruction(t,null);default:error("Expected value but got `"+t+"` (token="+token+")!")}}function parseArray(a){return token!==LEX_CBRACKET&&parseElements(a),shift(LEX_CBRACKET),a}function parseObject(a){return token!==LEX_CBRACE&&parseElements(a),shift(LEX_CBRACE),a}function parseElements(obj){for(var i=0,t;;){switch(t=text,token){case LEX_CONS:obj[i++]=eval(t),nextToken();break;case LEX_ID:switch(nextToken()){case LEX_COLON:nextToken(),"__proto__"===t?_setProto(obj,parseValue()):obj[t]=parseValue();break;case LEX_OPAREN:nextToken(),obj[i++]=parseConstruction(t,null);break;default:error()}break;case LEX_STR:nextToken()===LEX_COLON?(nextToken(),"__proto__"===t?_setProto(obj,parseValue()):obj[eval(t)]=parseValue()):obj[i++]=eval(t);break;case LEX_NUM:obj[i++]=eval(t),nextToken();break;case LEX_BIND:obj[i++]=parseBind();break;case LEX_STR2:case LEX_OBRACKET:case LEX_OBRACE:obj[i++]=parseValue();break;default:error("Expected element but got `"+t+"` (token="+token+", input='"+input+"')!")}if(token!==LEX_COMMA)break;nextToken()}return obj}function parseBind(){var a=text;if(nextToken(),token!==LEX_EQUAL){if(bindings.hasOwnProperty(a))return bindings[a];var b=sermat.record(a.substr(1));if(b)return b.type;throw new ReferenceError("Sermat.mat: "+a+" is not defined!")}switch(bindings.hasOwnProperty(a)&&error("Binding "+a+" cannot be reassigned"),nextToken(),token){case LEX_OBRACKET:return nextToken(),parseArray(bindings[a]=[]);case LEX_OBRACE:return nextToken(),parseObject(bindings[a]={});case LEX_ID:var c=text;return nextToken(),shift(LEX_OPAREN),bindings[a]=parseConstruction(c,bindings[a]=sermat.construct(c,null,null));default:return bindings[a]=parseValue()}}function parseConstruction(a,b){var c=[];return token!==LEX_CPAREN&&parseElements(c),shift(LEX_CPAREN),sermat.construct(a,b,c)}var input=source,offset=0,token=-1,text="",bindings=modifiers&&modifiers.bindings||{},sermat=this;nextToken();var result=parseValue();return shift(LEX_EOI),result}function serializeAsProperties(a,b,c){var d,e={},f=Array.isArray(b);for(var g in b)d=b[g],c&&!a.hasOwnProperty(d)||(e[f?d:g]=a[d]);return[e]}function serializeWithConstructor(a,b){var c=a+"",d=/^function\s*[\w$]*\s*\(([^)]*)\)\s*\{/.exec(c)||/^\(([^)]*)\)\s*=>/.exec(c);if(d&&d[1])return d[1].split(/\s*,\s*/).map(function(a){return b[a]});throw new TypeError("Cannot infer a serialization from constructor ("+a+")!")}function materializeWithConstructor(a,b,c){return b||(b=Object.create(a.prototype),c)?(a.apply(b,c),b):b}function sermat(a,b){return this.mat(this.ser(a,b))}function clone(a,b){function c(a){f.push(a);var b,c=Array.isArray(a);if(c||a.constructor===Object||!h){b=c?[]:{},g.push(b);for(var j in a)b[j]=d(a[j])}else{var k=e.record(a.constructor)||i&&e.include(a.constructor);if(!k)throw new TypeError('Sermat.clone: Unknown type "'+e.identifier(a.constructor)+'"!');b=k.materializer.call(e,null,null),g.push(b),k.materializer.call(e,b,k.serializer.call(e,a))}return b}function d(a){switch(typeof a){case"undefined":case"boolean":case"number":case"string":case"function":return a;case"object":if(null===a)return null;var b=f.indexOf(a);return b>=0?g[b]:c(a);default:throw new Error("Unsupported type "+typeof a+"!")}}var e=this,f=[],g=[],h=_modifier(b,"useConstructions",this.modifiers.useConstructions),i=_modifier(b,"autoInclude",this.modifiers.autoInclude);return d(a)}function hashCode(a,b){function c(a){var b=1,k=f.push(a);if(g.push(0),!Array.isArray(a)&&a.constructor!==Object&&h){var l=e.record(a.constructor)||i&&e.include(a.constructor);if(!l)throw new TypeError('Sermat.hashCode: Unknown type "'+e.identifier(a.constructor)+'"!');return c(l.serializer.call(e,a))}if(j){var m=_getProto(a);m.hasOwnProperty("constructor")||(b=c(m))}var n=[];for(var o in a)n.push(d(o)^d(a[o]));return n.sort(function(a,b){return a-b}).forEach(function(a){b=31*b+a|0}),g[k]=b,b}function d(a){switch(typeof a){case"undefined":case"boolean":case"number":return a>>>0;case"string":for(var b=5381,d=0,e=31&a.length;d<e;d++)b=33*b^a.charCodeAt(d);return b>>>0;case"function":case"object":if(null===a)return 0;var d=f.indexOf(a);return d>=0?g[d]:c(a);default:throw new Error("Unsupported type "+typeof a+"!")}}var e=this,f=[],g=[],h=_modifier(b,"useConstructions",this.modifiers.useConstructions),i=_modifier(b,"autoInclude",this.modifiers.autoInclude),j=_modifier(b,"climbPrototypes",this.modifiers.climbPrototypes);return d(a)}function signature(){for(var a,b,c="",d=0;d<arguments.length;d++)b=arguments[d],a=typeof b,d&&(c+=","),c+="object"===a?b?identifier(b.constructor):"":a;return c}function checkSignature(a,b,c,d){var e=signature.apply(this,[c].concat(d));if(!b.exec(e))throw new TypeError("Sermat.checkSignature: Wrong arguments for construction of "+a+" ("+e+")!");return!0}function serialize_Error(a){return[a.message,a.name||"",a.stack||""]}function materializer_Error(a){return function(b,c){var d=null;return c&&(d=new a(c[0]+""),d.name=c[1]+"",d.stack=c[2]+""),d}}function Sermat(a){var b={},c={};member(this,"registry",b),member(this,"register",register.bind(this,b)),member(this,"remove",remove.bind(this,b)),a=a||{},member(this,"modifiers",c),member(c,"mode",_modifier(a,"mode",BASIC_MODE),5),member(c,"onUndefined",_modifier(a,"onUndefined",TypeError),5),member(c,"autoInclude",_modifier(a,"autoInclude",!0),5),member(c,"useConstructions",_modifier(a,"useConstructions",!0),5),member(c,"climbPrototypes",_modifier(a,"climbPrototypes",!0),5),this.include("Boolean Number String Object Array Date RegExp".split(" "))}var _getProto=Object.getPrototypeOf||function(a){return a.__proto__},_setProto=Object.setPrototypeOf||function(a,b){return a.__proto__=b,a},_assign=Object.assign||function(a,b){return Object.keys(b).forEach(function(c){a[c]=b[c]}),r},_isArray=Array.isArray,FUNCTION_ID_RE=/^\s*function\s+([\w\$]+)/,ID_REGEXP=/^[a-zA-Z_][a-zA-Z0-9_]*(?:[\.-][a-zA-Z0-9_]+)*$/,INVALID_ID_RE=/^(true|false|null|undefined|NaN|Infinity|\$[\w\$]*)$/,BASIC_MODE=0,REPEAT_MODE=1,BINDING_MODE=2,CIRCULAR_MODE=3,RE_IGNORABLES=/(?:\s|\/\*(?:[^*]*|\n|\*+[^\/])*\*+\/)*/,RE_NUM=/[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[+-]Infinity/,RE_STR=/\"(?:[^\\\"\r\n]|\\[^\r\n])*\"/,RE_STR2=/(?:`(?:[^`]|[\r\n])*`)+/,RE_CONS=/(?:true|false|null|undefined|Infinity|NaN)\b/,RE_ID=/[a-zA-Z_]+(?:[.-]?[a-zA-Z0-9_])*/,RE_BIND=/\$(?:[.-]?[a-zA-Z0-9_])*/,RE_SYMBOLS=/[,:[\]{}()=]/,RE_EOL=/\r\n?|\n/g,LEXER=new RegExp("^"+RE_IGNORABLES.source+"(?:("+RE_NUM.source+")|("+RE_STR.source+")|("+RE_STR2.source+")|("+RE_CONS.source+")|("+RE_ID.source+")|("+RE_BIND.source+")|("+RE_SYMBOLS.source+")|$)"),LEX_EOI=0,LEX_NUM=1,LEX_STR=2,LEX_STR2=3,LEX_CONS=4,LEX_ID=5,LEX_BIND=6,LEX_COMMA=7,LEX_COLON=8,LEX_OBRACKET=9,LEX_CBRACKET=10,LEX_OBRACE=11,LEX_CBRACE=12,LEX_OPAREN=13,LEX_CPAREN=14,LEX_EQUAL=15,CONSTRUCTIONS={},FUNCTION_RE=/^(function\s*[\w$]*\s*\((?:\s*[$\w]+\s*,?)*\)\s*\{[\0-\uFFFF]*\}|\((?:\s*[$\w]+\s*,?)*\)\s*=>\s*[\0-\uFFFF]*)$/;[[Boolean,function(a){return _assign([a.valueOf()],a)},function(a,b){return b&&_assign(new Boolean(b.shift()),b)}],[Number,function(a){return _assign([a.valueOf()],a)},function(a,b){return b&&_assign(new Number(b.shift()),b)}],[String,function(a){var b=[""+a.valueOf()];a.length;return Object.keys(a).forEach(function(c){if((0|c)-c!==0)b[c]=a[c];else if(+c<0||+c>=a.length)throw new TypeError("Sermat.ser: Cannot serialize String instances with integer properties (like <"+c+">)!")}),b},function(a,b){return b&&_assign(new String(b.shift()),b)}],[Object,function(a){throw new TypeError("Sermat.ser: Object literals should not be serialized by a construction!")},function(a,b){return b&&Object.apply(null,b)}],[Array,function(a){throw new TypeError("Sermat.ser: Arrays should not be serialized by a construction!")},function(a,b){return b}],[RegExp,function(a){var b=/^\/(.+?)\/([a-z]*)$/.exec(a+"");return b||raise("serialize_RegExp","Cannot serialize RegExp "+a+"!",{value:a}),_assign([b[1],b[2]],a)},function(a,b){return b&&checkSignature("RegExp",/^(,string){1,2}$/,a,b)&&_assign(new RegExp(b.shift(),b.shift()),b)}],[Date,function(a){return _assign([a.getUTCFullYear(),a.getUTCMonth(),a.getUTCDate(),a.getUTCHours(),a.getUTCMinutes(),a.getUTCSeconds(),a.getUTCMilliseconds()],a)},function(a,b){return b&&checkSignature("Date",/^(,number){1,7}?$/,a,b)?_assign(new Date(Date.UTC(0|b.shift(),+b.shift()||1,0|b.shift(),0|b.shift(),0|b.shift(),0|b.shift(),0|b.shift())),b):null}],[Function,function(a){var b=a+"",c=FUNCTION_RE.test(b);if(!c)throw new TypeError("Could not serialize function ("+b+")!");return _assign([b],a)},function materialize_Function(obj,args){if(args&&checkSignature("Function",/^,string$/,obj,args)){if(FUNCTION_RE.test(args[0]))return _assign(eval("("+args.shift()+")"),args);throw new ParseError("Invalid source for Function ("+args[0]+")!")}return null}],[Error,serialize_Error,materializer_Error(Error)],[EvalError,serialize_Error,materializer_Error(EvalError)],[RangeError,serialize_Error,materializer_Error(RangeError)],[ReferenceError,serialize_Error,materializer_Error(ReferenceError)],[SyntaxError,serialize_Error,materializer_Error(SyntaxError)],[TypeError,serialize_Error,materializer_Error(TypeError)],[URIError,serialize_Error,materializer_Error(URIError)]].forEach(function(a){var b=identifier(a[0],!0);member(CONSTRUCTIONS,b,Object.freeze({identifier:b,type:a[0],serializer:a[1],materializer:a[2]}),1)});var __members__={BASIC_MODE:BASIC_MODE,REPEAT_MODE:REPEAT_MODE,BINDING_MODE:BINDING_MODE,CIRCULAR_MODE:CIRCULAR_MODE,CONSTRUCTIONS:CONSTRUCTIONS,identifier:identifier,record:record,include:include,exclude:exclude,serialize:serialize,ser:serialize,serializeAsProperties:serializeAsProperties,signature:signature,checkSignature:checkSignature,materialize:materialize,mat:materialize,construct:construct,materializeWithConstructor:materializeWithConstructor,sermat:sermat,clone:clone,hashCode:hashCode};Object.keys(__members__).forEach(function(a){var b=__members__[a];member(Sermat.prototype,a,b)});var __SINGLETON__=new Sermat;return __SINGLETON__.include(["Date","RegExp"]),Object.keys(__members__).forEach(function(a){var b=__members__[a];member(Sermat,a,"function"==typeof b?b.bind(__SINGLETON__):b)}),["registry","register","remove","modifiers"].forEach(function(a){member(Sermat,a,__SINGLETON__[a])}),member(Sermat,"__package__","sermat"),member(Sermat,"__name__","Sermat"),member(Sermat,"__init__",__init__,4),member(Sermat,"__dependencies__",[],4),Sermat});
//# sourceMappingURL=sermat-umd-min.js.map