module.exports = function (grunt) {
  'use strict';

  require('load-grunt-tasks')(grunt);
  require('time-grunt')(grunt);

  grunt.initConfig({
    watch: {
      js: {
        files: ['lib/*.js'],
        tasks: ['jshint:js']
      },
      test: {
        files: ['test/*.js'],
        tasks: ['jshint:test']
      }
    },
    jshint : {
      options: {
        jshintrc: true,
      },
      js: ['lib/*.js'],
      test: ['test/*.js']
    }
  });

  grunt.registerTask('default', [
      'watch'
  ]);

};
