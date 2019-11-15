const userAgent = navigator.userAgent
const platform = navigator.platform

export let ios = /AppleWebKit/.test(userAgent) && /Mobile\/\w+/.test(userAgent)
export let mac = ios || /Mac/.test(platform)
