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
    lib: 'src/js/lib/**/*.js',
    scripts: ['src/js/**/*.js', '!src/js/lib/**/*.js'],
    css: 'src/css/**/*.css'
};

gulp.task('clean', function (cb) {
    // You can use multiple globbing patterns as you would with `gulp.src`
    del(['dist'], cb);
});

//region Live environment

gulp.task('scripts-min', ['clean'], function () {
    function createLibraries() {
        return gulp.src(paths.lib)
            .pipe(uglify());
    }

    return gulp.src(paths.scripts)
        .pipe(sourcemaps.init())
        .pipe(concat('scripts.min.js'))
        .pipe(uglify())
        .pipe(sourcemaps.write())
        .pipe(createLibraries())
        .pipe(concat('all.min.js'))
        .pipe(gulp.dest('dist/js'));
});

gulp.task('css-min', ['clean'], function () {
    return gulp.src(paths.css)
        .pipe(minifyCss())
        .pipe(concat('all.min.css'))
        .pipe(gulp.dest('dist/css'));
});

//endregion Live environment

//region Dev environment

gulp.task('lib', ['clean'], function () {
    return gulp.src(paths.lib)
        .pipe(gulp.dest('dist/js/lib'));
});

gulp.task('scripts', ['lib'], function () {
    return gulp.src(paths.scripts)
        .pipe(gulp.dest('dist/js'));
});

gulp.task('css', ['clean'], function () {
    return gulp.src(paths.css)
        .pipe(gulp.dest('dist/css'));
});

//endregion Dev environment

// Rerun the task when a file changes
gulp.task('watch', function () {
    gulp.watch(paths.scripts, ['scripts']);
    gulp.watch(paths.css, ['css']);
});

// DEV
gulp.task('default', ['scripts', 'css']);

gulp.task('dev', ['scripts', 'css']);

gulp.task('live', ['scripts-min', 'css-min']);
