Page({
  data: {
    userInfo: null
  },

  onLoad: function() {
    this.loadUserInfo()
  },

  onShow: function() {
    this.loadUserInfo()
  },

  loadUserInfo: function() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({ userInfo })
    } else {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  handleChangeAvatar: function() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        wx.showLoading({
          title: '上传中...',
          mask: true
        })

        // 上传图片到云存储
        const cloudPath = `avatars/${this.data.userInfo.openId}_${Date.now()}.jpg`
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempFilePath,
          success: (res) => {
            // 更新用户信息
            this.updateUserInfo({
              avatarUrl: res.fileID
            })
          },
          fail: (err) => {
            console.error('上传头像失败：', err)
            wx.hideLoading()
            wx.showToast({
              title: '上传失败',
              icon: 'none'
            })
          }
        })
      }
    })
  },

  handleChangeNickname: function() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入新的昵称',
      success: (res) => {
        if (res.confirm && res.content) {
          if (res.content.length > 20) {
            wx.showToast({
              title: '昵称不能超过20个字符',
              icon: 'none'
            })
            return
          }
          // 更新用户信息
          this.updateUserInfo({
            nickName: res.content
          })
        }
      }
    })
  },

  updateUserInfo: function(updateData) {
    wx.showLoading({
      title: '更新中...',
      mask: true
    })

    // 调用云函数更新用户信息
    wx.cloud.callFunction({
      name: 'updateUserInfo',
      data: {
        updateData: updateData
      }
    })
    .then(result => {
      if (result.result && result.result.success) {
        // 更新本地存储的用户信息
        const userInfo = {
          ...this.data.userInfo,
          ...updateData
        }
        wx.setStorageSync('userInfo', userInfo)
        this.setData({ userInfo })

        // 更新全局数据
        getApp().globalData.userInfo = userInfo

        wx.hideLoading()
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        })
      } else {
        throw new Error(result.result.error || '更新失败')
      }
    })
    .catch(err => {
      console.error('更新用户信息失败：', err)
      wx.hideLoading()
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      })
    })
  }
}) 