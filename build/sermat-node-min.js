module.exports=function __init__(){"use strict";function raise(a,b,c){var d=new Error("Sermat."+a+": "+b);throw c&&(d.data=c),d}function member(a,b,c,d){d=0|d,Object.defineProperty(a,b,{value:c,writable:4&d,configurable:2&d,enumerable:1&d})}function coalesce(a,b){return"undefined"==typeof a?b:a}function entry(a,b,c,d){var e={identifier:a,constructor:b,serializer:c,materializer:d};return Object.freeze(e),e}function identifier(a,b){var c=a.__SERMAT__&&a.__SERMAT__.identifier||a.name||(FUNCTION_ID_RE.exec(a+"")||[])[1];return!c&&b&&raise("identifier","Could not found id for constructor!",{constructorWithoutId:a}),c}function record(a){if("string"==typeof a)return this.registry[a];var b=identifier(a,!0),c=this.registry[b];return c||this.register(a)}function register(a,b,c,d){switch(typeof b){case"function":break;case"string":return register(a,CONSTRUCTIONS[b]);case"object":return Array.isArray(b)?b.map(function(b){return register(a,b)}):register(a,b.constructor,b.serializer,b.materializer);default:raise("register","Constructor is not a function!",{invalidConstructor:b})}var e=identifier(b,!0);ID_REGEXP.exec(e)||raise("register","Invalid identifier '"+e+"'!",{invalidId:e}),a.hasOwnProperty(e)&&raise("register","'"+e+"' is already registered!",{repeatedId:e});var f=b.__SERMAT__;return"undefined"==typeof c&&(c=f&&f.serializer),"function"!=typeof c&&raise("register","Serializer for '"+e+"' is not a function!",{invalidSerializer:c}),"undefined"==typeof d&&(d=f&&f.materializer,"function"!=typeof d&&(d=materializeWithConstructor.bind(this,b))),"function"!=typeof d&&raise("register","Materializer for '"+e+"' is not a function!",{invalidMaterializer:d}),a[e]=entry(e,b,c,d)}function materializeWithConstructor(a,b,c){return b||(b=Object.create(a.prototype),c)?(a.apply(b,c),b):b}function serializeWithProperties(a,b){for(var c,d={},e=0,f=b.length;f>e;e++)c=b[e],d[c]=a[c];return[d]}function construct(a,b,c){var d=this.record(a);return d?d.materializer.call(this,b,c):void raise("construct","Cannot materialize construction for '"+a+"'",{invalidId:a})}function materialize(a){function b(a){var b=k[a];return"undefined"==typeof b&&d("'"+a+"' is not bound",{unboundId:a}),b}function c(a,b){return"$"!=a.charAt(0)&&d("Invalid binding identifier '"+a+"'",{invalidId:a}),k.hasOwnProperty(a)&&d("'"+a+"' is already bound",{boundId:a}),k[a]=b}function d(b,c){c=c||{},c.offset=e;var d=0,f=0;a.substr(0,e).replace(EOL_RE,function(a,b){return f=b+a.length,d++,""}),c.line=d+1,c.column=e-f,raise("materialize",b+" at line "+c.line+" column "+c.column+" (offset "+e+")!",c)}var e,f,g=new Array(50),h=new Array(50),i=0,j=this.construct.bind(this),k={"true":!0,"false":!1,"null":null,NaN:NaN,Infinity:1/0};h[0]=0;var l=function(){function a(a){return a}function e(a,b){var c=j(a[1],a[2],a[3]);return a[2]&&c!==a[2]&&d("Object initialization for "+a[1]+" failed",{oldValue:a[2],newValue:c}),a[0]?this.setBind(a[0],c):c}return[null,[20,1,a],[20,3,function(a,b,d){return c(a,d)}],[20,2,a],[20,2,a],[20,2,a],[20,2,a],[20,2,e],[20,2,e],[13,1,function(a){return b(a)}],[13,1,Number],[13,1,parseString],[14,3,function(a,b,d){return c(a,{})}],[14,1,function(a){return{}}],[15,4,function(a,b,c,d){return a[b]=d,a}],[15,5,function(a,b,c,d,e){return a[c]=e,a}],[21,1,a],[21,1,parseString],[16,3,function(a,b,d){return c(a,[])}],[16,1,function(a){return[]}],[17,2,function(a,b){return a.push(b),a}],[17,3,function(a,b,c){return a.push(c),a}],[18,4,function(a,b,d,e){var f=j(d,null,null);return f?[null,d,c(a,f),[]]:[a,d,f,[]]}],[18,2,function(a,b,c){return[null,a,null,[]]}],[19,2,function(a,b){return a[3].push(b),a}],[19,3,function(a,b,c){return a[3].push(c),a}]]}();return a.replace(LEXER_RE,function(a,b,c,j,k,m,n,o,p){if(b||c)return"";e=p;for(var q,r,s=k?1:m?2:j?3:n?"[]{}():,=".indexOf(n)+4:o?23:22;;){if(q=PARSE_TABLE[h[i]+"|"+s],0>q){if(r=l[-q]){i+=1-r[1],g[i]=r[2].apply(null,g.slice(i,i+r[1])),h[i]=PARSE_TABLE[h[i-1]+"|"+r[0]];continue}}else{if(q>0)return h[++i]=q,g[i]=a,"";if(0==q)return f=g[i],""}d("Parse error")}}),f}function type(a){var b=typeof a;return"object"===b?a?identifier(a.constructor):"":b}function signature(a,b){return type(a)+","+b.map(type).join(",")}function checkSignature(a,b,c,d){var e=signature(c,d);return b.exec(e)||raise("checkSignature","Wrong arguments for construction of "+a+" ("+e+")!",{id:a,obj:c,args:d}),!0}function Sermat(a){var b={},c=register.bind(this,b);member(this,"registry",b),member(this,"register",c),a=a||{},this.mode=coalesce(a.mode,BASIC_MODE),this.allowUndefined=coalesce(a.allowUndefined,!1),this.useConstructions=coalesce(a.useConstructions,!0),c(["Boolean","Number","String","Object","Array"])}var FUNCTION_ID_RE=/^\s*function\s+([\w\$]+)/,ID_REGEXP=/^[\$A-Z_a-z][\$\-\.\w]*$/,BASIC_MODE=0,REPEAT_MODE=1,BINDING_MODE=2,CIRCULAR_MODE=3,serialize=function(){function a(a,c){switch(typeof c){case"undefined":if(a.allowUndefined)return"null";raise("serialize","Cannot serialize undefined value!");case"boolean":case"number":return c+"";case"string":return'"'+c.replace(/[\\\"]/g,"\\$&")+'"';case"function":case"object":return b(a,c)}}function b(b,c){if(!c)return"null";b.parents.indexOf(c)>=0&&b.mode!==CIRCULAR_MODE&&raise("serialize","Circular reference detected!",{circularReference:c});var d,e=b.visited.indexOf(c),f="";if(e>=0){if(b.mode&BINDING_MODE)return"$"+e;b.mode!==REPEAT_MODE&&raise("serialize","Repeated reference detected!",{repeatedReference:c})}else e=b.visited.push(c)-1,b.mode&BINDING_MODE&&(f="$"+e+"=");if(b.parents.push(c),Array.isArray(c)){for(f+="[",e=0,d=c.length;d>e;e++)f+=(e?",":"")+a(b,c[e]);f+="]"}else if(c.constructor!==Object&&b.useConstructions){var g=b.Sermat.record(c.constructor),h=g.serializer.call(b.Sermat,c),i=g.identifier;for(f+=(ID_REGEXP.exec(i)?i:a(i))+"(",e=0,d=h.length;d>e;e++)f+=(e?",":"")+a(b,h[e]);f+=")"}else{e=0,f+="{";for(var j in c)f+=(e++?",":"")+(ID_REGEXP.exec(j)?j:a(b,j))+":"+a(b,c[j]);f+="}"}return b.parents.pop(),f}return function(b,c){return c=c||{},a({Sermat:this,visited:[],parents:[],mode:coalesce(c.mode,this.mode),allowUndefined:coalesce(c.allowUndefined,this.allowUndefined),useConstructions:coalesce(c.useConstructions,this.useConstructions)},b)}}(),EOL_RE=/\r\n?|\n/g,LEXER_RE=new RegExp([/\s+/,/\/\*(?:[\0-)+-.0-\uFFFF]*|\*+[\0-)+-.0-\uFFFF])*\*+\//,/[\$A-Z_a-z][\$\-\.\w]*/,/[+-]Infinity|[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/,/\"(?:[^\\\"]|\\[\0-\uFFFF])*\"/,/[\[\]\{\}\(\):,=]/,/.|$/].map(function(a){return a+="","("+a.substr(1,a.length-2)+")"}).join("|"),"g"),PARSE_TABLE={"0|1":10,"0|13":2,"0|14":4,"0|15":5,"0|16":6,"0|17":7,"0|18":8,"0|19":9,"0|2":11,"0|20":1,"0|3":3,"0|4":13,"0|6":12,"10|11":-10,"10|22":-10,"10|5":-10,"10|7":-10,"10|9":-10,"11|11":-11,"11|22":-11,"11|5":-11,"11|7":-11,"11|9":-11,"12|2":-13,"12|3":-13,"12|7":-13,"13|1":-19,"13|2":-19,"13|3":-19,"13|4":-19,"13|5":-19,"13|6":-19,"14|1":-23,"14|2":-23,"14|3":-23,"14|4":-23,"14|6":-23,"14|9":-23,"15|2":30,"15|3":33,"15|4":32,"15|6":31,"16|10":34,"17|11":-3,"17|22":-3,"17|5":-3,"17|7":-3,"17|9":-3,"18|10":-16,"19|10":-17,"1|22":0,"20|2":19,"20|21":35,"20|3":18,"21|11":-4,"21|22":-4,"21|5":-4,"21|7":-4,"21|9":-4,"22|11":-20,"22|5":-20,"23|11":-5,"23|22":-5,"23|5":-5,"23|7":-5,"23|9":-5,"24|1":10,"24|13":2,"24|14":4,"24|15":5,"24|16":6,"24|17":7,"24|18":8,"24|19":9,"24|2":11,"24|20":36,"24|3":3,"24|4":13,"24|6":12,"25|11":-6,"25|22":-6,"25|5":-6,"25|7":-6,"25|9":-6,"26|11":-24,"26|9":-24,"27|11":-7,"27|22":-7,"27|5":-7,"27|7":-7,"27|9":-7,"28|1":10,"28|13":2,"28|14":4,"28|15":5,"28|16":6,"28|17":7,"28|18":8,"28|19":9,"28|2":11,"28|20":37,"28|3":3,"28|4":13,"28|6":12,"29|11":-8,"29|22":-8,"29|5":-8,"29|7":-8,"29|9":-8,"2|11":-1,"2|22":-1,"2|5":-1,"2|7":-1,"2|9":-1,"30|11":-2,"30|22":-2,"30|5":-2,"30|7":-2,"30|9":-2,"31|2":-12,"31|3":-12,"31|7":-12,"32|1":-18,"32|2":-18,"32|3":-18,"32|4":-18,"32|5":-18,"32|6":-18,"33|8":38,"34|1":10,"34|13":2,"34|14":4,"34|15":5,"34|16":6,"34|17":7,"34|18":8,"34|19":9,"34|2":11,"34|20":39,"34|3":3,"34|4":13,"34|6":12,"35|10":40,"36|11":-21,"36|5":-21,"37|11":-25,"37|9":-25,"38|1":-22,"38|2":-22,"38|3":-22,"38|4":-22,"38|6":-22,"38|9":-22,"39|11":-14,"39|7":-14,"3|11":-9,"3|12":15,"3|22":-9,"3|5":-9,"3|7":-9,"3|8":14,"3|9":-9,"40|1":10,"40|13":2,"40|14":4,"40|15":5,"40|16":6,"40|17":7,"40|18":8,"40|19":9,"40|2":11,"40|20":41,"40|3":3,"40|4":13,"40|6":12,"41|11":-15,"41|7":-15,"4|2":19,"4|21":16,"4|3":18,"4|7":17,"5|11":20,"5|7":21,"6|1":10,"6|13":2,"6|14":4,"6|15":5,"6|16":6,"6|17":7,"6|18":8,"6|19":9,"6|2":11,"6|20":22,"6|3":3,"6|4":13,"6|5":23,"6|6":12,"7|11":24,"7|5":25,"8|1":10,"8|13":2,"8|14":4,"8|15":5,"8|16":6,"8|17":7,"8|18":8,"8|19":9,"8|2":11,"8|20":26,"8|3":3,"8|4":13,"8|6":12,"8|9":27,"9|11":28,"9|9":29},parseString=function parseString(regexp,replacer,lit){return eval(lit.replace(regexp,replacer))}.bind(null,EOL_RE,function(a){return"\n"===a?"\\n":"\r"===a?"\\r":"\\r\\n"}),CONSTRUCTIONS={};[[Boolean,function(a){return[!!a]},function(a,b){return b&&new Boolean(b[0])}],[Number,function(a){return[+a]},function(a,b){return b&&new Number(b[0])}],[String,function(a){return[a+""]},function(a,b){return b&&new String(b[0])}],[Object,function(a){return[a]},function(a,b){return b&&b[0]}],[Array,function(a){return a},function(a,b){return a=a||[],b?a.concat(b):a}],[RegExp,function(a){var b=/^\/(.+?)\/([a-z]*)$/.exec(a+"");return b||raise("serialize_RegExp","Cannot serialize RegExp "+a+"!",{value:a}),[b[1],b[2]]},function(a,b){return b&&checkSignature("RegExp",/^(,string){1,2}$/,a,b)&&new RegExp(b[0],b[1]||"")}],[Date,function(a){return[a.getUTCFullYear(),a.getUTCMonth(),a.getUTCDate(),a.getUTCHours(),a.getUTCMinutes(),a.getUTCSeconds(),a.getUTCMilliseconds()]},function(a,b){return b&&checkSignature("Date",/^(,number){1,7}$/,a,b)&&new Date(Date.UTC(0|b[0],+b[1]||1,0|b[2],0|b[3],0|b[4],0|b[5],0|b[6]))}],[Function,function(a){var b=/^function\s*[\w$]*\s*\(((\s*[$\w]+\s*,?)*)\)\s*\{([\0-\uFFFF]*)\}$/.exec(a+"");return b||raise("serialize_Function","Could not serialize Function "+a+"!",{value:a}),b[1].split(/\s*,\s*/).concat([b[3]])},function(a,b){return b&&checkSignature("Function",/^(,string)+$/,a,b)&&Function.apply(null,b)}]].forEach(function(a){var b=identifier(a[0],!0);member(CONSTRUCTIONS,b,entry(b,a[0],a[1],a[2]),1)});var __SINGLETON__=new Sermat;return __SINGLETON__.register(["Date","RegExp"]),function(a){Object.keys(a).forEach(function(b){var c=a[b];member(Sermat.prototype,b,c),member(Sermat,b,"function"==typeof c?c.bind(__SINGLETON__):c)})}({BASIC_MODE:BASIC_MODE,REPEAT_MODE:REPEAT_MODE,BINDING_MODE:BINDING_MODE,CIRCULAR_MODE:CIRCULAR_MODE,CONSTRUCTIONS:CONSTRUCTIONS,identifier:identifier,record:record,serialize:serialize,ser:serialize,serializeWithProperties:serializeWithProperties,materialize:materialize,mat:materialize,construct:construct,type:type,signature:signature,checkSignature:checkSignature,materializeWithConstructor:materializeWithConstructor,sermat:function(a,b){return this.mat(this.ser(a,b))}}),member(Sermat,"registry",__SINGLETON__.registry),member(Sermat,"register",__SINGLETON__.register),member(Sermat,"__package__","sermat"),member(Sermat,"__name__","Sermat"),Sermat.__init__=__init__,Sermat.__dependencies__=[],Sermat}();
//# sourceMappingURL=sermat-node-min.js.map