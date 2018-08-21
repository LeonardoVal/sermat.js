/** Gruntfile for [sermat.js](http://github.com/LeonardoVal/sermat.js).
*/
module.exports = function (grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
	});

	require('creatartis-grunt').config(grunt, {
		globalName: 'Sermat',
		sourceNames: ['__prologue__',
				'registry',
				'serialization',
				'materialization',
				'utilities',
				'constructions',
				'wrapup',
			'__epilogue__'],
		deps: [],
		targets: {
			build_umd:  { fileName: 'build/sermat',      wrapper: 'umd' },
			build_amd:  { fileName: 'build/sermat-amd',  wrapper: 'amd' },
			build_node: { fileName: 'build/sermat-node', wrapper: 'node' },
			build_tag:  { fileName: 'build/sermat-tag',  wrapper: 'tag' }
		},
		jshint: { //TODO Fix these warnings.
			proto: true,
			laxbreak: true,
			validthis: true,
			evil: true,
			'-W053': true,
			'-W086': true
		},
		perf: true,
		connect: {
			console: 'tests/console.html'
		}
	});

	grunt.registerTask('default', ['build']);
	grunt.registerTask('console', ['compile', 'connect:console']);
};