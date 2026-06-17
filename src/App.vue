<script>
let privacyResolve = null

export default {
  onLaunch() {
    // #ifdef MP-WEIXIN
    if (typeof wx !== 'undefined' && wx.onNeedPrivacyAuthorization) {
      wx.onNeedPrivacyAuthorization((resolve) => {
        privacyResolve = resolve
        uni.showModal({
          title: '用户隐私保护提示',
          content: '保存图片等功能需要您阅读并同意《用户隐私保护指引》',
          confirmText: '同意',
          cancelText: '拒绝',
          success: (res) => {
            if (!privacyResolve) return
            if (res.confirm) {
              privacyResolve({ event: 'agree' })
            } else {
              privacyResolve({ event: 'disagree' })
            }
            privacyResolve = null
          },
          fail: () => {
            if (privacyResolve) {
              privacyResolve({ event: 'disagree' })
              privacyResolve = null
            }
          }
        })
      })
    }
    // #endif
  },
  onShow() {},
  onHide() {}
}
</script>

<style lang="scss">
/* 全局样式 */
page {
  font-family: 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #f7f7fb;
  height: 100%;
  overflow: hidden;
}
</style>
