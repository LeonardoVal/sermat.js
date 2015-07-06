/** Gruntfile for [jsser.js](http://github.com/LeonardoVal/jsser.js).
*/
var sourceFiles = [ 'src/__prologue__.js',
	'src/registry.js',
	'src/serialization.js',
	'src/materialization.js',
	'src/constructions.js',
	'src/wrapup.js',
// end
	'src/__epilogue__.js'];

// Init config. ////////////////////////////////////////////////////////////////
module.exports = function(grunt) {
	grunt.file.defaultEncoding = 'utf8';
// Init config. ////////////////////////////////////////////////////////////////
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		jison: { ///////////////////////////////////////////////////////////////////////////////////
			build: {
				options: { 
					type: 'slr',
					moduleType: 'js'
				},
				files: {
					'src/parser.js': 'src/parser.jison'
				}
			}
		},
		concat_sourcemap: { ////////////////////////////////////////////////////////////////////////
			build: {
				src: sourceFiles,
				dest: 'build/<%= pkg.name %>.js',
				options: {
					separator: '\n\n'
				}
			},
		},
		uglify: { //////////////////////////////////////////////////////////////////////////////////
			build: {
				src: 'build/<%= pkg.name %>.js',
				dest: 'build/<%= pkg.name %>.min.js',
				options: {
					banner: '//! <%= pkg.name %> <%= pkg.version %>\n',
					report: 'min',
					sourceMap: true,
					sourceMapIn: 'build/<%= pkg.name %>.js.map',
					sourceMapName: 'build/<%= pkg.name %>.min.js.map'
				}
			}
		},
		karma: { ///////////////////////////////////////////////////////////////////////////////////
			options: {
				configFile: 'test/karma.conf.js'
			},
			build: { browsers: ['PhantomJS'] },
		},
		docker: { //////////////////////////////////////////////////////////////////////////////////
			build: {
				src: ["src/**/*.js", "README.md", 'docs/*.md'],
				dest: "docs/docker",
				options: {
					colourScheme: 'borland',
					ignoreHidden: true,
					exclude: 'src/__prologue__.js,src/__epilogue__.js'
				}
			}
		}
	});
// Load tasks. /////////////////////////////////////////////////////////////////////////////////////
	grunt.loadNpmTasks('grunt-concat-sourcemap');
	grunt.loadNpmTasks('grunt-karma');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-docker');
	
// Register tasks. /////////////////////////////////////////////////////////////////////////////////
	grunt.registerTask('compile', ['concat_sourcemap:build', 'uglify:build']); 
	grunt.registerTask('test', ['compile', 'karma:build']);
	grunt.registerTask('build', ['test', 'docker:build']);
	grunt.registerTask('default', ['build']);
};