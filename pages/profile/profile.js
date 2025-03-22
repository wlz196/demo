Page({
  data: {
    userInfo: null,
    statistics: {
      moments: 0,
      likes: 0,
      comments: 0
    }
  },

  onLoad() {
    this.loadUserInfo()
  },

  onShow() {
    this.loadUserInfo()
  },

  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo && userInfo.openId) {
      this.setData({ userInfo })
      this.loadUserStatistics()
    } else {
      // 未登录，跳转到登录页
      wx.redirectTo({
        url: '/pages/login/login'
      })
    }
  },

  loadUserStatistics() {
    const db = wx.cloud.database()
    const _ = db.command

    // 获取用户发布的动态数量
    db.collection('moments')
      .where({
        _openid: this.data.userInfo.openId
      })
      .count()
      .then(res => {
        this.setData({
          'userInfo.momentsCount': res.total
        })
      })

    // 获取用户获得的点赞数
    db.collection('moments')
      .where({
        _openid: this.data.userInfo.openId
      })
      .get()
      .then(res => {
        const likes = res.data.reduce((sum, moment) => sum + (moment.likes || 0), 0)
        this.setData({
          'userInfo.likesCount': likes
        })
      })

    // 获取用户获得的评论数
    db.collection('moments')
      .where({
        _openid: this.data.userInfo.openId
      })
      .get()
      .then(res => {
        const comments = res.data.reduce((sum, moment) => sum + (moment.comments ? moment.comments.length : 0), 0)
        this.setData({
          'userInfo.commentsCount': comments
        })
      })
  },

  goToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    })
  },

  goToMyMoments() {
    wx.navigateTo({
      url: '/pages/my-moments/my-moments'
    })
  },

  goToLikedMoments() {
    wx.navigateTo({
      url: '/pages/liked-moments/liked-moments'
    })
  },

  goToAbout() {
    wx.navigateTo({
      url: '/pages/about/about'
    })
  },

  handleFeedback() {
    wx.navigateTo({
      url: '/pages/feedback/feedback'
    })
  },

  handleLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync()
          wx.reLaunch({
            url: '/pages/login/login'
          })
        }
      }
    })
  }
}) 