/** Gruntfile for [sermat.js](http://github.com/LeonardoVal/sermat.js).
*/
var sourceFiles = [
	'src/utilities.js',
	'src/registry.js',
	'src/serialization.js',
	'src/materialization.js',
	'src/constructions.js',
	'src/wrapup.js'
];

module.exports = function(grunt) {
	grunt.file.defaultEncoding = 'utf8';
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		concat_sourcemap: { ////////////////////////////////////////////////////////////////////////
			options: {
				separator: '\n\n'
			},
			build_simple: {
				src: ['src/wrappers/__prologue-simple__.js']
					.concat(sourceFiles)
					.concat(['src/wrappers/__epilogue-simple__.js']),
				dest: 'build/<%= pkg.name %>.js',
			},
			build_umd: {
				src: ['src/wrappers/__prologue-umd__.js']
					.concat(sourceFiles)
					.concat(['src/wrappers/__epilogue-umd__.js']),
				dest: 'build/<%= pkg.name %>-umd.js',
			},
			build_node: {
				src: ['src/wrappers/__prologue-node__.js']
					.concat(sourceFiles)
					.concat(['src/wrappers/__epilogue-node__.js']),
				dest: 'build/<%= pkg.name %>-node.js',
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
			build_umd: {
				src: 'build/<%= pkg.name %>-umd.js',
				dest: 'build/<%= pkg.name %>-umd-min.js',
				options: {
					sourceMapIn: 'build/<%= pkg.name %>-umd.js.map',
					sourceMapName: 'build/<%= pkg.name %>-umd-min.js.map'
				}
			},
			build_node: {
				src: 'build/<%= pkg.name %>-node.js',
				dest: 'build/<%= pkg.name %>-node-min.js',
				options: {
					sourceMapIn: 'build/<%= pkg.name %>-node.js.map',
					sourceMapName: 'build/<%= pkg.name %>-node-min.js.map'
				}
			}
		},
		karma: { ///////////////////////////////////////////////////////////////////////////////////
			options: {
				configFile: 'test/karma.conf.js'
			},
			test_phantom: { browsers: ['PhantomJS'] },
		},
		docker: { //////////////////////////////////////////////////////////////////////////////////
			document: {
				src: ['src/*.js', 'README.md', 'docs/*.md'],
				dest: 'docs/docker',
				options: {
					colourScheme: 'borland',
					ignoreHidden: true
				}
			}
		}
	});
// Load tasks. /////////////////////////////////////////////////////////////////////////////////////
	grunt.loadNpmTasks('grunt-concat-sourcemap');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-karma');
	grunt.loadNpmTasks('grunt-docker');
	
// Register tasks. /////////////////////////////////////////////////////////////////////////////////
	grunt.registerTask('compile', [
		'concat_sourcemap:build_simple', 'uglify:build_simple',
		'concat_sourcemap:build_umd', 'uglify:build_umd',
		'concat_sourcemap:build_node', 'uglify:build_node'
	]); 
	grunt.registerTask('test', ['compile', 'karma:test_phantom']);
	grunt.registerTask('build', ['test', 'docker:document']);
	grunt.registerTask('default', ['build']);
};