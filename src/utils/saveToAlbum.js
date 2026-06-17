/* eslint-disable camelcase */

/**
 * saveToAlbum.js
 * ------------------------------------------------------------------
 * 保存图片到系统相册（微信小程序正式版需隐私协议 + 相册写入权限）
 * ------------------------------------------------------------------
 */

function getWx() {
  // #ifdef MP-WEIXIN
  return typeof wx !== 'undefined' ? wx : null
  // #endif
  // #ifndef MP-WEIXIN
  return null
  // #endif
}

function requirePrivacyAuthorize() {
  return new Promise((resolve, reject) => {
    const wxApi = getWx()
    if (wxApi && wxApi.requirePrivacyAuthorize) {
      wxApi.requirePrivacyAuthorize({
        success: () => resolve(),
        fail: (err) => reject(err || { errMsg: 'requirePrivacyAuthorize:fail' })
      })
      return
    }
    resolve()
  })
}

function saveFileToAlbum(filePath) {
  return new Promise((resolve, reject) => {
    uni.saveImageToPhotosAlbum({
      filePath,
      success: () => resolve(),
      fail: (err) => reject(err || { errMsg: 'saveImageToPhotosAlbum:fail' })
    })
  })
}

function classifySaveError(err) {
  const msg = (err && err.errMsg) || ''
  if (msg.indexOf('privacy') >= 0 || msg.indexOf('banned') >= 0) {
    return 'privacy'
  }
  if (msg.indexOf('not declared') >= 0) {
    return 'privacy_undeclared'
  }
  if (msg.indexOf('auth') >= 0 || msg.indexOf('deny') >= 0) {
    return 'auth'
  }
  return 'unknown'
}

function showSaveError(err) {
  const kind = classifySaveError(err)

  if (kind === 'privacy' || kind === 'privacy_undeclared') {
    uni.showModal({
      title: '需要隐私授权',
      content: '保存图片需同意《用户隐私保护指引》。请阅读并同意隐私协议后重试。',
      confirmText: '查看协议',
      success: (res) => {
        if (!res.confirm) return
        const wxApi = getWx()
        if (wxApi && wxApi.openPrivacyContract) {
          wxApi.openPrivacyContract()
        }
      }
    })
    return
  }

  if (kind === 'auth') {
    uni.showModal({
      title: '需要相册权限',
      content: '请在设置中允许保存图片到相册',
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) {
          uni.openSetting()
        }
      }
    })
    return
  }

  uni.showToast({ title: '保存失败', icon: 'none' })
}

/**
 * 保存图片到相册（先同步隐私授权，再写入相册）
 * @param {string} filePath 本地临时图片路径
 * @returns {Promise<void>}
 */
export function saveImageToAlbum(filePath) {
  return requirePrivacyAuthorize()
    .then(() => saveFileToAlbum(filePath))
    .catch((err) => {
      showSaveError(err)
      return Promise.reject(err)
    })
}
