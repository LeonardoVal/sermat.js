/** Gruntfile for [sermat.js](http://github.com/LeonardoVal/sermat.js).
*/
var sourceFiles = ['__prologue__',
		'registry',
		'serialization',
		'materialization',
		'utilities',
		'constructions',
		'wrapup',
	'__epilogue__'].map(function (module) {
		return 'src/'+ module +'.js';
	});

var UMDWrapper = function (init) { "use strict";
	if (typeof define === 'function' && define.amd) {
		define([], init); // AMD module.
	} else if (typeof exports === 'object' && module.exports) {
		module.exports = init(); // CommonJS module.
	} else {
		this.Sermat = init(); // Browser.
	}
};

module.exports = function(grunt) {
	grunt.file.defaultEncoding = 'utf8';
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		concat: { //////////////////////////////////////////////////////////////////////////////////
			options: {
				separator: '\n\n',
				sourceMap: true
			},
			build_simple: {
				options: {
					banner: 'var Sermat = (',
					footer: ')();'
				},
				src: sourceFiles,
				dest: 'build/<%= pkg.name %>.js',
			},
			build_node: {
				options: {
					banner: 'module.exports = (',
					footer: ')();'
				},
				src: sourceFiles,
				dest: 'build/<%= pkg.name %>-node.js',
			},
			build_amd: {
				options: {
					banner: 'define([], ',
					footer: ');'
				},
				src: sourceFiles,
				dest: 'build/<%= pkg.name %>-amd.js',
			},
			build_umd: {
				options: {
					banner: '('+ UMDWrapper +').call(this,',
					footer: ');'
				},
				src: sourceFiles,
				dest: 'build/<%= pkg.name %>-umd.js',
			}
		},
		uglify: { //////////////////////////////////////////////////////////////////////////////////
			options: {
				report: 'min',
				sourceMap: true
			},
			build_simple: {
				src: 'build/<%= pkg.name %>.js',
				dest: 'build/<%= pkg.name %>-min.js',
				options: {
					sourceMapIn: 'build/<%= pkg.name %>.js.map',
					sourceMapName: 'build/<%= pkg.name %>-min.js.map'
				}
			},
			build_amd: {
				src: 'build/<%= pkg.name %>-amd.js',
				dest: 'build/<%= pkg.name %>-amd-min.js',
				options: {
					sourceMapIn: 'build/<%= pkg.name %>-amd.js.map',
					sourceMapName: 'build/<%= pkg.name %>-amd-min.js.map'
				}
			},
			build_node: {
				src: 'build/<%= pkg.name %>-node.js',
				dest: 'build/<%= pkg.name %>-node-min.js',
				options: {
					sourceMapIn: 'build/<%= pkg.name %>-node.js.map',
					sourceMapName: 'build/<%= pkg.name %>-node-min.js.map'
				}
			},
			build_umd: {
				src: 'build/<%= pkg.name %>-umd.js',
				dest: 'build/<%= pkg.name %>-umd-min.js',
				options: {
					sourceMapIn: 'build/<%= pkg.name %>-umd.js.map',
					sourceMapName: 'build/<%= pkg.name %>-umd-min.js.map'
				}
			}
		},
		karma: { ///////////////////////////////////////////////////////////////////////////////////
			options: {
				configFile: 'test/karma.conf.js'
			},
			test_chrome: { browsers: ['Chrome'] },
			test_firefox: { browsers: ['Firefox'] }
		},
		benchmark: { ///////////////////////////////////////////////////////////////////////////////
			build: {
				src: ['test/benchmarks/*.benchmark.js'],
				//dest: 'tests/benchmarks/benchmarks.csv'
			}
		},
		docker: { //////////////////////////////////////////////////////////////////////////////////
			document: {
				src: sourceFiles.concat(['README.md', 'docs/*.md']),
				dest: 'docs/docker',
				options: {
					colourScheme: 'borland',
					ignoreHidden: true,
					exclude: 'src/__prologue__.js,src/__epilogue__.js'
				}
			}
		}
	});
// Load tasks. /////////////////////////////////////////////////////////////////////////////////////
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-karma');
	grunt.loadNpmTasks('grunt-benchmark');
	grunt.loadNpmTasks('grunt-docker');
	
// Register tasks. /////////////////////////////////////////////////////////////////////////////////
	grunt.registerTask('compile', [
		'concat:build_simple', 'uglify:build_simple',
		'concat:build_amd', 'uglify:build_amd',
		'concat:build_node', 'uglify:build_node',
		'concat:build_umd', 'uglify:build_umd'
	]); 
	grunt.registerTask('test', ['compile', 'karma:test_firefox', 'karma:test_chrome']);
	grunt.registerTask('perf', ['compile', 'benchmark:build']);
	grunt.registerTask('build', ['compile', 'karma:test_firefox', 'docker:document']);
	grunt.registerTask('default', ['build']);
};