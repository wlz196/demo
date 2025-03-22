// 评论页面
Page({
  data: {
    momentId: null,
    content: '',
    images: [],
    maxImageCount: 3,
    submitting: false
  },

  onLoad: function(options) {
    var momentId = options.momentId
    this.setData({ momentId: momentId })
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
        title: '最多只能上传3张图片',
        icon: 'none'
      })
      return
    }

    wx.chooseImage({
      count: remainCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        var newImages = images.concat(res.tempFilePaths)
        that.setData({
          images: newImages
        })
      }
    })
  },

  removeImage: function(e) {
    var index = e.currentTarget.dataset.index
    var images = this.data.images
    images.splice(index, 1)
    this.setData({ images: images })
  },

  previewImage: function(e) {
    var url = e.currentTarget.dataset.url
    wx.previewImage({
      current: url,
      urls: this.data.images
    })
  },

  submitComment: function() {
    var that = this
    var content = this.data.content.trim()
    var images = this.data.images
    var momentId = this.data.momentId
    var submitting = this.data.submitting
    
    if (submitting) return
    
    if (!content) {
      wx.showToast({
        title: '请输入评论内容',
        icon: 'none'
      })
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({
      title: '发送中...',
      mask: true
    })

    // 上传图片到云存储
    var uploadedImages = []
    var uploadPromises = []

    if (images.length > 0) {
      for (var i = 0; i < images.length; i++) {
        var imagePath = images[i]
        var cloudPath = 'comments/' + Date.now() + '-' + Math.random().toString(36).slice(-6) + '.' + imagePath.match(/\.(\w+)$/)[1]
        
        var promise = wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: imagePath
        }).then(function(res) {
          uploadedImages.push(res.fileID)
        })

        uploadPromises.push(promise)
      }
    }

    // 等待所有图片上传完成
    Promise.all(uploadPromises).then(function() {
      // 创建评论
      return wx.cloud.callFunction({
        name: 'createComment',
        data: {
          momentId: momentId,
          content: content,
          images: uploadedImages
        }
      })
    }).then(function(result) {
      if (result.result.success) {
        wx.showToast({
          title: '评论成功',
          icon: 'success'
        })
        
        setTimeout(function() {
          wx.navigateBack()
        }, 1500)
      } else {
        throw new Error(result.result.error || '评论失败')
      }
    }).catch(function(error) {
      console.error('评论失败：', error)
      wx.showModal({
        title: '评论失败',
        content: error.message || '请稍后重试',
        showCancel: false
      })
    }).finally(function() {
      wx.hideLoading()
      that.setData({ submitting: false })
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
            wx.navigateBack()
          }
        }
      })
    } else {
      wx.navigateBack()
    }
  }
}) 