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
    // 只删除会话数据，保留用户信息
    wx.removeStorageSync('sessionData')
  },

  handleLogin: function() {
    if (this.data.loading) {
      console.log('正在登录中，请勿重复操作')
      return
    }

    console.log('开始登录流程')
    this.setData({ loading: true })
    wx.showLoading({
      title: '登录中...',
      mask: true
    })

    // 使用新的getUserProfile API
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        console.log('获取用户信息成功:', res.userInfo)
        const userInfo = res.userInfo

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
                
                // 保存会话数据
                wx.setStorageSync('sessionData', {
                  sessionKey,
                  sessionExpireTime
                })
                
                // 根据 openid 判断是否是同一用户
                const existingUserInfo = wx.getStorageSync('userInfo') || {}
                if (existingUserInfo.openId === userData.openid) {
                  console.log('检测到同一用户，保留现有数据')
                  // 如果是同一用户，保留现有数据，只更新基本信息
                  const localUserInfo = {
                    ...existingUserInfo,
                    nickName: userData.nickName,
                    avatarUrl: userData.avatarUrl,
                    gender: userData.gender,
                    country: userData.country,
                    province: userData.province,
                    city: userData.city,
                    language: userData.language
                  }
                  wx.setStorageSync('userInfo', localUserInfo)
                  getApp().globalData.userInfo = localUserInfo
                } else {
                  console.log('新用户登录，使用服务器数据')
                  // 如果是新用户，使用服务器返回的完整数据
                  const localUserInfo = {
                    nickName: userData.nickName,
                    avatarUrl: userData.avatarUrl,
                    gender: userData.gender,
                    country: userData.country,
                    province: userData.province,
                    city: userData.city,
                    language: userData.language,
                    moments: userData.moments || 0,
                    reviews: userData.reviews || 0,
                    likes: userData.likes || 0,
                    openId: userData.openid
                  }
                  wx.setStorageSync('userInfo', localUserInfo)
                  getApp().globalData.userInfo = localUserInfo
                }

                getApp().globalData.isLoggedIn = true
                console.log('用户信息保存成功:', getApp().globalData.userInfo)
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
      fail: (err) => {
        console.error('获取用户信息失败：', err)
        wx.hideLoading()
        wx.showToast({
          title: '需要授权才能使用完整功能',
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