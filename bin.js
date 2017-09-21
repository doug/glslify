const glslifyBundle = require('glslify-bundle')
const glslifyDeps = require('glslify-deps')
const glslResolve = require('glsl-resolve')
const minimist = require('minimist')
const path = require('path')
const bl = require('bl')
const fs = require('fs')

function main() {
  const depper = glslifyDeps()
  const argv = minimist(process.argv.slice(2), {
    alias: {
      t: 'transform',
      g: 'global',
      p: 'post',
      o: 'output',
      v: 'version',
      h: 'help'
    }
  })

  var input = ''
  if (argv.version) {
    const version = require('./package.json').version
    process.stdout.write('v' + version + '\n')
    process.exit(0)
  }
  if (argv.help) return help()
  if (!argv._.length && process.stdin.isTTY) return help()

  // Apply source transforms
  argv.t = argv.t || []
  argv.t = Array.isArray(argv.t) ? argv.t : [argv.t]
  argv.t.forEach(function (tr) {
    depper.transform(tr)
  })

  argv.g = argv.g || []
  argv.g = Array.isArray(argv.g) ? argv.g : [argv.g]
  argv.g.forEach(function (tr) {
    depper.transform(tr, {
      global: true
    })
  })

  argv.p = argv.p || []
  argv.p = Array.isArray(argv.p) ? argv.p : [argv.p]

  //
  // Build dependency tree, then output
  //
  if (argv._.length) {
    return depper.add(argv._[0], output)
  }

  process.stdin.pipe(bl(function (err, src) {
    if (err) throw err

    depper.inline(src, process.cwd(), output)
  }))

  //
  // Logs --help information out to stderr.
  //
  function help() {
    process.stderr.write(`

  Usage:
  glslify {OPTIONS} < index.glsl

glslify is a Node.js-style module build system, much like
browserify, except for GLSL shaders! It allows you to share
and consume shader code on npm.

Options:
  -t, --transform  Apply a local GLSL source transform to your bundle.
  -o, --output     Specify an output file to write your shader to.
  -v, --version    Output version number
  -h, --help       Display this message.

  Read index.glsl and write to output.glsl:
    glslify index.glsl -o output.glsl

  Alternatively:
    cat index.glsl | glslify > output.glsl

  To use the glslify-hex transform:
    npm install glslify-hex
    glslify index.glsl -t glslify-hex -o output.glsl
  
`);
  }

  //
  // Finally, apply shared functions for --post transforms
  // and output the result to either stdout or the output
  // file.
  //
  function output(err, tree) {
    if (err) throw err
    var src = String(glslifyBundle(tree))

    next()

    function next() {
      var tr = argv.p.shift()
      if (!tr) return done()
      var transform = require(tr)

      transform(null, src, {
        post: true
      }, function (err, data) {
        if (err) throw err
        if (data) src = data
        next()
      })
    }

    function done() {
      if (!argv.output) return process.stdout.write(src)
      fs.writeFile(argv.output, src)
    }
  }
}

main();
