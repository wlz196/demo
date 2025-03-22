// 发布页面
Page({
  data: {
    content: '',
    images: [],
    maxImageCount: 9,
    submitting: false
  },

  handleInput: function(e) {
    this.setData({
      content: e.detail.value
    })
  },

  chooseImage: function() {
    var that = this
    var images = this.data.images
    var maxImageCount = this.data.maxImageCount
    var remainCount = maxImageCount - images.length
    
    if (remainCount <= 0) {
      wx.showToast({
        title: '最多只能上传9张图片',
        icon: 'none'
      })
      return
    }

    wx.chooseImage({
      count: remainCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        // 将图片上传到云存储
        var uploadTasks = res.tempFilePaths.map(function(path) {
          var cloudPath = 'moments/' + Date.now() + '-' + Math.random().toString(36).slice(-6) + path.match(/\.[^.]+$/)[0]
          return wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: path
          })
        })

        Promise.all(uploadTasks).then(function(results) {
          var newFileIDs = results.map(function(res) {
            return res.fileID
          })
          var allImages = images.concat(newFileIDs)
          that.setData({
            images: allImages
          })
        }).catch(function(err) {
          console.error('图片上传失败', err)
          wx.showToast({
            title: '图片上传失败',
            icon: 'none'
          })
        })
      }
    })
  },

  removeImage: function(e) {
    var index = e.currentTarget.dataset.index
    var images = this.data.images
    var removedImage = images[index]
    
    // 从云存储中删除图片
    wx.cloud.deleteFile({
      fileList: [removedImage]
    }).catch(function(err) {
      console.error('删除云存储图片失败', err)
    })

    images.splice(index, 1)
    this.setData({
      images: images
    })
  },

  previewImage: function(e) {
    var index = e.currentTarget.dataset.index
    var images = this.data.images
    
    wx.previewImage({
      current: images[index],
      urls: images
    })
  },

  navigateBack: function() {
    var that = this
    var content = this.data.content
    var images = this.data.images
    
    if (content || images.length > 0) {
      wx.showModal({
        title: '提示',
        content: '是否放弃当前编辑？',
        success: function(res) {
          if (res.confirm) {
            // 如果放弃编辑，删除已上传的图片
            if (images.length > 0) {
              wx.cloud.deleteFile({
                fileList: images
              }).catch(function(err) {
                console.error('删除云存储图片失败', err)
              })
            }
            wx.navigateBack()
          }
        }
      })
    } else {
      wx.navigateBack()
    }
  },

  publish: function() {
    var that = this
    var content = this.data.content.trim()
    var images = this.data.images
    var submitting = this.data.submitting
    
    if (submitting) return
    
    if (!content) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none'
      })
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({
      title: '发布中...',
      mask: true
    })

    // 调用云函数发布动态
    wx.cloud.callFunction({
      name: 'createMoment',
      data: {
        content: content,
        images: images
      }
    }).then(function(result) {
      if (result.result.success) {
        wx.showToast({
          title: '发布成功',
          icon: 'success'
        })
        
        setTimeout(function() {
          wx.navigateBack()
        }, 1500)
      } else {
        throw new Error(result.result.error || '发布失败')
      }
    }).catch(function(error) {
      console.error('发布失败：', error)
      wx.showModal({
        title: '发布失败',
        content: error.message || '请稍后重试',
        showCancel: false
      })
    }).finally(function() {
      wx.hideLoading()
      that.setData({ submitting: false })
    })
  }
}) 