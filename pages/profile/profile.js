Page({
  data: {
    userInfo: null,
    statistics: {
      moments: 0,
      reviews: 0,
      likes: 0
    }
  },

  onLoad: function() {
    this.loadUserInfo()
  },

  onShow: function() {
    this.loadUserInfo()
  },

  loadUserInfo: function() {
    // 获取本地存储的用户信息
    var userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({ 
        userInfo: userInfo,
        statistics: {
          moments: userInfo.moments || 0,
          reviews: userInfo.reviews || 0,
          likes: userInfo.likes || 0
        }
      })
    } else {
      // 未登录，跳转到登录页
      wx.redirectTo({
        url: '/pages/login/login'
      })
    }
  },

  goToSettings: function() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    })
  },

  goToMyMoments: function() {
    wx.navigateTo({
      url: '/pages/my-moments/my-moments'
    })
  },

  goToMyReviews: function() {
    wx.navigateTo({
      url: '/pages/my-reviews/my-reviews'
    })
  },

  handleLogout: function() {
    var that = this
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: function(res) {
        if (res.confirm) {
          // 清除本地存储的用户信息
          wx.removeStorageSync('userInfo')
          wx.removeStorageSync('sessionData')
          
          // 清除全局数据
          getApp().globalData.userInfo = null
          getApp().globalData.isLoggedIn = false
          
          // 跳转到登录页
          wx.redirectTo({
            url: '/pages/login/login'
          })
        }
      }
    })
  }
}) 