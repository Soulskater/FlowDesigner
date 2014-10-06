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
    scripts: [ 'src/js/designerDirective.js' ,'src/js/**/*.js', '!src/js/lib/**/*.js'],
    css: 'src/css/flowDesigner.css',
    templates: 'src/templates/**/*.html',
    fonts: 'src/fonts/**/*.ttf'
};

gulp.task('clean', function (cb) {
    // You can use multiple globbing patterns as you would with `gulp.src`
    del(['dist'], cb);
});

//region Live environment

gulp.task('scripts-min', function () {
    return gulp.src(paths.scripts)
        .pipe(sourcemaps.init())
        .pipe(concat('flowDesigner.min.js'))
        .pipe(uglify())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('dist/'));
});

gulp.task('css-min', function () {
    return gulp.src(paths.css)
        .pipe(minifyCss())
        .pipe(concat('flowDesigner.min.css'))
        .pipe(gulp.dest('dist/'));
});

//endregion Live environment

//region Dev environment

gulp.task('scripts', function () {
    return gulp.src(paths.scripts)
        .pipe(sourcemaps.init())
        .pipe(concat('flowDesigner.js'))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('dist/'));
});

gulp.task('css', function () {
    return gulp.src(paths.css)
        .pipe(concat('flowDesigner.css'))
        .pipe(gulp.dest('dist/'));
});

//endregion Dev environment

gulp.task('templates', function () {
    return gulp.src(paths.templates)
        .pipe(gulp.dest('dist/templates'));
});

gulp.task('fonts', function () {
    return gulp.src(paths.fonts)
        .pipe(gulp.dest('dist/fonts'));
});

// Rerun the task when a file changes
gulp.task('watch', function () {
    gulp.watch(paths.scripts, ['scripts']);
    gulp.watch(paths.css, ['css']);
});

// Build All
gulp.task('build', ['scripts', 'scripts-min', 'css', 'css-min', 'templates', 'fonts']);

gulp.task('dev', ['scripts', 'css', 'templates', 'fonts']);

gulp.task('live', ['scripts-min', 'css-min', 'templates', 'fonts']);
