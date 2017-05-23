define([],function __init__(){"use strict";function member(a,b,c,d){d=0|d,Object.defineProperty(a,b,{value:c,writable:4&d,configurable:2&d,enumerable:1&d})}function _modifier(a,b,c){return a&&a.hasOwnProperty(b)?a[b]:c}function identifier(a,b){var c=a.__SERMAT__&&a.__SERMAT__.identifier||a.name||(FUNCTION_ID_RE.exec(a+"")||[])[1];if(!c&&b)throw new Error("Sermat.identifier: Could not found id for type "+a+"!");return c}function record(a){var b="function"==typeof a?identifier(a,!0):a+"";return this.registry[b]}function register(a,b){if("function"!=typeof b.type)throw new Error("Sermat.register: No constructor found for type ("+b+")!");b={type:b.type,identifier:(b.identifier||identifier(b.type,!0)).trim(),serializer:b.serializer||serializeWithConstructor.bind(this,b.type),materializer:b.materializer||materializeWithConstructor.bind(this,b.type),global:!!b.global,include:b.include};var c=b.identifier;if(INVALID_ID_RE.test(c))throw new Error("Sermat.register: Invalid identifier '"+c+"'!");if(a.hasOwnProperty(c))throw new Error("Sermat.register: Construction '"+c+"' is already registered!");if("function"!=typeof b.serializer)throw new Error("Sermat.register: Serializer for '"+c+"' is not a function!");if("function"!=typeof b.materializer)throw new Error("Sermat.register: Materializer for '"+c+"' is not a function!");return Object.freeze(b),a[c]=b,b.global&&!CONSTRUCTIONS[c]&&(CONSTRUCTIONS[c]=b),b.include&&this.include(b.include),b}function remove(a,b){if(!a.hasOwnProperty(b))throw new Error("Sermat.remove: A construction for '"+b+"' has not been registered!");var c=a[b];return delete a[b],c}function include(a){var b=null;switch(typeof a){case"function":return b=this.record(a),!b&&a.__SERMAT__&&(b=a.__SERMAT__,a.hasOwnProperty("__SERMAT__")||b.inheritable||(b=Object.assign({},b),b.identifier=this.identifier(a,!0)),b.type=a,b=this.register(b)),b;case"string":return b=this.record(a),!b&&CONSTRUCTIONS[a]&&(b=this.register(CONSTRUCTIONS[a])),b;case"object":if(Array.isArray(a))return a.map(function(a){return this.include(a)}.bind(this));if("function"==typeof a.type)return this.record(a.identifier||a.type)||this.register(a);if(a&&a.__SERMAT__&&a.__SERMAT__.include)return this.include(a.__SERMAT__.include);default:throw new Error("Sermat.include: Could not include ("+a+")!")}}function exclude(a){switch(typeof a){case"string":return this.record(a)?(this.remove(a),1):0;case"function":return this.exclude(identifier(a));case"object":if(Array.isArray(a)){var b=0;return a.forEach(function(a){b+=this.exclude(a)}.bind(this)),b}default:throw new Error("Sermat.exclude: Could not exclude ("+a+")!")}}function serialize(a,b){function c(a,b){switch(typeof a){case"undefined":return d();case"boolean":case"number":return a+"";case"string":return e(a);case"function":return f(a,b);case"object":return g(a,b)}}function d(){switch(typeof l){case"undefined":return"undefined";case"function":if(l.prototype instanceof Error)throw new l("Sermat.ser: Cannot serialize undefined value!");var a=l.call(null);return"undefined"==typeof a?"undefined":c(a);default:return c(l)}}function e(a){return JSON.stringify(a)}function f(a,b){var c=r.identifier(a,!1)?r.record(a):null;return c?"$"+c.identifier:g(a,b)}function g(a,b){if(!a)return"null";if(q.indexOf(a)>=0&&j!==CIRCULAR_MODE)throw new TypeError("Sermat.ser: Circular reference detected!");var c,d="";if(p){if(c=p.indexOf(a),c>=0){if(j&BINDING_MODE)return"$"+c;throw new TypeError("Sermat.ser: Repeated reference detected!")}c=p.push(a)-1,j&BINDING_MODE&&(d="$"+c+(k?" = ":"="))}q.push(a);var f=b&&b+"\t";if(_isArray(a))d+=h(a,b,f);else{var l=_getProto(a),s="";if(a.constructor===Object||!n||o&&!l.hasOwnProperty("constructor"))s=i(a,b,f),o&&!l.hasOwnProperty("constructor")&&(s+=(s?","+f:"")+"__proto__"+(k?" : ":":")+g(l,b)),d+="{"+f+s+b+"}";else{var t=r.record(a.constructor)||m&&r.include(a.constructor);if(!t)throw new TypeError('Sermat.ser: Unknown type "'+r.identifier(a.constructor)+'"!');var u=t.serializer.call(r,a),v=t.identifier;d+=Array.isArray(u)?(ID_REGEXP.exec(v)?v:e(v))+"("+f+i(u,b,f)+b+")":g(u,b)}}return q.pop(),d}function h(a,b,c){return"["+c+i(a,b,c)+b+"]"}function i(a,b,f){var g="",h="",i=0;return Object.keys(a).forEach(function(b){if(g+=h,(0|b)-b!==0)g+=(ID_REGEXP.exec(b)?b:e(b))+(k?" : ":":");else for(;b-i>0;i++)g+=d()+","+f;g+=c(a[b],f),h=","+f,i++}),g}var j=_modifier(b,"mode",this.modifiers.mode),k=_modifier(b,"pretty",this.modifiers.pretty),l=_modifier(b,"onUndefined",this.modifiers.onUndefined),m=_modifier(b,"autoInclude",this.modifiers.autoInclude),n=_modifier(b,"useConstructions",this.modifiers.useConstructions),o=_modifier(b,"climbPrototypes",this.modifiers.climbPrototypes),p=j===REPEAT_MODE?null:[],q=[],r=this;return c(a,k?"\n":"")}function construct(a,b,c){var d=this.record(a);if(d)return d.materializer.call(this,b,c);throw new SyntaxError("Sermat.construct: Cannot materialize type '"+a+"'")}function materialize(source,modifiers){function nextToken(){var a,b,c=LEXER.exec(input);if(text="",c){for(a=c[0].length,input=input.substr(a),offset+=a,b=1,a=TOKENS.length;b<=a;b++)if(c[b]){token=TOKENS.charAt(b-1),text=c[b];break}return text||(token=c[b]||"$"),token}error('Invalid character "'+input.charAt(0)+'"')}function error(a){a=a||"Parse error",offset-=text.length;var b=0,c=0;throw source.substr(0,offset).replace(RE_EOL,function(a,d){return c=d+a.length,b++,""}),new SyntaxError("Sermat.mat: "+a+" at line "+(b+1)+" column "+(offset-c)+" (offset "+(offset+1)+")!")}function shift(a){token!==a&&error("Parse error. Expected <"+a+"> but got <"+(text||token)+">"),nextToken()}function parseValue(){var t=text;switch(token){case"n":case"s":return nextToken(),eval(t);case"[":return nextToken(),parseArray([]);case"{":return nextToken(),parseObject({});case"b":return parseBind();case"i":return nextToken(),CONSTANTS.hasOwnProperty(t)?CONSTANTS[t]:(shift("("),parseConstruction(t,null));default:error()}}function parseArray(a){return"]"!==token&&parseElements(a),shift("]"),a}function parseObject(a){return"}"!==token&&parseElements(a),shift("}"),a}function parseElements(obj){for(var i=0,t;;){switch(t=text,token){case"i":if(CONSTANTS.hasOwnProperty(t))obj[i++]=CONSTANTS[t],nextToken();else switch(nextToken()){case":":nextToken(),"__proto__"===t?_setProto(obj,parseValue()):obj[t]=parseValue();break;case"(":nextToken(),obj[i++]=parseConstruction(t,null);break;default:error()}break;case"s":":"===nextToken()?(nextToken(),"__proto__"===t?_setProto(obj,parseValue()):obj[eval(t)]=parseValue()):obj[i++]=eval(t);break;case"n":obj[i++]=eval(t),nextToken();break;case"b":obj[i++]=parseBind();break;case"[":case"{":obj[i++]=parseValue();break;default:error()}if(","!==token)break;nextToken()}return obj}function parseBind(){var a=text;if(nextToken(),"="!==token){if(bindings.hasOwnProperty(a))return bindings[a];var b=sermat.record(a.substr(1));if(b)return b.type;throw new ReferenceError("Sermat.mat: "+a+" is not defined!")}switch(bindings.hasOwnProperty(a)&&error("Binding "+a+" cannot be reassigned"),nextToken(),token){case"[":return nextToken(),parseArray(bindings[a]=[]);case"{":return nextToken(),parseObject(bindings[a]={});case"i":var c=text;return nextToken(),shift("("),bindings[a]=parseConstruction(c,bindings[a]=sermat.construct(c,null,null));default:return bindings[a]=parseValue()}}function parseConstruction(a,b){var c=[];return")"!==token&&parseElements(c),shift(")"),sermat.construct(a,b,c)}var input=source+"",offset=0,token,text,bindings=modifiers&&modifiers.bindings||{},sermat=this;nextToken();var result=parseValue();return shift("$"),result}function serializeAsProperties(a,b,c){var d,e={},f=Array.isArray(b);for(var g in b)d=b[g],c&&!a.hasOwnProperty(d)||(e[f?d:g]=a[d]);return[e]}function serializeWithConstructor(a,b){var c=a+"",d=/^function\s*[\w$]*\s*\(([^)]*)\)\s*\{/.exec(c)||/^\(([^)]*)\)\s*=>/.exec(c);if(d&&d[1])return d[1].split(/\s*,\s*/).map(function(a){return b[a]});throw new TypeError("Cannot infer a serialization from constructor ("+a+")!")}function materializeWithConstructor(a,b,c){return b||(b=Object.create(a.prototype),c)?(a.apply(b,c),b):b}function sermat(a,b){return this.mat(this.ser(a,b))}function signature(){for(var a,b,c="",d=0;d<arguments.length;d++)b=arguments[d],a=typeof b,d&&(c+=","),c+="object"===a?b?identifier(b.constructor):"":a;return c}function checkSignature(a,b,c,d){var e=signature.apply(this,[c].concat(d));if(!b.exec(e))throw new TypeError("Sermat.checkSignature: Wrong arguments for construction of "+a+" ("+e+")!");return!0}function serialize_Error(a){return[a.message,a.name||"",a.stack||""]}function materializer_Error(a){return function(b,c){var d=null;return c&&(d=new a(c[0]+""),d.name=c[1]+"",d.stack=c[2]+""),d}}function Sermat(a){var b={},c={};member(this,"registry",b),member(this,"register",register.bind(this,b)),member(this,"remove",remove.bind(this,b)),a=a||{},member(this,"modifiers",c),member(c,"mode",_modifier(a,"mode",BASIC_MODE),5),member(c,"onUndefined",_modifier(a,"onUndefined",TypeError),5),member(c,"autoInclude",_modifier(a,"autoInclude",!0),5),member(c,"useConstructions",_modifier(a,"useConstructions",!0),5),member(c,"climbPrototypes",_modifier(a,"climbPrototypes",!0),5),this.include("Boolean Number String Object Array Date RegExp new class".split(" "))}var _getProto=Object.getPrototypeOf||function(a){return a.__proto__},_setProto=Object.setPrototypeOf||function(a,b){return a.__proto__=b,a},_assign=Object.assign||function(a,b){return Object.keys(b).forEach(function(c){a[c]=b[c]}),r},_isArray=Array.isArray,FUNCTION_ID_RE=/^\s*function\s+([\w\$]+)/,ID_REGEXP=/^[a-zA-Z_][a-zA-Z0-9_]*(?:[\.-][a-zA-Z0-9_]+)*$/,INVALID_ID_RE=/^(true|false|null|undefined|NaN|Infinity|\$[\w\$]*)$/,BASIC_MODE=0,REPEAT_MODE=1,BINDING_MODE=2,CIRCULAR_MODE=3,RE_IGNORABLES=/(?:\s|\/\*(?:[\0-\)+-.0-\uFFFF]*|\*+[\0-\)+-.0-\uFFFF])*\*+\/)*/,RE_NUM=/[+-]?(?:Infinity|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/,RE_STR=/\"(?:[^\\\"\n]|\\[^\n])*\"|`(?:[^\\\`]|\\.)*`/,RE_ID=/[a-zA-Z_](?:[.-]?[a-zA-Z0-9_]+)*/,RE_BIND=/\$[a-zA-Z0-9_]+(?:[.-]?[a-zA-Z0-9_]+)*/,RE_SYMBOLS=/[\,[\]{:}(=)]/,RE_EOL=/\r\n?|\n/g,LEXER=new RegExp("^"+RE_IGNORABLES.source+"(?:("+RE_NUM.source+")|("+RE_STR.source+")|("+RE_ID.source+")|("+RE_BIND.source+")|("+RE_SYMBOLS.source+")|$)"),TOKENS="nsib",CONSTANTS={undefined:void 0,"true":!0,"false":!1,"null":null,NaN:NaN,Infinity:1/0},CONSTRUCTIONS={},FUNCTION_RE=/^(function\s*[\w$]*\s*\((?:\s*[$\w]+\s*,?)*\)\s*\{[\0-\uFFFF]*\}|\((?:\s*[$\w]+\s*,?)*\)\s*=>\s*[\0-\uFFFF]*)$/;[[Boolean,function(a){return _assign([a.valueOf()],a)},function(a,b){return b&&_assign(new Boolean(b.shift()),b)}],[Number,function(a){return _assign([a.valueOf()],a)},function(a,b){return b&&_assign(new Number(b.shift()),b)}],[String,function(a){var b=[""+a.valueOf()];a.length;return Object.keys(a).forEach(function(c){if((0|c)-c!==0)b[c]=a[c];else if(+c<0||+c>=a.length)throw new TypeError("Sermat.ser: Cannot serialize String instances with integer properties (like <"+c+">)!")}),b},function(a,b){return b&&_assign(new String(b.shift()),b)}],[Object,function(a){throw new TypeError("Sermat.ser: Object literals should not be serialized by a construction!")},function(a,b){return b&&Object.apply(null,b)}],[Array,function(a){throw new TypeError("Sermat.ser: Arrays should not be serialized by a construction!")},function(a,b){return b}],[RegExp,function(a){var b=/^\/(.+?)\/([a-z]*)$/.exec(a+"");return b||raise("serialize_RegExp","Cannot serialize RegExp "+a+"!",{value:a}),_assign([b[1],b[2]],a)},function(a,b){return b&&checkSignature("RegExp",/^(,string){1,2}$/,a,b)&&_assign(new RegExp(b.shift(),b.shift()),b)}],[Date,function(a){return _assign([a.getUTCFullYear(),a.getUTCMonth(),a.getUTCDate(),a.getUTCHours(),a.getUTCMinutes(),a.getUTCSeconds(),a.getUTCMilliseconds()],a)},function(a,b){return b&&checkSignature("Date",/^(,number){1,7}?$/,a,b)?_assign(new Date(Date.UTC(0|b.shift(),+b.shift()||1,0|b.shift(),0|b.shift(),0|b.shift(),0|b.shift(),0|b.shift())),b):null}],[Function,function(a){var b=a+"",c=FUNCTION_RE.test(b);if(!c)throw new TypeError("Could not serialize function ("+b+")!");return _assign([b],a)},function materialize_Function(obj,args){if(args&&checkSignature("Function",/^,string$/,obj,args)){if(FUNCTION_RE.test(args[0]))return _assign(eval("("+args.shift()+")"),args);throw new ParseError("Invalid source for Function ("+args[0]+")!")}return null}],[Error,serialize_Error,materializer_Error(Error)],[EvalError,serialize_Error,materializer_Error(EvalError)],[RangeError,serialize_Error,materializer_Error(RangeError)],[ReferenceError,serialize_Error,materializer_Error(ReferenceError)],[SyntaxError,serialize_Error,materializer_Error(SyntaxError)],[TypeError,serialize_Error,materializer_Error(TypeError)],[URIError,serialize_Error,materializer_Error(URIError)]].forEach(function(a){var b=identifier(a[0],!0);member(CONSTRUCTIONS,b,Object.freeze({identifier:b,type:a[0],serializer:a[1],materializer:a[2]}),1)}),member(CONSTRUCTIONS,"new",Object.freeze({identifier:"new",type:function(){this.args=Array.prototype.slice.call(arguments),this.cons=this.args.shift()},serializer:function(a){return[a.cons].concat(a.args)},materializer:function(a,b){return b&&new(Function.prototype.bind.apply(b[0],b))}})),member(CONSTRUCTIONS,"class",Object.freeze({identifier:"class",type:function(a,b){this.cons=a,this.props=b},materializer:function(a,b){if(b){var c=b[0],d=function(){c.apply(this,arguments)};return _setProto(d,c),d.prototype=Object.create(c.prototype),d.prototype.constructor=d,_assign(d.prototype,b[1]),d}return null}}));var __members__={BASIC_MODE:BASIC_MODE,REPEAT_MODE:REPEAT_MODE,BINDING_MODE:BINDING_MODE,CIRCULAR_MODE:CIRCULAR_MODE,CONSTRUCTIONS:CONSTRUCTIONS,identifier:identifier,record:record,include:include,exclude:exclude,serialize:serialize,ser:serialize,serializeAsProperties:serializeAsProperties,signature:signature,checkSignature:checkSignature,materialize:materialize,mat:materialize,construct:construct,materializeWithConstructor:materializeWithConstructor,sermat:sermat};Object.keys(__members__).forEach(function(a){var b=__members__[a];member(Sermat.prototype,a,b)});var __SINGLETON__=new Sermat;return __SINGLETON__.include(["Date","RegExp"]),Object.keys(__members__).forEach(function(a){var b=__members__[a];member(Sermat,a,"function"==typeof b?b.bind(__SINGLETON__):b)}),["registry","register","remove","modifiers"].forEach(function(a){member(Sermat,a,__SINGLETON__[a])}),member(Sermat,"__package__","sermat"),member(Sermat,"__name__","Sermat"),member(Sermat,"__init__",__init__,4),member(Sermat,"__dependencies__",[],4),Sermat});
//# sourceMappingURL=sermat-amd-min.js.map