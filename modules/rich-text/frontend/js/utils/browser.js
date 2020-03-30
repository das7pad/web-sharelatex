const userAgent = navigator.userAgent
const platform = navigator.platform

export const ios =
  /AppleWebKit/.test(userAgent) && /Mobile\/\w+/.test(userAgent)
export const mac = ios || /Mac/.test(platform)
