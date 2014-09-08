/**
 * Created by gmeszaros on 9/8/2014.
 */
var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var minifyCss = require('gulp-minify-css');
var del = require('del');

var paths = {
    libs: ['src/lib/**/*.js'],
    scripts: ['src/js/**/*.js'],
    css: 'src/css/**/*.css'
};

// Not all tasks need to use streams
// A gulpfile is just another node program and you can use all packages available on npm
gulp.task('clean', function (cb) {
    // You can use multiple globbing patterns as you would with `gulp.src`
    del(['dist'], cb);
});

gulp.task('scripts', ['clean'], function () {
    // Minify and copy all JavaScript (except vendor scripts)
    // with sourcemaps all the way down
    return gulp.src(paths.scripts)
         .pipe(sourcemaps.init())
         .pipe(concat('all.min.js'))
         .pipe(uglify())
         .pipe(sourcemaps.write())
        .pipe(gulp.dest('dist/js'));
});

// Copy all css files
gulp.task('css', ['clean'], function () {
    return gulp.src(paths.css)
        .pipe(minifyCss())
        .pipe(concat('all.min.css'))
        .pipe(gulp.dest('dist/css'));
});

// Rerun the task when a file changes
gulp.task('watch', function () {
    gulp.watch(paths.scripts, ['scripts']);
    gulp.watch(paths.css, ['css']);
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['scripts', 'css']);