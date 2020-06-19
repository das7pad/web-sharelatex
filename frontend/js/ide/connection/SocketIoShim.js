/* global io */

import 'abort-controller/polyfill'
import 'whatwg-fetch'

class SocketShimBase {
  static connect(url, options) {
    return new SocketShimBase()
  }
  constructor(socket) {
    this._socket = socket
  }
}
const transparentMethods = [
  'connect',
  'disconnect',
  'emit',
  'on',
  'removeListener'
]
for (let method of transparentMethods) {
  SocketShimBase.prototype[method] = function() {
    this._socket[method].apply(this._socket, arguments)
  }
}

class SocketShimNoop extends SocketShimBase {
  static connect() {
    return new SocketShimNoop()
  }
  constructor(socket) {
    super(socket)
    this.socket = {
      get connected() {
        return false
      },
      get sessionid() {
        return undefined
      },
      get transport() {
        return {}
      },

      connect() {},
      disconnect(reason) {}
    }
  }
  connect() {}
  disconnect(reason) {}
  emit() {}
  on() {}
  removeListener() {}
}

class SocketShimV0 extends SocketShimBase {
  static connect(url, options) {
    return new SocketShimV0(
      io.connect(
        url,
        options
      )
    )
  }
  constructor(socket) {
    super(socket)
    this.socket = this._socket.socket
  }
}

class SocketShimV2 extends SocketShimBase {
  static connect(url, options) {
    options.forceNew = options['force new connection']
    // .resource has no leading slash, path wants to see one.
    options.path = '/' + options.resource
    options.reconnection = options.reconnect
    options.timeout = options['connect timeout']
    return new SocketShimV2(url, options)
  }
  static get EVENT_MAP() {
    // Use the v2 event names transparently to the frontend.
    const connectionFailureEvents = [
      'connect_error',
      'connect_timeout',
      'error'
    ]
    return new Map([
      ['connect_failed', connectionFailureEvents],
      ['error', connectionFailureEvents]
    ])
  }
  _on(event, handler) {
    // Keep track of our event listeners.
    // We move them to a new socket in ._replaceSocketWithNewInstance()
    if (!this._events.has(event)) {
      this._events.set(event, [handler])
    } else {
      this._events.get(event).push(handler)
    }
    this._socket.on(event, handler)
  }
  on(event, handler) {
    if (SocketShimV2.EVENT_MAP.has(event)) {
      for (const v2Event of SocketShimV2.EVENT_MAP.get(event)) {
        this._on(v2Event, handler)
      }
    } else {
      this._on(event, handler)
    }
  }
  _removeListener(event, handler) {
    // Keep track of our event listeners.
    // We move them to a new socket in ._replaceSocketWithNewInstance()
    if (this._events.has(event)) {
      const listeners = this._events.get(event)
      const pos = listeners.indexOf(handler)
      if (pos !== -1) {
        listeners.splice(pos, 1)
      }
    }
    this._socket.removeListener(event, handler)
  }
  removeListener(event, handler) {
    if (SocketShimV2.EVENT_MAP.has(event)) {
      for (const v2Event of SocketShimV2.EVENT_MAP.get(event)) {
        this._removeListener(v2Event, handler)
      }
    } else {
      this._removeListener(event, handler)
    }
  }

  static createNewSocket(url, options) {
    // open a brand new connection for the default namespace '/'
    // The old socket can still leak 'disconnect' events from the teardown
    //  of the old transport. The leaking 'disconnect' events interfere with
    //  the _new_ connection and cancel the new connect attempt.
    // Also skip the caching in these locations:
    // - `io.connect()` caches `io.Manager`s in `io.managers`
    // - `io.Manager().socket()` caches `io.Socket`s in its `this.nsps`
    return io.Manager(url, options).socket('/', options)
  }

  _replaceSocketWithNewInstance() {
    const oldSocket = this._socket
    const newSocket = SocketShimV2.createNewSocket(this._url, this._options)

    // move our existing event handlers to the new socket
    this._events.forEach((listeners, event) => {
      for (const listener of listeners) {
        oldSocket.removeListener(event, listener)
        newSocket.on(event, listener)
      }
    })

    if (oldSocket.connected) {
      // We overwrite the reference to oldSocket soon.
      // Make sure we are disconnected.
      oldSocket.disconnect()
    }
    this._socket = newSocket
  }

  connect() {
    // have the same logic behind socket.connect and socket.socket.connect
    this._replaceSocketWithNewInstance()
  }

  constructor(url, options) {
    super(SocketShimV2.createNewSocket(url, options))
    this._url = url
    this._options = options
    this._events = new Map()

    const self = this
    function _getEngine() {
      return (self._socket.io && self._socket.io.engine) || {}
    }

    this.socket = {
      get connected() {
        return self._socket.connected
      },
      get sessionid() {
        if (self._socket.id) {
          return self._socket.id
        }
        // socket.id is discarded upon disconnect
        // the id is still available in the internal state
        return _getEngine().id
      },
      get transport() {
        return _getEngine().transport
      },

      connect() {
        self._replaceSocketWithNewInstance()
      },
      disconnect(reason) {
        return self._socket.disconnect(reason)
      }
    }
  }
}

function noop() {}
function getHandlerStub(event) {
  return sl_console.log.bind(null, `[SocketShimV3] Polling: stub .on${event}:`)
}

class Polling {
  constructor(baseUrl, options) {
    // ws -> http; wss -> https
    baseUrl = baseUrl.replace(/^ws/, 'http') + '/deprecated-polling'
    this._url = undefined
    this._options = options

    this.protocol = 'polling-v3'
    this.readyState = WebSocket.CONNECTING
    this.onclose = getHandlerStub('close')
    this.onerror = getHandlerStub('error')
    this.onopen = getHandlerStub('open')
    this.onParsedMessage = getHandlerStub('ParsedMessage')
    setTimeout(() => this._init(baseUrl))
  }

  close(code, reason) {
    this._fireClose(code, reason)
    this._delete(
      `${this._url}&code=${code}&reason=${reason.replace(/ /g, '_')}`
    )
  }

  send(blob) {
    this._post(this._url, blob).catch(error => {
      this._handleError(error, 'send failed')
    })
  }

  _init(baseUrl) {
    const url = `${baseUrl}/new?bootstrap=${this._options.bootstrap}`
    this._post(url, '', this._options.timeout)
      .then(({ auth }) => {
        this._url = `${baseUrl}?auth=${auth}`
        this._registerUnload(() => {
          if (this.readyState !== WebSocket.OPEN) return
          this.readyState = WebSocket.CLOSING
          this._delete(`${this._url}&code=4003&reason=client_leaves_page`)
        })
        this.readyState = WebSocket.OPEN
        this._poll()
        this.onopen()
      })
      .catch(error => this._handleError(error, 'init request failed'))
  }

  _fireClose(code, reason) {
    if (this._closeFired) return
    this._closeFired = true
    this.readyState = WebSocket.CLOSED
    this._unregisterUnload()
    this.onclose({ code, reason })
  }

  _handleError(responseError, context) {
    if (this._closeFired) {
      // ignore any errors on closed transport
      return
    }
    if (responseError.statusCode === 404) {
      this._fireClose(4101, 'server unknown client')
      return
    }
    const error = new Error(
      `SocketShimV3.Polling: ${context}: ${responseError.message}`
    )
    sl_console.log('[SocketShimV3] Polling: error:', context, responseError)
    this.onerror({ error })
    this.close(4002, 'client error count too high')
  }

  _poll() {
    if (this.readyState !== WebSocket.OPEN) return
    this._get(this._url)
      .then(blobs => {
        blobs.forEach(parsed => {
          if (parsed && parsed.event === 'close') {
            this.readyState = WebSocket.CLOSING
            return setTimeout(() => this._fireClose(...parsed.args))
          }
          setTimeout(this.onParsedMessage, 0, parsed)
        })
        this._poll()
      })
      .catch(error => this._handleError(error, 'polling failed'))
  }

  _delete(url) {
    return this._request(url, { method: 'DELETE' }).then(noop, noop)
  }

  _get(url) {
    return this._request(url, { method: 'GET' })
  }

  _post(url, body, timeout) {
    return this._request(url, { method: 'POST', body, timeout })
  }

  _request(url, opts) {
    const controller = new AbortController()
    const timeout = setTimeout(controller.abort, opts.timeout || 60 * 1000)
    function cancelAbort() {
      clearTimeout(timeout)
    }

    // allow cross origin requests
    opts.mode = 'cors'
    // do not send cookies
    opts.credentials = 'omit'
    // complete a DELETE/POST request as we leave the page
    opts.keepalive = opts.method === 'DELETE' || opts.method === 'POST'
    return fetch(url, opts)
      .then(async resp => {
        if (resp.status === 200) {
          return resp.json()
        }
        if (resp.status === 204) {
          return ''
        }
        const error = new Error(`unexpected response: ${resp.status}`)
        error.statusCode = resp.status
        throw error
      })
      .finally(cancelAbort)
  }

  // -----------------------
  // platform specific logic
  _registerUnload(cb) {
    this._beforeunloadListener = cb
    window.addEventListener('beforeunload', cb, { once: true })
  }

  _unregisterUnload() {
    window.removeEventListener('beforeunload', this._beforeunloadListener)
  }
  // platform specific logic
  // -----------------------
}

class SocketShimV3 {
  static connect(url, options) {
    url += '/' + options.resource
    options.timeout = options['connect timeout']
    // http -> ws; https -> wss
    url = url.replace(/^http/, 'ws')
    return new SocketShimV3(url, options)
  }

  static get CODE_CONNECT_TIMEOUT() {
    return 4000
  }

  static get CODE_CLIENT_REQUESTED_DISCONNECT() {
    return 4001
  }

  constructor(url, options) {
    this._url = url
    this._options = options
    this._events = new Map()

    this.on('connectionAccepted', (_, publicId, id) => {
      this.id = id
      this._startHealthCheck()
    })
    this.on('connectionRejected', blob => {
      if (blob && blob.flushBootstrap) {
        this._options.bootstrap = undefined
      }
    })

    this._options.usePolling = this._getInitialUsePolling()
    this._populateWsBootstrapBlob(this._getInitialWsBootstrapBlob())
    this._connect()

    // socket.io v0 interface
    const self = this
    this.socket = {
      get connected() {
        return self.connected
      },
      get sessionid() {
        return self.id
      },
      transport: {
        name: self._ws.protocol || 'websocket-v3-dead'
      },
      connect: self.connect.bind(self),
      disconnect: self.disconnect.bind(self)
    }
  }

  get connected() {
    return this._ws.readyState === WebSocket.OPEN
  }

  connect() {
    if (!this._options.bootstrap) {
      fetch(`/project/${this._getProjectId()}/ws/bootstrap`, {
        method: 'POST',
        body: JSON.stringify({
          _csrf: this._getCSRFToken()
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
        .then(async resp => {
          this._populateWsBootstrapBlob(await resp.json())

          this._connect()
        })
        .catch(reason => {
          this._emit('error', `client bootstrap failed: ${reason}`)
        })
    } else {
      setTimeout(() => this._connect())
    }
  }

  disconnect(reason = 'client requested disconnect') {
    // the 'connect timeout' handler should not trigger an error
    clearTimeout(this._connectTimeoutHandler)
    // calling .close on a closed ws is a noop
    this._ws.close(SocketShimV3.CODE_CLIENT_REQUESTED_DISCONNECT, reason)
    this._emit('disconnect', reason)
  }

  emit(event, ...args) {
    const cb = typeof args[args.length - 1] === 'function' && args.pop()

    if (!this.connected) {
      // sending on a connecting/closing/closed ws throws INVALID_STATE_ERR
      // discard the event as it is associated with an old session anyways.
      // -> a new connection can start from scratch
      sl_console.log('[SocketShimV3] ws not ready, discarding', event, args)
      if (cb) {
        const cancelledError = new Error('rpc cancelled: ws is not ready')
        setTimeout(cb, 0, cancelledError)
      }
      return
    }

    const payload = { event, args }
    if (cb) {
      const cbId = this._nextCallbackId++
      this._callbacks.set(cbId, cb)
      payload.cbId = cbId
    }
    this._ws.send(JSON.stringify(payload))
  }

  on(event, listener) {
    if (!this._events.has(event)) {
      this._events.set(event, [])
    }
    this._events.get(event).push(listener)
  }

  removeListener(event, listener) {
    const listeners = this._events.get(event)
    if (!listeners) {
      return false
    }
    const position = listeners.indexOf(listener)
    if (position === -1) {
      return false
    }
    listeners.splice(position, 1)
    return true
  }

  _connect() {
    const newSocket = this._createTransport()
    this._ws = newSocket

    // reset the rpc tracking
    const callbacks = (this._callbacks = new Map())
    this._nextCallbackId = 1

    clearTimeout(this._connectTimeoutHandler)
    this._connectTimeoutHandler = setTimeout(() => {
      if (newSocket.readyState === WebSocket.CONNECTING) {
        this._emit('error', 'connect timeout')
        newSocket.close(SocketShimV3.CODE_CONNECT_TIMEOUT, 'connect timeout')
      }
    }, this._options.timeout)
    newSocket.onopen = () => {
      if (this._ws !== newSocket) {
        sl_console.log('[SocketShimV3] replaced: ignoring connect')
        return
      }
      clearTimeout(this._connectTimeoutHandler)
      newSocket.onclose = event => {
        if (callbacks.size) {
          // there are pending RPCs that need cancelling
          const cancelledError = new Error('rpc cancelled: ws is closed')
          // detach -- do not block the event loop for too long.
          callbacks.forEach(cb => setTimeout(cb, 0, cancelledError))
          callbacks.clear()
        }
        if (this._ws !== newSocket) {
          sl_console.log('[SocketShimV3] replaced: ignoring disconnect', event)
          return
        }
        if (event.code !== SocketShimV3.CODE_CLIENT_REQUESTED_DISCONNECT) {
          this._emit('disconnect', event.reason)
        }
      }
      this._emit('connect')
    }
    newSocket.onerror = event => {
      if (this._ws !== newSocket) {
        sl_console.log('[SocketShimV3] replaced: ignoring error', event)
        return
      }
      clearTimeout(this._connectTimeoutHandler)
      this._emit('error', event)
    }
    if (newSocket instanceof Polling) {
      // messages coming in via Polling are parsed in bulk
      newSocket.onParsedMessage = parsed => {
        this._onMessage(callbacks, parsed)
      }
    } else {
      newSocket.onmessage = event => {
        this._onMessage(callbacks, JSON.parse(event.data))
      }
    }
  }

  _createTransport() {
    if (this._options.usePolling) {
      return new Polling(this._url, this._options)
    }
    return this._createWebsocket(
      `${this._url}?bootstrap=${this._options.bootstrap}`
    )
  }

  _emit(event, ...args) {
    const listeners = this._events.get(event)
    if (!listeners) {
      sl_console.log('[SocketShimV3] missing handler', event)
      return
    }
    listeners.slice().forEach(listener => {
      listener.apply(null, args)
    })
  }

  _onMessage(callbacks, parsed) {
    const { cbId, event, args } = parsed
    if (cbId) {
      if (callbacks.has(cbId)) {
        const cb = callbacks.get(cbId)
        callbacks.delete(cbId)
        cb.apply(null, args)
      } else {
        sl_console.log('[SocketShimV3] unknown cbId', cbId, args)
      }
      return
    }
    this._emit(event, ...args)
  }

  _populateWsBootstrapBlob(blob) {
    const { bootstrap, expiry } = blob
    this._options.bootstrap = bootstrap
    setTimeout(() => {
      if (this._options.bootstrap === bootstrap) {
        this._options.bootstrap = undefined
      }
    }, expiry * 1000)
  }

  _startHealthCheck() {
    if (this._ws instanceof Polling) {
      // Polling has an implicit health check from polling requests
      return
    }
    const healthCheckEmitter = setInterval(() => {
      if (!this.connected) {
        clearInterval(healthCheckEmitter)
      }
      this.emit('ping', () => {
        clearTimeout(timeout)
      })
      const timeout = setTimeout(() => {
        if (!this.connected) return
        this.disconnect('client health check timeout')
      }, this._options.timeout)
    }, this._options.timeout)
    const cleanup = () => {
      clearInterval(healthCheckEmitter)
      this.removeListener('disconnect', cleanup)
    }
    this.on('disconnect', cleanup)
  }

  // -----------------------
  // platform specific logic
  _createWebsocket(url) {
    return new WebSocket(url, 'v3.real-time.overleaf.com')
  }

  _getCSRFToken() {
    return window.csrfToken
  }

  _getProjectId() {
    return window.project_id
  }

  _getInitialUsePolling() {
    return window.location.href.indexOf('polling=true') !== -1
  }

  _getInitialWsBootstrapBlob() {
    return window.wsBootstrap
  }
  // platform specific logic
  // -----------------------
}

let current
if (typeof io === 'undefined' || !io) {
  sl_console.log('[socket.io] Shim: socket.io is not loaded, returning noop')
  current = SocketShimNoop
} else if (typeof io.version === 'string' && io.version.slice(0, 1) === '0') {
  sl_console.log('[socket.io] Shim: detected v0')
  current = SocketShimV0
} else if (io === 'plain') {
  sl_console.log('[socket.io] Shim: detected v3 (plain ws)')
  current = SocketShimV3
} else {
  // socket.io v2 does not have a global io.version attribute.
  sl_console.log('[socket.io] Shim: detected v2')
  current = SocketShimV2
}

export default {
  SocketShimNoop,
  SocketShimV0,
  SocketShimV2,
  current,
  connect: current.connect,
  stub: () => new SocketShimNoop()
}
