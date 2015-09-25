/** # Binary support 

Sermat includes a custom base 85 encoding (similar to [ascii85](https://en.wikipedia.org/wiki/Ascii85)) 
of Javascript's byte arrays. It is more space efficient than base64. Assuming UTF8 text enconding, 
each 100 characters in base 64 encoded strings hold around 75 bytes, while 100 characters in base 85
hold around 80 bytes.

The characters used are in the range `[\x21-\x7F]` excluing `"$%&'``<>\`. These are special 
characters in XML and in the syntax of string literals in many programming language and macro 
systems. Not using these characters allows the encoded strings to be embedded in XML and string 
literals safely without requiring escape sequences.
*/
var CHARS85 = '!#()*+,-./0123456789:;=?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_abcdefghijklmnopqrstuvwxyz{|}~',
	DIGITS85 = (function () {
		var r = {};
		for (var i = 0; i < 85; i++) {
			r[CHARS85.charAt(i)] = i;
		}
		return r;
	})();

function enc85(num) {
	var result = '', div;
	while (num !== 0 || result.length < 5) {
		div = Math.floor(num / 85);
		result = CHARS85[num - div * 85] + result;
		num = div;
	}
	return result;
}
	
function encode85(buffer) {
	var view = new DataView(buffer),
		result = '', i = 0, len = view.byteLength;
	switch (len % 4) {
		case 1: result += enc85(0x101010000 + view.getUint8(i++)); break;
		case 2: result += enc85(0x101000000 + view.getUint8(i++) * 0x100 + 
			view.getUint8(i++)); break;
		case 3: result += enc85(0x100000000 + view.getUint8(i++) * 0x10000 +
			view.getUint8(i++) * 0x100 + view.getUint8(i++)); break;
	}
	while (i < len) {
		result += enc85(view.getUint8(i++) * 0x1000000 + view.getUint8(i++) * 0x10000 +
			view.getUint8(i++) * 0x100 + view.getUint8(i++));
	}
	return result;
}

function dec85(str) {
	var result = 0;
	for (var i = 0, len = str.length; i < len; i++) {
		result = DIGITS85[str[i]] + 85 * result;
	}
	return result;
}

function decode85(string) {
	var len = string.length, i = 0, j = 0,
		buffer, view, num;
	if (len < 1) {
		return new ArrayBuffer(0);
	}
	num = dec85(string.substr(0, 5));
	buffer = new ArrayBuffer((len / 5 - 1) * 4 + 
		(num < 0x100000000 ? 4 : num < 0x101000000 ? 3 : num < 0x101010000 ? 2 : 1)
	);
	view = new DataView(buffer);
	len = buffer.byteLength;
	if (num < 0x100000000) {
		view.setUint8(i++, Math.floor(num / 0x1000000));
	}
	if (num < 0x101000000) {
		view.setUint8(i++, (num & 0xFF0000) >> 16);
	}
	if (num < 0x101010000) {
		view.setUint8(i++, (num & 0xFF00) >> 8);
	}
	view.setUint8(i++, num & 0xFF);
	while (i < len) {
		num = dec85(string.substr(j += 5, 5));
		view.setUint8(i++, Math.floor(num / 0x1000000)); // Cannot use bitwise because 32 bits are signed.
		view.setUint8(i++, (num & 0xFF0000) >> 16);
		view.setUint8(i++, (num & 0xFF00) >> 8);
		view.setUint8(i++, num & 0xFF);
	}
	return buffer;
}

function typedArraySerializer(value) {
	return [this.encode85(value.buffer)];
}

function typedArrayMaterializer(id, arrayType) {
	return function (obj, args) {
		return args
			&& checkSignature(id, /^,string$/, obj, args)
			&& new arrayType(this.decode85(args[0]));
	};
}