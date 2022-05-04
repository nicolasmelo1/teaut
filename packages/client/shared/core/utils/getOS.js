export default function getOS() {
    const userAgent = window.navigator.userAgent.toLowerCase()
    const macosPlatforms = /(macintosh|macintel|macppc|mac68k|macos)/i
    const windowsPlatforms = /(win32|win64|windows|wince)/i
    const iosPlatforms = /(iphone|ipad|ipod)/i
  
    const isMacos = macosPlatforms.test(userAgent)
    const isIOS = iosPlatforms.test(userAgent)
    const isWindows = windowsPlatforms.test(userAgent)
    const isAndroid = /android/.test(userAgent)
    const isLinux = /linux/.test(userAgent)

    if (isMacos) {
        return 'macos'
    } else if (isIOS) {
        return 'ios'
    } else if (isWindows) {
        return "windows"
    } else if (isAndroid) {
        return "android"
    } else if (isLinux) {
        return "linux"
    }
}