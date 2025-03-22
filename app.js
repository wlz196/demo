// app.js
App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: "cloud1-7gkxttzsfea71e5f",
        traceUser: true
      })
    }

    this.globalData = {
      userInfo: null,
      isLoggedIn: false
    }

    // 检查登录态
    this.checkSession()
  },
  globalData: {
    userInfo: null,
    isLoggedIn: false
  },
  checkSession() {
    const sessionData = wx.getStorageSync('sessionData')
    if (sessionData && sessionData.sessionKey && sessionData.sessionExpireTime) {
      // 检查会话是否过期
      if (new Date(sessionData.sessionExpireTime) > new Date()) {
        // 会话未过期，获取存储的用户信息
        const userInfo = wx.getStorageSync('userInfo')
        if (userInfo) {
          this.globalData.userInfo = userInfo
          this.globalData.isLoggedIn = true
          return
        }
      }
    }
    
    // 会话过期或不存在，清除存储的数据
    this.clearLoginState()
  },
  clearLoginState() {
    wx.removeStorageSync('sessionData')
    wx.removeStorageSync('userInfo')
    this.globalData.userInfo = null
    this.globalData.isLoggedIn = false
  },
  // 检查是否需要登录
  checkLoginStatus() {
    if (!this.globalData.isLoggedIn) {
      wx.redirectTo({
        url: '/pages/login/login'
      })
      return false
    }
    return true
  }
})
