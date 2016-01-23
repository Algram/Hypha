var gulp = require('gulp');
var sass = require('gulp-sass');

gulp.task('default', ['sass'], function() {
	gulp.watch('./app/scss/*.scss', ['sass']);
})

gulp.task('sass', function() {
	gulp.src('./app/scss/*.scss')
		.pipe(sass().on('error', sass.logError))
		.pipe(sass({outputStyle: 'compressed'}))
		.pipe(gulp.dest('./app/css/'))
})
