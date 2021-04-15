const fs = require('fs')
const Path = require('path')
const { PATTERNS } = require('../populatePublicVendor')

const PUBLIC_PATH = Path.join(Path.dirname(__dirname), 'public')

const CONTENT_TYPES = new Map([
  ['.js', 'application/javascript'],
  ['.css', 'text/css'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png']
])
const DEFAULT_CONTENT_TYPE = 'application/octet-stream'

const PUBLIC_CONTENT = new Map()
const VENDOR_CONTENT = new Map()
const CONTENT = new Map([
  ['public', PUBLIC_CONTENT],
  ['vendor', VENDOR_CONTENT]
])

function trackOutput(name, outputFiles) {
  if (!outputFiles) return
  CONTENT.set(
    name,
    new Map(outputFiles.map(({ path, contents }) => [path, contents]))
  )
}

async function getBody(path) {
  for (const outputFiles of CONTENT.values()) {
    const contents = outputFiles.get(path)
    if (contents) return contents
  }

  const pattern = PATTERNS.find(({ to }) => {
    return path.startsWith(to)
  })
  if (pattern) {
    const { from, to } = pattern
    const resolvedPath = Path.join(from, Path.relative(to, path))
    const buffer = await fs.promises.readFile(resolvedPath)
    VENDOR_CONTENT.set(path, buffer)
    return buffer
  }
  try {
    const buffer = await fs.promises.readFile(path)
    PUBLIC_CONTENT.set(path, buffer)
  } catch (e) {}
}

function getContentType(path) {
  return CONTENT_TYPES.get(Path.extname(path)) || DEFAULT_CONTENT_TYPE
}

async function handleRequest(request, response) {
  const path = request.url
  let body
  try {
    body = await getBody(PUBLIC_PATH + path)
  } catch (error) {
    console.error('esbuild cannot serve static file at %s', path, error)
    response.writeHead(500)
    response.end()
    return
  }
  if (!body) {
    response.writeHead(404)
    response.end()
    return
  }
  response.writeHead(200, {
    'Content-Type': getContentType(path)
  })
  response.write(body)
  response.end()
}

module.exports = {
  handleRequest,
  trackOutput
}
