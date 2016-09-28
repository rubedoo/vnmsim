var gulp = require('gulp'),
    argv = require('yargs').argv,
    gulpif = require('gulp-if'),
    pug = require('gulp-pug'),
    sass = require('gulp-sass'),
    compass = require('compass-importer'),
    sassInlineImage = require('sass-inline-image'),
    fontAwesome = require('node-font-awesome'),
    merge = require('merge-stream'),
    rename = require("gulp-rename"),
    uglify = require('gulp-uglify'),
    uglifycss = require('gulp-uglifycss'),
    concat = require('gulp-concat'),
    server = require('gulp-express'),
    browserify = require('gulp-browserify'),
    angularTranslate = require('gulp-angular-translate'),
    del = require('del');

// use 'dist' folder for production output, dest otherwise
var dest = argv.production ? 'dist' : 'build';

// pug templates
gulp.task('templates', function() {
  return gulp.src('src/templates/index.pug')
    .pipe(pug().on('error', console.error.bind(console)))
    .pipe(gulp.dest(dest));
});

// compile sass using compass
gulp.task('styles', function() {
  var sassStream = gulp.src('src/sass/main.sass')
    .pipe(sass(
      {
        importer: compass,
        outputStyle: argv.production ? 'compressed' : 'nested',
        functions: sassInlineImage({}),
        includePaths: [fontAwesome.scssPath]
      }
    ).on('error', sass.logError));

  var codeMirror = gulp.src('node_modules/codemirror/lib/codemirror.css');
  var codeMirrorLint = gulp.src('node_modules/codemirror/addon/lint/lint.css');

  return merge(sassStream, codeMirrorLint, codeMirror)
    .pipe(concat('app.css'))
    .pipe(rename('style.min.css'))
    .pipe(gulpif(argv.production, uglifycss({ 'uglyComments': true })))
    .pipe(gulp.dest(dest));
});

// font awesome
gulp.task('fonts', function() {
  return gulp.src(fontAwesome.fonts)
    .pipe(gulp.dest(dest + '/fonts'));
});

// generate translations angular module
gulp.task('translations', function() {
  return gulp.src('src/locale/*.json')
    .pipe(angularTranslate(
      {
        module: 'vnmsim',
        standalone: false
      }
    ))
    .pipe(gulpif(argv.production, uglify()))
    .pipe(gulp.dest('src/temp'));
});

// produce uglified app js code
gulp.task('scripts', ['translations'], function() {

  return gulp.src('src/js/index.js')
    .pipe(browserify(
      {
        debug: !argv.production
      }
    ).on('error', console.error.bind(console)))
    .pipe(gulpif(argv.production, uglify()))
    .pipe(rename('app.js'))
    .pipe(gulp.dest(dest));
});

// server and watchers
gulp.task('server', function () {
  server.run(['app.js']);

  gulp.watch('src/templates/**/*', ['templates']);
  gulp.watch('src/js/**/*.js', ['scripts']);
  gulp.watch('src/locale/*.json', ['scripts']);
  gulp.watch('src/img/**/*', ['styles']);
  gulp.watch('src/sass/**/*.sass', ['styles']);
  gulp.watch('build/**/*', server.notify);
});

// tasks to be executed during build
var tasks = [
  'styles',
  'scripts',
  'templates',
  'fonts',
  'server'
];
// remove server task in production mode
if (argv.production) tasks.pop();

// default task
gulp.task('default', tasks, function() {
  // delete temp files
  del(['src/temp/']);
  // end message
  console.log('Build ended');
});