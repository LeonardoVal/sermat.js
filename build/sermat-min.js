var Sermat=function __init__(){"use strict";function raise(a,b){b.context&&(a=b.context+": "+a);var c=new Error(a);for(var d in b)c[d]=b[d];throw c}function member(a,b,c){Object.defineProperty(a,b,{value:c,writable:!1,configurable:!1,enumerable:!1})}function Sermat(){var a={};member(this,"record",record.bind(this,a)),member(this,"register",register.bind(this,a))}function identifier(a,b){var c=a.__SERMAT__&&a.__SERMAT__.identifier||a.name||(FUNCTION_ID_RE.exec(a+"")||[])[1];return!c&&b&&raise("Could not found id for constructor!",{constructorWithoutId:a,context:"SERMAT.identifier"}),c}function record(a,b){if("string"==typeof b)return a[b];var c=identifier(b,!0),d=a[c];return d||register(a,b)}function register(a,b,c,d){var e=identifier(b,!0);ID_REGEXP.exec(e)||raise("Invalid identifier '"+e+"'!",{invalidId:e,context:"Sermat.register"}),a.hasOwnProperty(e)&&raise("'"+e+"' is already registered!",{repeatedId:e,context:"Sermat.register"});var f=b.__SERMAT__;"undefined"==typeof c&&(c=f&&f.serializer),"function"!=typeof c&&raise("Serializer for '"+e+"' is not a function!",{invalidSerializer:c,context:"Sermat.register"}),"undefined"==typeof d&&(d=f&&f.materializer,"function"!=typeof d&&(d=materializeWithConstructor.bind(this,b))),"function"!=typeof d&&raise("Materializer for '"+e+"' is not a function!",{invalidMaterializer:d,context:"Sermat.register"});var g=a[e]={constructor:b,identifier:e,serializer:c,materializer:d};return Object.freeze(g),g}function materializeWithConstructor(a,b,c){return b||(b=Object.create(a.prototype),c)?(a.apply(b,c),b):b}function construct(a,b,c){var d=this.record(a);return d?d.materializer(b,c):void raise("Cannot materialize construction for '"+a+"'",{invalidId:a,context:"Sermat.construct"})}function materialize(a){function b(a){var b=k[a];return"undefined"==typeof b&&d("'"+a+"' is not bound",{unboundId:a}),b}function c(a,b){return"$"!=a.charAt(0)&&d("Invalid binding identifier '"+a+"'",{invalidId:a}),k.hasOwnProperty(a)&&d("'"+a+"' is already bound",{boundId:a}),k[a]=b}function d(b,c){c=c||{},c.offset=e,c.context="Sermat.materialize";var d=0,f=0;a.substr(0,e).replace(EOL_RE,function(a,b){return f=b+a.length,d++,""}),c.line=d+1,c.column=e-f,raise(b+" at line "+c.line+" column "+c.column+" (offset "+e+")!",c)}var e,f,g=new Array(50),h=new Array(50),i=0,j=this.construct.bind(this),k={"true":!0,"false":!1,"null":null,NaN:NaN,Infinity:1/0};h[0]=0;var l=function(){function a(a){return a}function e(a,b){var c=j(a[1],a[2],a[3]);return a[2]&&c!==a[2]&&d("Object initialization for "+a[1]+" failed",{oldValue:a[2],newValue:c}),a[0]?this.setBind(a[0],c):c}return[null,[20,1,a],[20,3,function(a,b,d){return c(a,d)}],[20,2,a],[20,2,a],[20,2,a],[20,2,a],[20,2,e],[20,2,e],[13,1,function(a){return b(a)}],[13,1,Number],[13,1,parseString],[14,3,function(a,b,d){return c(a,{})}],[14,1,function(a){return{}}],[15,4,function(a,b,c,d){return a[b]=d,a}],[15,5,function(a,b,c,d,e){return a[c]=e,a}],[21,1,a],[21,1,parseString],[16,3,function(a,b,d){return c(a,[])}],[16,1,function(a){return[]}],[17,2,function(a,b){return a.push(b),a}],[17,3,function(a,b,c){return a.push(c),a}],[18,4,function(a,b,d,e){var f=j(d,null,null);return f?[null,d,c(a,f),[]]:[a,d,f,[]]}],[18,2,function(a,b,c){return[null,a,null,[]]}],[19,2,function(a,b){return a[3].push(b),a}],[19,3,function(a,b,c){return a[3].push(c),a}]]}();return a.replace(LEXER_RE,function(a,b,c,j,k,m,n,o,p){if(b||c)return"";e=p;for(var q,r,s=k?1:m?2:j?3:n?"[]{}():,=".indexOf(n)+4:o?23:22;;){if(q=PARSE_TABLE[h[i]+"|"+s],0>q){if(r=l[-q]){i+=1-r[1],g[i]=r[2].apply(null,g.slice(i,i+r[1])),h[i]=PARSE_TABLE[h[i-1]+"|"+r[0]];continue}}else{if(q>0)return h[++i]=q,g[i]=a,"";if(0==q)return f=g[i],""}d("Parse error")}}),f}function type(a){var b=typeof a;return"object"===b?a?identifier(a.constructor):"":b}function signature(a,b){return type(a)+","+b.map(type).join(",")}function sermat(a,b){return this.mat(this.ser(a,b))}var __SINGLETON__=new Sermat,FUNCTION_ID_RE=/^\s*function\s+([\w\$]+)/,ID_REGEXP=/^[\$A-Z_a-z][\$\-\.\w]*$/,ALLOW_UNDEFINED=1,ALLOW_REPEATED=2,ALLOW_BINDINGS=4,ALLOW_CIRCULAR=8,FORBID_CONSTRUCTIONS=16,serialize=function(){function a(a,c){switch(typeof c){case"undefined":if(a.modifiers&ALLOW_UNDEFINED)return"null";raise("Cannot serialize undefined value!",{context:"Sermat.serialize"});case"boolean":case"number":return c+"";case"string":return'"'+c.replace(/[\\\"]/g,"\\$&")+'"';case"function":case"object":return b(a,c)}}function b(b,c){if(!c)return"null";b.parents.indexOf(c)>=0&&!(b.modifiers&ALLOW_CIRCULAR)&&raise("Circular reference detected!",{circularReference:c,context:"Sermat.serialize"});var d,e=b.visited.indexOf(c),f="";if(e>=0){if(b.modifiers&ALLOW_BINDINGS)return"$"+e;b.modifiers&ALLOW_REPEATED||raise("Repeated reference detected!",{repeatedReference:c,context:"Sermat.serialize"})}else e=b.visited.push(c)-1,b.modifiers&ALLOW_BINDINGS&&(f="$"+e+"=");if(b.parents.push(c),Array.isArray(c)){for(f+="[",e=0,d=c.length;d>e;e++)f+=(e?",":"")+a(b,c[e]);f+="]"}else if(c.constructor===Object||b.modifiers&FORBID_CONSTRUCTIONS){e=0,f+="{";for(var g in c)f+=(e++?",":"")+(ID_REGEXP.exec(g)?g:a(b,g))+":"+a(b,c[g]);f+="}"}else{var h=b.record(c.constructor),i=h.serializer(c),j=h.identifier;for(f+=(ID_REGEXP.exec(j)?j:a(j))+"(",e=0,d=i.length;d>e;e++)f+=(e?",":"")+a(b,i[e]);f+=")"}return b.parents.pop(),f}return function(b,c){return c=0|c,c&ALLOW_CIRCULAR&&(c|=ALLOW_BINDINGS),a({visited:[],parents:[],record:this.record.bind(this),modifiers:c},b)}}(),EOL_RE=/\r\n?|\n/g,LEXER_RE=new RegExp([/\s+/,/\/\*(?:[\0-)+-.0-\uFFFF]*|\*+[\0-)+-.0-\uFFFF])*\*+\//,/[\$A-Z_a-z][\$\-\.\w]*/,/[+-]Infinity|[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/,/\"(?:[^\\\"]|\\[\0-\uFFFF])*\"/,/[\[\]\{\}\(\):,=]/,/.|$/].map(function(a){return a+="","("+a.substr(1,a.length-2)+")"}).join("|"),"g"),PARSE_TABLE={"0|1":10,"0|13":2,"0|14":4,"0|15":5,"0|16":6,"0|17":7,"0|18":8,"0|19":9,"0|2":11,"0|20":1,"0|3":3,"0|4":13,"0|6":12,"10|11":-10,"10|22":-10,"10|5":-10,"10|7":-10,"10|9":-10,"11|11":-11,"11|22":-11,"11|5":-11,"11|7":-11,"11|9":-11,"12|2":-13,"12|3":-13,"12|7":-13,"13|1":-19,"13|2":-19,"13|3":-19,"13|4":-19,"13|5":-19,"13|6":-19,"14|1":-23,"14|2":-23,"14|3":-23,"14|4":-23,"14|6":-23,"14|9":-23,"15|2":30,"15|3":33,"15|4":32,"15|6":31,"16|10":34,"17|11":-3,"17|22":-3,"17|5":-3,"17|7":-3,"17|9":-3,"18|10":-16,"19|10":-17,"1|22":0,"20|2":19,"20|21":35,"20|3":18,"21|11":-4,"21|22":-4,"21|5":-4,"21|7":-4,"21|9":-4,"22|11":-20,"22|5":-20,"23|11":-5,"23|22":-5,"23|5":-5,"23|7":-5,"23|9":-5,"24|1":10,"24|13":2,"24|14":4,"24|15":5,"24|16":6,"24|17":7,"24|18":8,"24|19":9,"24|2":11,"24|20":36,"24|3":3,"24|4":13,"24|6":12,"25|11":-6,"25|22":-6,"25|5":-6,"25|7":-6,"25|9":-6,"26|11":-24,"26|9":-24,"27|11":-7,"27|22":-7,"27|5":-7,"27|7":-7,"27|9":-7,"28|1":10,"28|13":2,"28|14":4,"28|15":5,"28|16":6,"28|17":7,"28|18":8,"28|19":9,"28|2":11,"28|20":37,"28|3":3,"28|4":13,"28|6":12,"29|11":-8,"29|22":-8,"29|5":-8,"29|7":-8,"29|9":-8,"2|11":-1,"2|22":-1,"2|5":-1,"2|7":-1,"2|9":-1,"30|11":-2,"30|22":-2,"30|5":-2,"30|7":-2,"30|9":-2,"31|2":-12,"31|3":-12,"31|7":-12,"32|1":-18,"32|2":-18,"32|3":-18,"32|4":-18,"32|5":-18,"32|6":-18,"33|8":38,"34|1":10,"34|13":2,"34|14":4,"34|15":5,"34|16":6,"34|17":7,"34|18":8,"34|19":9,"34|2":11,"34|20":39,"34|3":3,"34|4":13,"34|6":12,"35|10":40,"36|11":-21,"36|5":-21,"37|11":-25,"37|9":-25,"38|1":-22,"38|2":-22,"38|3":-22,"38|4":-22,"38|6":-22,"38|9":-22,"39|11":-14,"39|7":-14,"3|11":-9,"3|12":15,"3|22":-9,"3|5":-9,"3|7":-9,"3|8":14,"3|9":-9,"40|1":10,"40|13":2,"40|14":4,"40|15":5,"40|16":6,"40|17":7,"40|18":8,"40|19":9,"40|2":11,"40|20":41,"40|3":3,"40|4":13,"40|6":12,"41|11":-15,"41|7":-15,"4|2":19,"4|21":16,"4|3":18,"4|7":17,"5|11":20,"5|7":21,"6|1":10,"6|13":2,"6|14":4,"6|15":5,"6|16":6,"6|17":7,"6|18":8,"6|19":9,"6|2":11,"6|20":22,"6|3":3,"6|4":13,"6|5":23,"6|6":12,"7|11":24,"7|5":25,"8|1":10,"8|13":2,"8|14":4,"8|15":5,"8|16":6,"8|17":7,"8|18":8,"8|19":9,"8|2":11,"8|20":26,"8|3":3,"8|4":13,"8|6":12,"8|9":27,"9|11":28,"9|9":29},parseString=function parseString(regexp,replacer,lit){return eval(lit.replace(regexp,replacer))}.bind(null,EOL_RE,function(a){return"\n"===a?"\\n":"\r"===a?"\\r":"\\r\\n"}),CONSTRUCTIONS={};return register(CONSTRUCTIONS,Boolean,function(a){return[!!a]},function(a,b){return b&&new Boolean(b[0])}),register(CONSTRUCTIONS,Number,function(a){return[+a]},function(a,b){return b&&new Number(b[0])}),register(CONSTRUCTIONS,String,function(a){return[a+""]},function(a,b){return b&&new String(b[0])}),register(CONSTRUCTIONS,Object,function(a){return[a]},function(a,b){return b&&b[0]}),register(CONSTRUCTIONS,Array,function(a){return a},function(a,b){return a=a||[],b?a.concat(b):a}),register(CONSTRUCTIONS,RegExp,function(a){var b=/^\/(.+?)\/([a-z]*)$/.exec(a+"");return b||raise("Cannot serialize RegExp "+a+"!",{value:a,context:"Sermat.serialize_RegExp"}),[b[1],b[2]]},function(a,b){return b?(/^(,string){1,2}$/.exec(signature(a,b))||raise("Cannot materialize RegExp!",{obj:a,args:b,context:"Sermat.materialize_RegExp"}),new RegExp(b[0],b[1]||"")):null}),register(CONSTRUCTIONS,Date,function(a){return[a.getUTCFullYear(),a.getUTCMonth(),a.getUTCDate(),a.getUTCHours(),a.getUTCMinutes(),a.getUTCSeconds(),a.getUTCMilliseconds()]},function(a,b){return b?(/^(,number){1,7}$/.exec(signature(a,b))||raise("Cannot materialize Date!",{obj:a,args:b,context:"Sermat.materialize_Date"}),new Date(Date.UTC(0|b[0],+b[1]||1,0|b[2],0|b[3],0|b[4],0|b[5],0|b[6]))):null}),register(CONSTRUCTIONS,Function,function(a){var b=/^function\s*[\w$]*\s*\(((\s*[$\w]+\s*,?)*)\)\s*\{(.*)\}$/.exec(a+"");return b||raise("Could not serialize Function "+a+"!",{context:"Sermat.serialize_Function",value:a}),b[1].split(/\s*,\s*/).concat([b[3]])},function(a,b){return b?(/^(,string)+$/.exec(signature(a,b))||raise("Cannot materialize Function!",{obj:a,args:b,context:"Sermat.materialize_Function"}),Function.apply(null,b)):null}),function(a){Object.keys(a).forEach(function(b){var c=a[b];member(Sermat.prototype,b,c),member(Sermat,b,"function"==typeof c?c.bind(__SINGLETON__):c)})}({ALLOW_UNDEFINED:ALLOW_UNDEFINED,ALLOW_REPEATED:ALLOW_REPEATED,ALLOW_BINDINGS:ALLOW_BINDINGS,ALLOW_CIRCULAR:ALLOW_CIRCULAR,FORBID_CONSTRUCTIONS:FORBID_CONSTRUCTIONS,CONSTRUCTIONS:CONSTRUCTIONS,identifier:identifier,construct:construct,materializeWithConstructor:materializeWithConstructor,type:type,signature:signature,serialize:serialize,ser:serialize,materialize:materialize,mat:materialize,sermat:sermat}),member(Sermat,"register",__SINGLETON__.register),member(Sermat,"record",__SINGLETON__.record),[Boolean,Number,String,Object,Array,Date,RegExp].forEach(function(a){var b=record(CONSTRUCTIONS,a);Sermat.register(a,b.serializer,b.materializer)}),Object.freeze(Sermat),Object.freeze(Sermat.prototype),Sermat}();
//# sourceMappingURL=sermat-min.js.map