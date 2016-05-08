var Sermat=function a(){"use strict";function b(a,b,c){var d=new Error("Sermat."+a+": "+b);throw c&&(d.data=c),d}function c(a,b,c,d){d=0|d,Object.defineProperty(a,b,{value:c,writable:4&d,configurable:2&d,enumerable:1&d})}function d(a,b){return"undefined"==typeof a?b:a}function e(a,c){var d=a.__SERMAT__&&a.__SERMAT__.identifier||a.name||(w.exec(a+"")||[])[1];return!d&&c&&b("identifier","Could not found id for type!",{type:a}),d}function f(a){var b="function"==typeof a?e(a,!0):a+"";return this.registry[b]}function g(a,c){"function"!=typeof c.type&&b("register","No constructor found for type ("+c+")!",{spec:c}),c={type:c.type,identifier:(c.identifier||e(c.type,!0)).trim(),serializer:c.serializer,materializer:c.materializer||o.bind(this,c.type),global:!!c.global,include:c.include};var d=c.identifier;return["true","false","null","NaN","Infinity",""].forEach(function(a){d===a&&b("register","Invalid identifier '"+d+"'!",{spec:c})}),a.hasOwnProperty(d)&&b("register","Construction '"+d+"' is already registered!",{spec:c}),"function"!=typeof c.serializer&&b("register","Serializer for '"+d+"' is not a function!",{spec:c}),"function"!=typeof c.materializer&&b("register","Materializer for '"+d+"' is not a function!",{spec:c}),Object.freeze(c),a[d]=c,c.global&&!H[d]&&(H[d]=c),c.include&&this.include(c.include),c}function h(a,c){a.hasOwnProperty(c)||b("remove","A construction for '"+c+"' has not been registered!",{identifier:c});var d=a[c];return delete a[c],d}function i(a){var c=null;switch(typeof a){case"function":return c=this.record(a),!c&&a.__SERMAT__&&(a.__SERMAT__.type=a,c=this.register(a.__SERMAT__)),c;case"string":return c=this.record(a),!c&&H[a]&&(c=this.register(H[a])),c;case"object":if(Array.isArray(a))return a.map(function(a){return this.include(a)}.bind(this));if("function"==typeof a.type)return this.record(a.identifier||a.type)||this.register(a);if(a&&a.__SERMAT__&&a.__SERMAT__.include)return this.include(a.__SERMAT__.include);default:b("include","Could not include ("+a+")!",{arg:a})}}function j(a){switch(typeof a){case"string":return this.record(a)?(this.remove(a),1):0;case"function":return this.exclude(e(a));case"object":if(Array.isArray(a)){var c=0;return a.forEach(function(a){c+=this.exclude(a)}.bind(this)),c}default:b("exclude","Could not exclude ("+a+")!",{arg:a})}}function k(a){return new u(a)}function l(a,c,d){var e=this.record(a);return e?e.materializer.call(this,c,d):void b("construct","Cannot materialize construction for '"+a+"'",{invalidId:a})}function m(a){function c(a,b){return"$"!=a.charAt(0)&&d("Invalid binding identifier '"+a+"'",{invalidId:a}),k.hasOwnProperty(a)&&d("'"+a+"' is already bound",{boundId:a}),k[a]=b}function d(c,d){d=d||{},d.offset=e;var f=0,g=0;a.substr(0,e).replace(D,function(a,b){return g=b+a.length,f++,""}),d.line=f+1,d.column=e-g,b("materialize",c+" at line "+d.line+" column "+d.column+" (offset "+e+")!",d)}var e,f,g=this.construct.bind(this),h=new Array(50),i=new Array(50),j=0,k={"true":!0,"false":!1,"null":null,NaN:NaN,Infinity:1/0};i[0]=0;var l=function(a){var b=k[a];return"undefined"==typeof b&&d("'"+a+"' is not bound",{unboundId:a}),b}.bind(this),m=function(){function a(a){return a}function b(a,b){var e=g(a[1],a[2],a[3]);return a[2]&&e!==a[2]&&d("Object initialization for "+a[1]+" failed",{oldValue:a[2],newValue:e}),a[0]?c(a[0],e):e}return[null,[20,1,a],[20,3,function(a,b,d){return c(a,d)}],[20,2,a],[20,2,a],[20,2,a],[20,2,a],[20,2,b],[20,2,b],[13,1,function(a){return l(a)}],[13,1,Number],[13,1,G],[14,3,function(a,b,d){return c(a,{})}],[14,1,function(a){return{}}],[15,4,function(a,b,c,d){return a[b]=d,a}],[15,5,function(a,b,c,d,e){return a[c]=e,a}],[21,1,a],[21,1,G],[16,3,function(a,b,d){return c(a,[])}],[16,1,function(a){return[]}],[17,2,function(a,b){return a.push(b),a}],[17,3,function(a,b,c){return a.push(c),a}],[18,4,function(a,b,d,e){var f=g(d,null,null);return f?[null,d,c(a,f),[]]:[a,d,f,[]]}],[18,2,function(a,b,c){return[null,a,null,[]]}],[18,4,function(a,b,d,e){d=G(d);var f=g(d,null,null);return f?[null,d,c(a,f),[]]:[a,d,f,[]]}],[18,2,function(a,b,c){return[null,G(a),null,[]]}],[19,2,function(a,b){return a[3].push(b),a}],[19,3,function(a,b,c){return a[3].push(c),a}]]}();return a.replace(E,function(a,b,c,g,k,l,n,o,p){if(b||c)return"";e=p;for(var q,r,s=k?1:l?2:g?3:n?"[]{}():,=".indexOf(n)+4:o?23:22;;){if(q=F[i[j]][s],0>q){if(r=m[-q]){j+=1-r[1],h[j]=r[2].apply(null,h.slice(j,j+r[1])),i[j]=F[i[j-1]][r[0]];continue}}else{if(q>0)return i[++j]=q,h[j]=a,"";if(0==q)return f=h[j],""}d("Parse error")}}),f}function n(a,b,c){var d,e={},f=Array.isArray(b);for(var g in b)d=b[g],c&&!a.hasOwnProperty(d)||(e[f?d:g]=a[d]);return[e]}function o(a,b,c){return b||(b=Object.create(a.prototype),c)?(a.apply(b,c),b):b}function p(a,b){return this.mat(this.ser(a,b))}function q(){for(var a,b,c="",d=0;d<arguments.length;d++)b=arguments[d],a=typeof b,d&&(c+=","),c+="object"===a?b?e(b.constructor):"":a;return c}function r(a,c,d,e){var f=q.apply(this,[d].concat(e));return c.exec(f)||b("checkSignature","Wrong arguments for construction of "+a+" ("+f+")!",{id:a,obj:d,args:e}),!0}function s(a){return[a.message,a.name||"",a.stack||""]}function t(a){return function(b,c){var d=null;return c&&(d=new a(c[0]+""),d.name=c[1]+"",d.stack=c[2]+""),d}}function u(a){this.typeConstructor=a}function v(a){var b={},e={};c(this,"registry",b),c(this,"register",g.bind(this,b)),c(this,"remove",h.bind(this,b)),a=a||{},c(this,"modifiers",e),c(e,"mode",d(a.mode,y),5),c(e,"allowUndefined",d(a.allowUndefined,!1),5),c(e,"autoInclude",d(a.autoInclude,!0),5),c(e,"useConstructions",d(a.useConstructions,!0),5),this.include("Boolean Number String Object Array Date RegExp type".split(" "))}var w=/^\s*function\s+([\w\$]+)/,x=/^[a-zA-Z_][a-zA-Z0-9_]*([\.-][a-zA-Z0-9_]+)*$/,y=0,z=1,A=2,B=3,C=function(){function a(a,d,f){switch(typeof d){case"undefined":if(a.allowUndefined)return"null";b("serialize","Cannot serialize undefined value!");case"boolean":case"number":return d+"";case"string":return c(d);case"function":case"object":return e(a,d,f)}}function c(a){return'"'+a.replace(/[\\\"]/g,"\\$&")+'"'}function e(d,e,f){if(!e)return"null";d.parents.indexOf(e)>=0&&d.mode!==B&&b("serialize","Circular reference detected!",{circularReference:e});var g,h,i="";if(d.visited)if(g=d.visited.indexOf(e),g>=0){if(d.mode&A)return"$"+g;b("serialize","Repeated reference detected!",{repeatedReference:e})}else g=d.visited.push(e)-1,d.mode&A&&(i="$"+g+(d.pretty?" = ":"="));d.parents.push(e);var j=f&&f+"	";if(Array.isArray(e)){for(i+="["+j,g=0,h=e.length;h>g;g++)i+=(g?","+j:"")+a(d,e[g],j);i+=f+"]"}else if(e.constructor!==Object&&d.useConstructions){var k=d.record(e.constructor)||d.autoInclude&&d.include(e.constructor);k||b("serialize",'Unknown type "'+d.sermat.identifier(e.constructor)+'"!',{unknownType:e});var l=k.serializer.call(d.sermat,e),m=k.identifier;for(i+=(x.exec(m)?m:c(m))+"("+j,g=0,h=l.length;h>g;g++)i+=(g?","+j:"")+a(d,l[g],j);i+=f+")"}else{g=0,i+="{"+j;for(var n in e)i+=(g++?","+j:"")+(x.exec(n)?n:c(n))+(d.pretty?" : ":":")+a(d,e[n],j);i+=f+"}"}return d.parents.pop(),i}return function(b,c){c=c||this.modifiers;var e=d(c.mode,this.modifiers.mode),f=!!d(c.pretty,this.modifiers.pretty);return a({visited:e===z?null:[],parents:[],sermat:this,record:this.record.bind(this),include:this.include.bind(this),mode:e,allowUndefined:d(c.allowUndefined,this.modifiers.allowUndefined),autoInclude:d(c.autoInclude,this.modifiers.autoInclude),useConstructions:d(c.useConstructions,this.modifiers.useConstructions),pretty:f},b,f?"\n":"")}}(),D=/\r\n?|\n/g,E=new RegExp([/\s+/,/\/\*(?:[\0-)+-.0-\uFFFF]*|\*+[\0-)+-.0-\uFFFF])*\*+\//,/[a-zA-Z_\$][a-zA-Z0-9_]*(?:[.-][a-zA-Z0-9_]+)*/,/[+-]Infinity|[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/,/\"(?:[^\\\"]|\\[\0-\uFFFF])*\"/,/[\[\]\{\}\(\):,=]/,/.|$/].map(function(a){return a+="","("+a.substr(1,a.length-2)+")"}).join("|"),"g"),F=[[,10,11,3,13,,12,,,,,,,2,4,5,6,7,8,9,1],[,,,,,,,,,,,,,,,,,,,,,,0],[,,,,,-1,,-1,,-1,,-1,,,,,,,,,,,-1],[,,,,,-9,,-9,15,-9,,-9,14,,,,,,,,,,-9],[,,19,18,,,,17,,,,,,,,,,,,,,16],[,,,,,,,21,,,,20],[,10,11,3,13,23,12,,,,,,,2,4,5,6,7,8,9,22],[,,,,,25,,,,,,24],[,10,11,3,13,,12,,,27,,,,2,4,5,6,7,8,9,26],[,,,,,,,,,29,,28],[,,,,,-10,,-10,,-10,,-10,,,,,,,,,,,-10],[,,,,,-11,,-11,30,-11,,-11,,,,,,,,,,,-11],[,,-13,-13,,,,-13],[,-19,-19,-19,-19,-19,-19],[,,31,34,33,,32],[,-23,-23,-23,-23,,-23,,,-23],[,,,,,,,,,,35],[,,,,,-3,,-3,,-3,,-3,,,,,,,,,,,-3],[,,,,,,,,,,-16],[,,,,,,,,,,-17],[,,19,18,,,,,,,,,,,,,,,,,,36],[,,,,,-4,,-4,,-4,,-4,,,,,,,,,,,-4],[,,,,,-20,,,,,,-20],[,,,,,-5,,-5,,-5,,-5,,,,,,,,,,,-5],[,10,11,3,13,,12,,,,,,,2,4,5,6,7,8,9,37],[,,,,,-6,,-6,,-6,,-6,,,,,,,,,,,-6],[,,,,,,,,,-26,,-26],[,,,,,-7,,-7,,-7,,-7,,,,,,,,,,,-7],[,10,11,3,13,,12,,,,,,,2,4,5,6,7,8,9,38],[,,,,,-8,,-8,,-8,,-8,,,,,,,,,,,-8],[,-25,-25,-25,-25,,-25,,,-25],[,,,,,-2,,-2,39,-2,,-2,,,,,,,,,,,-2],[,,-12,-12,,,,-12],[,-18,-18,-18,-18,-18,-18],[,,,,,,,,40],[,10,11,3,13,,12,,,,,,,2,4,5,6,7,8,9,41],[,,,,,,,,,,42],[,,,,,-21,,,,,,-21],[,,,,,,,,,-27,,-27],[,-24,-24,-24,-24,,-24,,,-24],[,-22,-22,-22,-22,,-22,,,-22],[,,,,,,,-14,,,,-14],[,10,11,3,13,,12,,,,,,,2,4,5,6,7,8,9,43],[,,,,,,,-15,,,,-15]],G=function(a){return eval.call(null,a.replace(D,function(a){return"\n"===a?"\\n":"\r"===a?"\\r":"\\r\\n"}))},H={};[[Boolean,function(a){return[!!a]},function(a,b){return b&&new Boolean(b[0])}],[Number,function(a){return[+a]},function(a,b){return b&&new Number(b[0])}],[String,function(a){return[a+""]},function(a,b){return b&&new String(b[0])}],[Object,function(a){return[a]},function(a,b){return b&&Object.apply(null,b)}],[Array,function(a){return a},function(a,b){return a=a||[],b?a.concat(b):a}],[RegExp,function(a){var c=/^\/(.+?)\/([a-z]*)$/.exec(a+"");return c||b("serialize_RegExp","Cannot serialize RegExp "+a+"!",{value:a}),[c[1],c[2]]},function(a,b){return b&&r("RegExp",/^(,string){1,2}$/,a,b)&&new RegExp(b[0],b[1]||"")}],[Date,function(a){return[a.getUTCFullYear(),a.getUTCMonth(),a.getUTCDate(),a.getUTCHours(),a.getUTCMinutes(),a.getUTCSeconds(),a.getUTCMilliseconds()]},function(a,b){return b&&r("Date",/^(,number){1,7}$/,a,b)&&new Date(Date.UTC(0|b[0],+b[1]||1,0|b[2],0|b[3],0|b[4],0|b[5],0|b[6]))}],[Function,function(a){var c=/^function\s*[\w$]*\s*\(((\s*[$\w]+\s*,?)*)\)\s*\{([\0-\uFFFF]*)\}$/.exec(a+"");return c||b("serialize_Function","Could not serialize Function "+a+"!",{value:a}),c[1].split(/\s*,\s*/).concat([c[3]])},function(a,b){return b&&r("Function",/^(,string)+$/,a,b)&&Function.apply(null,b)}],[Error,s,t(Error)],[EvalError,s,t(EvalError)],[RangeError,s,t(RangeError)],[ReferenceError,s,t(ReferenceError)],[SyntaxError,s,t(SyntaxError)],[TypeError,s,t(TypeError)],[URIError,s,t(URIError)]].forEach(function(a){var b=e(a[0],!0);c(H,b,Object.freeze({identifier:b,type:a[0],serializer:a[1],materializer:a[2]}),1)}),c(H,"type",u.__SERMAT__=Object.freeze({identifier:"type",type:u,serializer:function(a){var c=this.record(a.typeConstructor);return c?[c.identifier]:void b("serialize_type",'Unknown type "'+e(a.typeConstructor)+'"!',{type:a.typeConstructor})},materializer:function(a,c){if(!c)return null;if(r("type",/^,string$/,a,c)){var d=this.record(c[0]);if(d)return d.type}b("materialize_type","Cannot materialize construction for type("+c+")!",{args:c})}}),1);var I={BASIC_MODE:y,REPEAT_MODE:z,BINDING_MODE:A,CIRCULAR_MODE:B,CONSTRUCTIONS:H,identifier:e,record:f,include:i,exclude:j,serialize:C,ser:C,serializeAsProperties:n,serializeAsType:k,signature:q,checkSignature:r,materialize:m,mat:m,construct:l,materializeWithConstructor:o,sermat:p};Object.keys(I).forEach(function(a){var b=I[a];c(v.prototype,a,b)});var J=new v;return J.include(["Date","RegExp"]),Object.keys(I).forEach(function(a){var b=I[a];c(v,a,"function"==typeof b?b.bind(J):b)}),["registry","register","remove","modifiers"].forEach(function(a){c(v,a,J[a])}),c(v,"__package__","sermat"),c(v,"__name__","Sermat"),c(v,"__init__",a,4),c(v,"__dependencies__",[],4),v}();
//# sourceMappingURL=sermat-min.js.map