// Lifted and modified from: https://github.com/chalk/supports-color/blob/main/index.js (MIT)
"use strict"

const tty = require("tty")
const os = require("os")
const { env } = process

function translateLevel(level) {
  if (level === 0) {
    return false
  }

  return {
    level,
    hasBasic: true,
    has256: level >= 2,
    has16m: level >= 3,
  }
}

function envForceColor() {
  if ("FORCE_COLOR" in env) {
    if (env.FORCE_COLOR === "true") {
      return 1
    }

    if (env.FORCE_COLOR === "false") {
      return 0
    }

    return env.FORCE_COLOR.length === 0 ? 1 : Math.min(Number.parseInt(env.FORCE_COLOR, 10), 3)
  }
}

function _supportsColor(haveStream, { streamIsTTY, sniffFlags = false } = {}) {
  const noFlagForceColor = envForceColor()
  let flagForceColor;
  if (noFlagForceColor !== undefined) {
    flagForceColor = noFlagForceColor
  }

  const forceColor = sniffFlags ? flagForceColor : noFlagForceColor

  if (forceColor === 0) {
    return 0
  }

  if (sniffFlags) {
    if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) {
      return 3
    }

    if (hasFlag("color=256")) {
      return 2
    }
  }

  if (haveStream && !streamIsTTY && forceColor === undefined) {
    return 0
  }

  const min = forceColor || 0

  if (env.TERM === "dumb") {
    return min
  }

  if (process.platform === "win32") {
    // Windows 10 build 10586 is the first Windows release that supports 256 colors.
    // Windows 10 build 14931 is the first release that supports 16m/TrueColor.
    const osRelease = os.release().split(".")
    if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10_586) {
      return Number(osRelease[2]) >= 14_931 ? 3 : 2
    }

    return 1
  }

  if ("CI" in env) {
    if (
      ["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE", "DRONE"].some(
        (sign) => sign in env,
      ) ||
      env.CI_NAME === "codeship"
    ) {
      return 1
    }

    return min
  }

  if ("TEAMCITY_VERSION" in env) {
    return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0
  }

  if (env.COLORTERM === "truecolor") {
    return 3
  }

  if ("TERM_PROGRAM" in env) {
    const version = Number.parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10)

    switch (env.TERM_PROGRAM) {
      case "iTerm.app":
        return version >= 3 ? 3 : 2
      case "Apple_Terminal":
        return 2
      // No default
    }
  }

  if (/-256(color)?$/i.test(env.TERM)) {
    return 2
  }

  if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
    return 1
  }

  if ("COLORTERM" in env) {
    return 1
  }

  return min
}

function createSupportsColor(stream, options = {}) {
  const level = _supportsColor(stream, {
    streamIsTTY: stream && stream.isTTY,
    ...options,
  })

  return translateLevel(level)
}

const supportsColor = {
  stdout: createSupportsColor({ isTTY: tty.isatty(1) }),
  stderr: createSupportsColor({ isTTY: tty.isatty(2) }),
}

exports.supportsColor = supportsColor

// https://github.com/sindresorhus/is-unicode-supported/blob/main/index.js (MIT)
function isUnicodeSupported() {
  if (process.platform !== "win32") {
    return process.env.TERM !== "linux" // Linux console (kernel)
  }

  return (
    Boolean(process.env.CI) ||
    Boolean(process.env.WT_SESSION) || // Windows Terminal
    process.env.ConEmuTask === "{cmd::Cmder}" || // ConEmu and cmder
    process.env.TERM_PROGRAM === "vscode" ||
    process.env.TERM === "xterm-256color" ||
    process.env.TERM === "alacritty"
  )
}
exports.isUnicodeSupported = isUnicodeSupported
