define(['angular'], function() {
  const module = angular.module('storage', [])
  module.value('localStorage', factory(localStorage))
  module.value('sessionStorage', factory(sessionStorage))

  /*
    Storage access can throw browser exceptions, for example if it is full
    We don't use localStorage/sessionStorage for anything critical - just
    fail gracefully.
    */
  function factory(storage) {
    return (...args) => {
      try {
        if (args.length === 1) {
          return JSON.parse(storage.getItem(args[0]))
        }
        if (args[1] === null) {
          return storage.removeItem(args[0])
        }
        return storage.setItem(args[0], JSON.stringify(args[1]))
      } catch (e) {
        console.error('Storage access exception', e)
        return null
      }
    }
  }
})
