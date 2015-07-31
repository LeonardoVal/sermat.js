define([],function __init__(){"use strict";function raise(a,b,c){var d=new Error("Sermat."+a+": "+b);throw c&&(d.data=c),d}function member(a,b,c,d){d=0|d,Object.defineProperty(a,b,{value:c,writable:4&d,configurable:2&d,enumerable:1&d})}function coalesce(a,b){return"undefined"==typeof a?b:a}function identifier(a,b){var c=a.__SERMAT__&&a.__SERMAT__.identifier||a.name||(FUNCTION_ID_RE.exec(constructor+"")||[])[1];return!c&&b&&raise("identifier","Could not found id for type!",{type:a}),c}function record(a,b){var c="function"==typeof a?identifier(a,!0):a+"",d=this.registry[c];return!d&&b&&raise("record",'Unknown type "'+c+'"!',{type:a}),d}function register(a,b){"function"!=typeof b.type&&raise("register","No constructor found for type ("+b+")!",{spec:b});var c=b.identifier;return c||(c=b.identifier=identifier(b.type,!0)),ID_REGEXP.exec(c)||raise("register","Invalid identifier '"+c+"'!",{spec:b}),a.hasOwnProperty(c)&&raise("register","'"+c+"' is already registered!",{spec:b}),"function"!=typeof b.serializer&&raise("register","Serializer for '"+b.identifier+"' is not a function!",{spec:b}),b.materializer||(b.materializer=materializeWithConstructor.bind(this,b.type)),"function"!=typeof b.materializer&&raise("register","Materializer for '"+c+"' is not a function!",{spec:b}),Object.freeze(b),a[c]=b,b.global&&!CONSTRUCTIONS[c]&&(CONSTRUCTIONS[c]=b),b}function include(a){var b=null;switch(typeof a){case"function":b=a.__SERMAT__,b&&!this.record(a)&&(b.type=a,b=this.register(b));break;case"string":CONSTRUCTIONS[a]&&!this.registry[a]&&(b=this.register(CONSTRUCTIONS[a]));break;case"object":if(Array.isArray(a))return a.map(function(a){return this.include(a)}.bind(this));b="function"!=typeof a.type||this.record(a.identifier||a.type)?a&&a.__SERMAT__:this.register(a);break;default:raise("register","Could not include ("+a+")!",{arg:a})}return b&&b.include&&this.include(b.include),b}function construct(a,b,c){var d=this.record(a);return d?d.materializer.call(this,b,c):void raise("construct","Cannot materialize construction for '"+a+"'",{invalidId:a})}function materialize(a){function b(a){var b=k[a];return"undefined"==typeof b&&d("'"+a+"' is not bound",{unboundId:a}),b}function c(a,b){return"$"!=a.charAt(0)&&d("Invalid binding identifier '"+a+"'",{invalidId:a}),k.hasOwnProperty(a)&&d("'"+a+"' is already bound",{boundId:a}),k[a]=b}function d(b,c){c=c||{},c.offset=e;var d=0,f=0;a.substr(0,e).replace(EOL_RE,function(a,b){return f=b+a.length,d++,""}),c.line=d+1,c.column=e-f,raise("materialize",b+" at line "+c.line+" column "+c.column+" (offset "+e+")!",c)}var e,f,g=new Array(50),h=new Array(50),i=0,j=this.construct.bind(this),k={"true":!0,"false":!1,"null":null,NaN:NaN,Infinity:1/0};h[0]=0;var l=function(){function a(a){return a}function e(a,b){var c=j(a[1],a[2],a[3]);return a[2]&&c!==a[2]&&d("Object initialization for "+a[1]+" failed",{oldValue:a[2],newValue:c}),a[0]?this.setBind(a[0],c):c}return[null,[20,1,a],[20,3,function(a,b,d){return c(a,d)}],[20,2,a],[20,2,a],[20,2,a],[20,2,a],[20,2,e],[20,2,e],[13,1,function(a){return b(a)}],[13,1,Number],[13,1,parseString],[14,3,function(a,b,d){return c(a,{})}],[14,1,function(a){return{}}],[15,4,function(a,b,c,d){return a[b]=d,a}],[15,5,function(a,b,c,d,e){return a[c]=e,a}],[21,1,a],[21,1,parseString],[16,3,function(a,b,d){return c(a,[])}],[16,1,function(a){return[]}],[17,2,function(a,b){return a.push(b),a}],[17,3,function(a,b,c){return a.push(c),a}],[18,4,function(a,b,d,e){var f=j(d,null,null);return f?[null,d,c(a,f),[]]:[a,d,f,[]]}],[18,2,function(a,b,c){return[null,a,null,[]]}],[19,2,function(a,b){return a[3].push(b),a}],[19,3,function(a,b,c){return a[3].push(c),a}]]}();return a.replace(LEXER_RE,function(a,b,c,j,k,m,n,o,p){if(b||c)return"";e=p;for(var q,r,s=k?1:m?2:j?3:n?"[]{}():,=".indexOf(n)+4:o?23:22;;){if(q=PARSE_TABLE[h[i]][s],0>q){if(r=l[-q]){i+=1-r[1],g[i]=r[2].apply(null,g.slice(i,i+r[1])),h[i]=PARSE_TABLE[h[i-1]][r[0]];continue}}else{if(q>0)return h[++i]=q,g[i]=a,"";if(0==q)return f=g[i],""}d("Parse error")}}),f}function serializeAsProperties(a,b){var c={};return Array.isArray(b)?b.forEach(function(b){c[b]=a[b]}):Object.keys(b).forEach(function(d){c[d]=a[b[d]]}),[c]}function materializeWithConstructor(a,b,c){return b||(b=Object.create(a.prototype),c)?(a.apply(b,c),b):b}function sermat(a,b){return this.mat(this.ser(a,b))}function type(a){var b=typeof a;return"object"===b?a?identifier(a.constructor):"":b}function signature(a,b){return type(a)+","+b.map(type).join(",")}function checkSignature(a,b,c,d){var e=signature(c,d);return b.exec(e)||raise("checkSignature","Wrong arguments for construction of "+a+" ("+e+")!",{id:a,obj:c,args:d}),!0}function Sermat(a){var b={},c=register.bind(this,b),d={};member(this,"registry",b),member(this,"register",c),a=a||{},member(this,"modifiers",d),member(d,"allowUndefined",coalesce(a.allowUndefined,!1),5),member(d,"mode",coalesce(a.mode,BASIC_MODE),5),member(d,"useConstructions",coalesce(a.useConstructions,!0),5),this.include(["Boolean","Number","String","Object","Array"])}var FUNCTION_ID_RE=/^\s*function\s+([\w\$]+)/,ID_REGEXP=/^[\$A-Z_a-z][\$\-\.\w]*$/,BASIC_MODE=0,REPEAT_MODE=1,BINDING_MODE=2,CIRCULAR_MODE=3,serialize=function(){function a(a,c){switch(typeof c){case"undefined":if(a.allowUndefined)return"null";raise("serialize","Cannot serialize undefined value!");case"boolean":case"number":return c+"";case"string":return'"'+c.replace(/[\\\"]/g,"\\$&")+'"';case"function":case"object":return b(a,c)}}function b(b,c){if(!c)return"null";b.parents.indexOf(c)>=0&&b.mode!==CIRCULAR_MODE&&raise("serialize","Circular reference detected!",{circularReference:c});var d,e=b.visited.indexOf(c),f="";if(e>=0){if(b.mode&BINDING_MODE)return"$"+e;b.mode!==REPEAT_MODE&&raise("serialize","Repeated reference detected!",{repeatedReference:c})}else e=b.visited.push(c)-1,b.mode&BINDING_MODE&&(f="$"+e+"=");if(b.parents.push(c),Array.isArray(c)){for(f+="[",e=0,d=c.length;d>e;e++)f+=(e?",":"")+a(b,c[e]);f+="]"}else if(c.constructor!==Object&&b.useConstructions){var g=b.sermat.record(c.constructor,!0),h=g.serializer.call(b.sermat,c),i=g.identifier;for(f+=(ID_REGEXP.exec(i)?i:a(i))+"(",e=0,d=h.length;d>e;e++)f+=(e?",":"")+a(b,h[e]);f+=")"}else{e=0,f+="{";for(var j in c)f+=(e++?",":"")+(ID_REGEXP.exec(j)?j:a(b,j))+":"+a(b,c[j]);f+="}"}return b.parents.pop(),f}return function(b,c){return c=c||this.modifiers,a({sermat:this,visited:[],parents:[],mode:coalesce(c.mode,this.modifiers.mode),allowUndefined:coalesce(c.allowUndefined,this.modifiers.allowUndefined),useConstructions:coalesce(c.useConstructions,this.modifiers.useConstructions)},b)}}(),EOL_RE=/\r\n?|\n/g,LEXER_RE=new RegExp([/\s+/,/\/\*(?:[\0-)+-.0-\uFFFF]*|\*+[\0-)+-.0-\uFFFF])*\*+\//,/[\$A-Z_a-z][\$\-\.\w]*/,/[+-]Infinity|[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/,/\"(?:[^\\\"]|\\[\0-\uFFFF])*\"/,/[\[\]\{\}\(\):,=]/,/.|$/].map(function(a){return a+="","("+a.substr(1,a.length-2)+")"}).join("|"),"g"),PARSE_TABLE=[[,10,11,3,13,,12,,,,,,,2,4,5,6,7,8,9,1],[,,,,,,,,,,,,,,,,,,,,,,0],[,,,,,-1,,-1,,-1,,-1,,,,,,,,,,,-1],[,,,,,-9,,-9,14,-9,,-9,15,,,,,,,,,,-9],[,,19,18,,,,17,,,,,,,,,,,,,,16],[,,,,,,,21,,,,20],[,10,11,3,13,23,12,,,,,,,2,4,5,6,7,8,9,22],[,,,,,25,,,,,,24],[,10,11,3,13,,12,,,27,,,,2,4,5,6,7,8,9,26],[,,,,,,,,,29,,28],[,,,,,-10,,-10,,-10,,-10,,,,,,,,,,,-10],[,,,,,-11,,-11,,-11,,-11,,,,,,,,,,,-11],[,,-13,-13,,,,-13],[,-19,-19,-19,-19,-19,-19],[,-23,-23,-23,-23,,-23,,,-23],[,,30,33,32,,31],[,,,,,,,,,,34],[,,,,,-3,,-3,,-3,,-3,,,,,,,,,,,-3],[,,,,,,,,,,-16],[,,,,,,,,,,-17],[,,19,18,,,,,,,,,,,,,,,,,,35],[,,,,,-4,,-4,,-4,,-4,,,,,,,,,,,-4],[,,,,,-20,,,,,,-20],[,,,,,-5,,-5,,-5,,-5,,,,,,,,,,,-5],[,10,11,3,13,,12,,,,,,,2,4,5,6,7,8,9,36],[,,,,,-6,,-6,,-6,,-6,,,,,,,,,,,-6],[,,,,,,,,,-24,,-24],[,,,,,-7,,-7,,-7,,-7,,,,,,,,,,,-7],[,10,11,3,13,,12,,,,,,,2,4,5,6,7,8,9,37],[,,,,,-8,,-8,,-8,,-8,,,,,,,,,,,-8],[,,,,,-2,,-2,,-2,,-2,,,,,,,,,,,-2],[,,-12,-12,,,,-12],[,-18,-18,-18,-18,-18,-18],[,,,,,,,,38],[,10,11,3,13,,12,,,,,,,2,4,5,6,7,8,9,39],[,,,,,,,,,,40],[,,,,,-21,,,,,,-21],[,,,,,,,,,-25,,-25],[,-22,-22,-22,-22,,-22,,,-22],[,,,,,,,-14,,,,-14],[,10,11,3,13,,12,,,,,,,2,4,5,6,7,8,9,41],[,,,,,,,-15,,,,-15]],parseString=function parseString(regexp,replacer,lit){return eval(lit.replace(regexp,replacer))}.bind(null,EOL_RE,function(a){return"\n"===a?"\\n":"\r"===a?"\\r":"\\r\\n"}),CONSTRUCTIONS={};[[Boolean,function(a){return[!!a]},function(a,b){return b&&new Boolean(b[0])}],[Number,function(a){return[+a]},function(a,b){return b&&new Number(b[0])}],[String,function(a){return[a+""]},function(a,b){return b&&new String(b[0])}],[Object,function(a){return[a]},function(a,b){return b&&b[0]}],[Array,function(a){return a},function(a,b){return a=a||[],b?a.concat(b):a}],[RegExp,function(a){var b=/^\/(.+?)\/([a-z]*)$/.exec(a+"");return b||raise("serialize_RegExp","Cannot serialize RegExp "+a+"!",{value:a}),[b[1],b[2]]},function(a,b){return b&&checkSignature("RegExp",/^(,string){1,2}$/,a,b)&&new RegExp(b[0],b[1]||"")}],[Date,function(a){return[a.getUTCFullYear(),a.getUTCMonth(),a.getUTCDate(),a.getUTCHours(),a.getUTCMinutes(),a.getUTCSeconds(),a.getUTCMilliseconds()]},function(a,b){return b&&checkSignature("Date",/^(,number){1,7}$/,a,b)&&new Date(Date.UTC(0|b[0],+b[1]||1,0|b[2],0|b[3],0|b[4],0|b[5],0|b[6]))}],[Function,function(a){var b=/^function\s*[\w$]*\s*\(((\s*[$\w]+\s*,?)*)\)\s*\{([\0-\uFFFF]*)\}$/.exec(a+"");return b||raise("serialize_Function","Could not serialize Function "+a+"!",{value:a}),b[1].split(/\s*,\s*/).concat([b[3]])},function(a,b){return b&&checkSignature("Function",/^(,string)+$/,a,b)&&Function.apply(null,b)}]].forEach(function(a){var b=identifier(a[0],!0),c={identifier:b,type:a[0],serializer:a[1],materializer:a[2]};Object.freeze(c),member(CONSTRUCTIONS,b,c,1)});var __members__={BASIC_MODE:BASIC_MODE,REPEAT_MODE:REPEAT_MODE,BINDING_MODE:BINDING_MODE,CIRCULAR_MODE:CIRCULAR_MODE,CONSTRUCTIONS:CONSTRUCTIONS,identifier:identifier,record:record,include:include,serialize:serialize,ser:serialize,serializeAsProperties:serializeAsProperties,materialize:materialize,mat:materialize,construct:construct,type:type,signature:signature,checkSignature:checkSignature,materializeWithConstructor:materializeWithConstructor,sermat:sermat};Object.keys(__members__).forEach(function(a){var b=__members__[a];member(Sermat.prototype,a,b)});var __SINGLETON__=new Sermat;return __SINGLETON__.include(["Date","RegExp"]),Object.keys(__members__).forEach(function(a){var b=__members__[a];member(Sermat,a,"function"==typeof b?b.bind(__SINGLETON__):b)}),member(Sermat,"registry",__SINGLETON__.registry),member(Sermat,"register",__SINGLETON__.register),member(Sermat,"modifiers",__SINGLETON__.modifiers),member(Sermat,"__package__","sermat"),member(Sermat,"__name__","Sermat"),member(Sermat,"__init__",__init__,4),member(Sermat,"__dependencies__",[],4),Sermat});
//# sourceMappingURL=sermat-amd-min.js.map