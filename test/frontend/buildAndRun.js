const Path = require('path')
const { buildTestBundleForNode } = require('../../esbuild.config')
const ENTRYPOINT = Path.join(__dirname, 'entrypoint.js')

buildTestBundleForNode(ENTRYPOINT)
  .then(bundlePath => {
    // Load JSDOM to mock the DOM in Node.
    // NOTE: It does not work when bundled with esbuild due to require.resolve
    //        usage with relative paths.
    require('jsdom-global/register')

    // Load the bundle which in turn registers all the mocha test suites
    require(bundlePath)

    // Run the test suites
    // NOTE: `run` is a global provided by mocha when started with --delay
    run()
  })
  .catch(error => {
    describe('esbuild', function() {
      it('should build a working bundle', function() {
        throw error
      })
    })

    // Let mocha run the fail-mode test suite with proper reporting to jUnit.
    // NOTE: `run` is a global provided by mocha when started with --delay
    run()
  })
