var glob = require('glob')
var fs = require('fs')
var gulp = require('gulp')
var del = require('del')
var minimist = require('minimist')
var pConfig = require('./package.json')
var replace = require('gulp-replace')
var ts = require('gulp-typescript');
var merge = require('merge2');
var karmaServer = require('karma').Server
var imports = {
  exec: require('child_process').exec,
  webServer: require('gulp-webserver')
}

var config = {
  appProtocol: 'http',
  appHostname: 'localhost',
  appPort: 9000,
  proxyProtocol: 'http',
  proxyHostname: 'localhost',
  proxyPort: 8080,
  buildDir: './build',
  distDir: './dist',
  srcDir: './src',
  buildTarget: 'dev',
  noBundle: ['css', 'text'],
  /**
   *  WARNING! These directories are deleted by the 'reset-workspace' task.
   *   Do not add any directory that is present after a fresh 'clone' operation.
   */
  transientDirectories: [
    './node_modules',
    './jspm_packages',
    './build',
    './dist'
  ]
}
config.appHost = config.appProtocol + '://' + config.appHostname + ':' + config.appPort
config.proxyHost = config.proxyProtocol + '://' + config.proxyHostname + ':' + config.proxyPort


var minimistCliOpts = {
  boolean: ['open'],
  alias: {
    'open': ['o']
  },
  default: {
    open: false,
    env: process.env.NODE_ENV || 'production'
  }
};
config.args = minimist(process.argv.slice(2), minimistCliOpts)

var typescriptProject = ts.createProject({
  outDir: config.buildDir,
  module: 'commonjs',
  target: 'es5',
  emitDecoratorMetadata: true,
  experimentalDecorators: true,
  typescript: require('typescript')
});

var project = {
  server: null,

  compileJavascript: function(cb){
    return gulp.src('./src/**/*.js').pipe(gulp.dest(config.buildDir)).on('finish', cb);
  },

  /**
   *
   */
  compileTypescript: function (cb) {
    var tsResult = gulp.src('./src/**/*.ts').pipe(ts(typescriptProject));

    var x = tsResult.js.pipe(gulp.dest('build'))
    var y = tsResult.dts.pipe(gulp.dest('build/definitions'))

    // ignoring typscript definitions for now.
    x.on('finish', cb)
    x.on('error', cb)
  },

  watch: function () {
    gulp.watch('./src/**/*.html', ['compile-templates']);
    gulp.watch('./src/**/*.js', ['compile-js']);
    gulp.watch('./src/**/*.ts', ['compile-ts']);
    return gulp.watch('./src/**/*.scss', ['compile-styles']);
  },

  /**
   * Configure the proxy and start the webserver.
   */
  startServer: function () {
    var http = require('http');
    var proxy = require('proxy-middleware');
    var connect = require('connect');
    var serveStatic = require('serve-static');
    var serveIndex = require('serve-index');
    var open = require('open');
    var url = require('url');

    var proxyBasePaths = [
      'admin',
      'html',
      'api',
      'c',
      'dwr',
      'DotAjaxDirector'
    ]

    var app = connect();

    // proxy API requests to the node server
    proxyBasePaths.forEach(function (pathSegment) {
      var target = config.proxyHost + '/' + pathSegment;
      var proxyOptions = url.parse(target)
      proxyOptions.route = '/' + pathSegment
      proxyOptions.preserveHost = true
      app.use(function (req, res, next) {
        if (req.url.indexOf('/' + pathSegment + '/') === 0) {
          console.log("Forwarding request: ", req.url)
          proxy(proxyOptions)(req, res, next)
        } else {
          next()
        }
      })
    })
    app.use(serveStatic('./'))
    app.use(serveIndex('./'))

    project.server = http.createServer(app)
        .listen(config.appPort)
        .on('listening', function () {
          console.log('Started connect web server on ' + config.appHost)
          if (config.args.open) {
            open(config.appHost + '/index-dev.html')
          }
          else {
            console.log("add the '-o' flag to automatically open the default browser")
          }
        })
  },

  stopServer: function (callback) {
    project.server.close(callback)
  },

  runTests: function (singleRun, intTests, callback) {
    var configFile = __dirname + (intTests === true ? '/karma-it.conf.js' : '/karma.conf.js')
    new karmaServer({
      configFile: configFile,
      singleRun: singleRun
    }, callback).start()
  }
}

gulp.task('test', [], function (done) {
  project.runTests(true, false, done)
})

gulp.task('itest', function (done) {
  project.startServer()
  project.runTests(true, true, function () {
    project.stopServer(done)
  })
})


gulp.task('tdd', function () {
  project.watch(true, false)
  return project.runTests(false, false)
})

gulp.task('itdd', ['dev-watch'], function (done) {
  project.startServer()
  project.runTests(false, true, function () {
    project.stopServer(done)
  })
})


gulp.task('bundle-deps', ['unbundle'], function (done) {
  var deps = pConfig.jspm.dependencies || {}
  var promises = []
  var jspm = require('jspm')

  for (var nm in deps) {
    if (config.noBundle.indexOf(nm) < 0) {
      var bundlePath = config.buildDir + '/' + nm + '.bundle.js'
      promises.push(jspm.bundle(nm,
          bundlePath,
          {
            inject: true,
            minify: true,
            sourceMaps: false
          }))
    }
  }

  Promise.all(promises).then(function (results) {
    done()
  }).catch(function (e) {
    console.log("Error while bundling dependencies: ", e)
    throw e
  })
})

gulp.task('unbundle', ['default'], function (done) {
  imports.exec('jspm unbundle', function (error, stdout, stderr) {
    if (stdout) {
      console.log(stdout);
    }
    if (stderr) {
      console.warn(stderr)
    }
    done();
  })
})


gulp.task('start-server', function (done) {
  project.startServer()
  done()
})


/**
 *  Deploy Tasks
 */
gulp.task('package-release', ['copy-dist-all'], function (done) {
  var outDir = config.distDir
  var outPath = outDir + '/core-web.zip'
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir)
  }
  var output = fs.createWriteStream(outPath)
  var archiver = require('archiver')
  var archive = archiver.create('zip', {})

  output.on('close', function () {
    console.log("Archive Created: " + outPath + ". Size: " + archive.pointer() / 1000000 + 'MB')
    done()
  });

  archive.on('error', function (err) {
    done(err)
  });

  archive.pipe(output);

  archive.append(fs.createReadStream('./dist/core-web.min.js'), {name: 'core-web.min.js'})
      .append(fs.createReadStream('./dist/core-web.js'), {name: 'core-web.js'})
      //.append(fs.createReadStream('./dist/core-web.js.map'), {name: 'core-web.js.map'})  // map has bug as of JSPM 1.6-beta3:~/
      .append(fs.createReadStream('./dist/index.html'), {name: 'index.html'})
      .append(fs.createReadStream('./dist/core-web.sfx.js'), {name: 'core-web.sfx.js'})
      .append(fs.createReadStream('./dist/favicon.ico'), {name: 'favicon.ico'})
      .directory('./dist/jspm_packages', 'jspm_packages')
      .finalize()

});

var generatePom = function (baseDeployName, groupId, artifactId, version, packaging, callback) {
  var pom = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<project xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd" xmlns="http://maven.apache.org/POM/4.0.0"',
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"> <modelVersion>4.0.0</modelVersion>',
    '<groupId>' + groupId + '</groupId>',
    '<artifactId>' + artifactId + '</artifactId>',
    '<version>' + version + '</version>',
    '<packaging>' + packaging + '</packaging>',
    '</project>']

  var outDir = config.distDir
  var outPath = outDir + '/' + artifactId + '.pom'
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir)
  }

  fs.writeFile(outPath, pom.join('\n'), function (err) {
    if (err) {
      callback(null, err)
      return
    }
    console.log('Wrote pom to ', outPath);
    callback(outPath)
  });

}

gulp.task('publish-snapshot', ['package-release'], function (done) {
  var artifactoryUpload = require('gulp-artifactory-upload');
  var getRev = require('git-rev')
  var config = require('./deploy-config.js').artifactory.snapshot

  var mvn = {
    group: 'com.dotcms',
    artifactId: 'core-web',
    version: require('./package.json').version
  }

  getRev.short(function (rev) {
    var versionStr = mvn.version + '-SNAPSHOT';
    var baseDeployName = 'core-web-' + versionStr
    var deployName = baseDeployName + ".zip"
    var artifactoryUrl = config.url + '/' + mvn.group.replace('.', '/') + '/' + mvn.artifactId + '/' + versionStr

    console.log("Deploying artifact: PUT ", artifactoryUrl + '/' + deployName)

    var pomPath;

    generatePom(baseDeployName, mvn.group, mvn.artifactId, versionStr, 'zip', function (path, err) {
      if (err) {
        done(err)
        return;
      }
      console.log('setting pomPath to: ', path)
      pomPath = path
      gulp.src(['./dist/core-web.zip', pomPath])
          .pipe(artifactoryUpload({
            url: artifactoryUrl,
            username: config.username,
            password: config.password,
            rename: function (filename) {
              return filename.replace(mvn.artifactId, baseDeployName)
            }
          }))
          .on('error', function (err) {
            throw err
          }).on('end', function () {
        console.log("All done.")
      })
    })
  })

});

gulp.task('ghPages-clone', ['package-release'], function (done) {
  var exec = require('child_process').exec;

  var options = {
    cwd: __dirname,
    timeout: 300000
  }
  if (fs.existsSync(__dirname + '/gh_pages')) {
    del.sync('./gh_pages')
  }
  exec('git clone -b gh-pages git@github.com:dotCMS/core-web.git gh_pages', options, function (err, stdout, stderr) {
    console.log(stdout);
    if (err) {
      done(err)
      return;
    }
    del.sync(['./gh_pages/**/*', '!./gh_pages/.git'])
    gulp.src('./dist/**/*').pipe(gulp.dest('./gh_pages')).on('finish', function () {
      done()
    })
  })
})

gulp.task('publish-github-pages', ['ghPages-clone'], function (done) {
  var exec = require('child_process').exec;

  var options = {
    cwd: __dirname + '/gh_pages',
    timeout: 300000
  }

  var gitAdd = function (opts) {
    console.log('adding files to git.')
    exec('git add .', opts, function (err, stdout, stderr) {
      console.log(stdout);
      if (err) {
        console.log(stderr);
        done(err);
      } else {
        gitCommit(opts)
      }

    })
  }

  var gitCommit = function (opts) {
    exec('git commit -m "Autobuild gh-pages..."', opts, function (err, stdout, stderr) {
      console.log(stdout);
      if (err) {
        console.log(stderr);
        done(err);
      } else {
        gitPush(opts)
      }
    })
  }

  var gitPush = function (opts) {
    exec('git push -u  origin gh-pages', opts, function (err, stdout, stderr) {
      if (err) {
        console.log(stderr);
        done(err);
      } else {
        done()
      }
    })
  }
  gitAdd(options)
})

gulp.task('copy-dist-images', function () {
  return gulp.src(['*.ico']).pipe(gulp.dest(config.distDir))
})


gulp.task('copy-dist-bootstrap', function () {
  return gulp.src(['./jspm_packages/github/twbs/**/fonts/*']).pipe(gulp.dest(config.distDir + '/jspm_packages/github/twbs/'))
})

gulp.task('copy-dist-main', ['bundle-dist', 'bundle-minified', 'bundle-dev'], function () {
  return gulp.src(['./*.html', 'index.js']).pipe(replace("./dist/core-web.sfx.js", './core-web.sfx.js')).pipe(gulp.dest(config.distDir))
})


gulp.task('copy-dist-all', ['copy-dist-main', 'copy-dist-bootstrap', 'copy-dist-images'], function () {
  return gulp.src(['./build/*.js', './build/*.map']).pipe(replace("./dist/core-web.sfx.js", './core-web.sfx.js')).pipe(gulp.dest(config.distDir))
})

gulp.task('compile-ts', function (cb) {
  project.compileTypescript(cb)
});


gulp.task('compile-styles', function (done) {
  var sass = require('gulp-sass')
  var sourcemaps = require('gulp-sourcemaps');
  gulp.src('./src/**/*.scss')
      .pipe(sourcemaps.init())
      .pipe(sass({outputStyle: config.buildTarget === 'dev' ? 'expanded' : 'compressed'}))
      .pipe(sourcemaps.write())
      .pipe(gulp.dest(config.buildDir)).on('finish', done);
});

gulp.task('compile-js', function (done) {
  project.compileJavascript(done)
})

gulp.task('compile-templates', [], function (done) {
  gulp.src('./src/**/*.html').pipe(gulp.dest(config.buildDir)).on('finish', done);
})


gulp.task('bundle-dist', ['compile-all'], function (done) {
  var sfxPath = config.buildDir + '/core-web.sfx.js'
  console.info("Bundling self-executing build to " + sfxPath)
  var jspm = require('jspm')
  var jspmBuilder = new jspm.Builder()
  jspmBuilder.buildSFX('index',
      sfxPath,
      {
        inject: false,
        minify: false,
        sourceMaps: false
      }).then(function () {
    gulp.src(sfxPath).pipe(gulp.dest('./dist/')).on('finish', done);
  }).catch(function (e) {
    console.log("Error creating bundle with JSPM: ", e)
    throw e
  })
})

/**
 * Compile typescript and styles into build, then bundle the built files using JSPM.
 *
 */
gulp.task('bundle-minified', ['compile-all'], function (done) {
  var minifiedPath = config.buildDir + '/core-web.min.js'
  console.info("Bundling minified build to " + minifiedPath)
  var jspm = require('jspm')
  var jspmBuilder = new jspm.Builder()

  jspmBuilder.config({
    "defaultJSExtensions": true,
    "transpiler": "babel",
    "babelOptions": {
      "optional": [
        "runtime"
      ],
      "stage": 1
    }
  })

  jspmBuilder.build('./index',
      minifiedPath,
      {
        inject: false,
        minify: true,
        sourceMaps: false
      }).then(function () {
    gulp.src(minifiedPath).pipe(gulp.dest('./dist/')).on('finish', done);
  }).catch(function (e) {
    console.log("Error creating bundle with JSPM: ", e);
    throw e;
  })
})


gulp.task('bundle-dev', ['compile-all'], function (done) {
  var devPath = config.buildDir + '/core-web.js'
  console.info("Bundling unminified build to " + devPath)
  var jspm = require('jspm')
  jspm.bundle('./index',
      devPath,
      {
        inject: false,
        minify: false,
        sourceMaps: false // Bugged :~(
      }).then(done).catch(function (e) {
    console.log("Error creating bundle with JSPM: ", e);
    throw e;
  })
})


gulp.task('bundle-all', ['bundle-dev', 'bundle-minified', 'bundle-dist', 'compile-all'], function (done) {
  done();
})


gulp.task('prod-watch', ['compile-all'], function () {
  gulp.watch('./src/**/*.ts', ['compile-ts']);
  return gulp.watch('./src/**/*.scss', ['compile-styles']);
});

gulp.task('dev-watch', ['compile-all'], function () {
  return project.watch()
});

gulp.task('publish', ['publish-github-pages', 'publish-snapshot'], function (done) {
  done()
})

//noinspection JSUnusedLocalSymbols
gulp.task('play', ['serve'], function (done) {
  console.log("This task will be removed in the next iteration, use 'gulp serve' instead.")
})

gulp.task('serve', ['start-server', 'dev-watch'], function (done) {
  // if 'done' is not passed in this task will not block.
})

gulp.task('compile-all', ['compile-js', 'compile-ts', 'compile-styles', 'compile-templates'], function (done) {
  done()
})

gulp.task('build', ['bundle-all'], function (done) {
  done()
})

gulp.task('clean', ['unbundle'], function (done) {
  del.sync([config.distDir, config.buildDir, './gh_pages'])
  done()
})

gulp.task('reset-workspace', function (done) {
  del(config.transientDirectories, done)
})

gulp.task('default', function (done) {
  done()
});