let localhost     = 'localhost',    // Your local domain
    adminUrl      = 'admin',        // Path to admin
    adminLogin    = 'yourLogin',    // Admin login
    adminPassword = 'yourPassword', // Admin password
    theme         = 'yourTheme',    // Theme folder name
    preprocessor  = 'sass',         // Preprocessor (sass, less, styl); 'sass'
    fileswatch    = 'html,htm,php,txt,yaml,twig,json,md' // List of files extensions for watching & hard reload (comma separated)


const {src, dest, parallel, series, watch} = require('gulp')
const browserSync = require('browser-sync').create()
const webpack = require('webpack-stream')
const sass = require('gulp-sass')(require('sass'))
const sourcemaps = require('gulp-sourcemaps')
const sassglob = require('gulp-sass-glob')
const less = require('gulp-less')
const lessglob = require('gulp-less-glob')
const styl = require('gulp-stylus')
const stylglob = require("gulp-empty")
const cleancss = require('gulp-clean-css')
const autoprefixer = require('gulp-autoprefixer')
const rename = require('gulp-rename')
const rsync = require('gulp-rsync')
const ocmodRefresh = require('gulp-ocmod-refresh')

function browsersync() {
    browserSync.init({
        proxy: localhost,
        notify: false,
        online: true,
        open: true
    })
}

function scripts() {
    return src(`catalog/view/theme/${theme}/assets/js/main.js`)
        .pipe(webpack({
            mode: 'production',
            performance: {hints: false},
            module: {
                rules: [
                    {
                        test: /\.(js)$/,
                        exclude: /(node_modules)/,
                        loader: 'babel-loader',
                        query: {
                            presets: ['@babel/env'],
                            plugins: ['babel-plugin-root-import']
                        }
                    }
                ]
            }
        })).on('error', function handleError() {
            this.emit('end')
        })
        .pipe(rename('main.min.js'))
        .pipe(dest(`catalog/view/theme/${theme}/assets/js`))
        .pipe(browserSync.stream())
}

function styles() {
    return src([
        `catalog/view/theme/${theme}/assets/styles/${preprocessor}/main.*`,
        `!catalog/view/theme/${theme}/assets/styles/${preprocessor}/_*.*`
    ])
        .pipe(sourcemaps.init())
        .pipe(eval(`${preprocessor}glob`)())
        .pipe(eval(preprocessor)())
        .pipe(autoprefixer({overrideBrowserslist: ['last 10 versions'], grid: true}))
        .pipe(cleancss({level: {1: {specialComments: 0}},/* format: 'beautify' */}))
        .pipe(rename({suffix: ".min"}))
        .pipe(sourcemaps.write('./'))
        .pipe(dest(`catalog/view/theme/${theme}/assets/css`))
        .pipe(browserSync.stream())
}


function modificationRefresh() {
    return src([
        './system/storage/**/*.ocmod.xml',
        './system/storage/modification/catalog/view/theme/**/template/**/*.*'
    ])
        .pipe(ocmodRefresh({
            url: `http://${localhost}/${adminUrl}/`,
            login: adminLogin,
            password: adminPassword
        }))
}


function startwatch() {
    watch(`catalog/view/theme/${theme}/assets/styles/${preprocessor}/**/*`, {usePolling: true}, styles)
    watch([`catalog/view/theme/${theme}/assets/js/**/*.js`, `!catalog/view/theme/${theme}/assets/js/*.min.js`], {usePolling: true}, scripts)
    watch([`catalog/**/*.{${fileswatch}}`], {usePolling: true}, modificationRefresh).on('change', browserSync.reload)
}

exports.scripts = scripts;
exports.styles = styles;
exports.assets = parallel(scripts, styles);
exports.default = series(scripts, styles, parallel(browsersync, startwatch));
