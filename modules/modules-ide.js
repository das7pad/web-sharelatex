module.exports = function() {
  return {
    code: require('glob')
      .sync('./*/frontend/js/ide/index.js', { cwd: __dirname })
      .map(file => `import '${file}'`)
      .join('\n')
  }
}
