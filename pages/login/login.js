Page({
  data: {
    loading: false
  },

  onLoad: function() {
    console.log('登录页面加载')
    this.checkSession()
  },

  checkSession: function() {
    console.log('检查登录态')
    const sessionData = wx.getStorageSync('sessionData')
    if (sessionData && sessionData.sessionKey && sessionData.sessionExpireTime) {
      if (new Date(sessionData.sessionExpireTime) > new Date()) {
        console.log('登录态有效，直接跳转')
        this.navigateAfterLogin()
        return
      }
    }
    console.log('登录态无效或过期')
    wx.removeStorageSync('sessionData')
    wx.removeStorageSync('userInfo')
  },

  handleLogin: function(e) {
    if (this.data.loading) {
      console.log('正在登录中，请勿重复操作')
      return
    }
    
    if (!e.detail.userInfo) {
      console.log('用户拒绝授权')
      wx.showToast({
        title: '需要您的授权才能继续使用',
        icon: 'none',
        duration: 2000
      })
      return
    }

    console.log('开始登录流程')
    this.setData({ loading: true })
    wx.showLoading({
      title: '登录中...',
      mask: true
    })

    const userInfo = e.detail.userInfo
    console.log('获取用户信息成功:', userInfo)

    wx.login({
      success: res => {
        if (!res.code) {
          console.error('wx.login 失败：未获取到 code')
          wx.hideLoading()
          wx.showToast({
            title: '登录失败，请重试',
            icon: 'none',
            duration: 2000
          })
          this.setData({ loading: false })
          return
        }

        console.log('获取登录code成功:', res.code)
        
        wx.cloud.callFunction({
          name: 'login',
          data: {
            code: res.code,
            userInfo: {
              nickName: userInfo.nickName,
              avatarUrl: userInfo.avatarUrl,
              gender: userInfo.gender,
              country: userInfo.country,
              province: userInfo.province,
              city: userInfo.city,
              language: userInfo.language
            }
          }
        })
        .then(result => {
          console.log('云函数调用成功:', result)
          if (result.result && result.result.success) {
            const { sessionKey, sessionExpireTime, userInfo: userData } = result.result.data
            
            wx.setStorageSync('sessionData', {
              sessionKey,
              sessionExpireTime
            })
            
            wx.setStorageSync('userInfo', userData)

            getApp().globalData.userInfo = userData
            getApp().globalData.isLoggedIn = true
            
            wx.hideLoading()
            this.navigateAfterLogin()
          } else {
            throw new Error(result.result.error || '登录失败')
          }
        })
        .catch(err => {
          console.error('登录失败：', err)
          wx.hideLoading()
          wx.showToast({
            title: '登录失败，请重试',
            icon: 'none',
            duration: 2000
          })
        })
        .finally(() => {
          this.setData({ loading: false })
        })
      },
      fail: err => {
        console.error('wx.login 失败：', err)
        wx.hideLoading()
        wx.showToast({
          title: '登录失败，请重试',
          icon: 'none',
          duration: 2000
        })
        this.setData({ loading: false })
      }
    })
  },

  navigateAfterLogin: function() {
    console.log('登录成功，准备跳转')
    wx.switchTab({
      url: '/pages/moments/moments',
      success: () => console.log('跳转成功'),
      fail: err => console.error('跳转失败：', err)
    })
  }
}) 