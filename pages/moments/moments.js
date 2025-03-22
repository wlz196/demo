Page({
  data: {
    moments: [],
    loading: false,
    page: 1,
    pageSize: 10,
    hasMore: true,
    refreshing: false,
    commentInput: '',
    currentMomentId: '',
    showCommentInput: false,
    commentImages: []
  },

  onLoad: function() {
    this.loadMoments()
  },

  onShow: function() {
    if (this.data.moments.length === 0) {
      this.loadMoments()
    }
  },

  refreshMoments: function() {
    var that = this
    this.setData({
      moments: [],
      page: 1,
      hasMore: true,
      refreshing: true
    }, function() {
      that.loadMoments().then(function() {
        that.setData({ refreshing: false })
      }).catch(function(err) {
        console.error('刷新失败：', err)
        that.setData({ refreshing: false })
      })
    })
  },

  onPullDownRefresh: function() {
    var that = this
    this.setData({
      moments: [],
      page: 1,
      hasMore: true,
      refreshing: true
    }, function() {
      that.loadMoments().then(function() {
        wx.stopPullDownRefresh()
        that.setData({ refreshing: false })
      }).catch(function(err) {
        console.error('下拉刷新失败：', err)
        wx.stopPullDownRefresh()
        that.setData({ refreshing: false })
      })
    })
  },

  onReachBottom: function() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreMoments()
    }
  },

  loadMoments: function() {
    var that = this
    if (this.data.loading) return

    this.setData({ loading: true })

    return wx.cloud.callFunction({
      name: 'getMoments',
      data: {
        page: 1,
        pageSize: this.data.pageSize
      }
    }).then(function(result) {
      if (!result || !result.result) {
        throw new Error('返回数据格式错误')
      }

      if (result.result.success) {
        var list = result.result.data.list
        var hasMore = result.result.data.hasMore
        
        var moments = list.map(function(moment) {
          return Object.assign({}, moment, {
            images: moment.images || []
          })
        })

        that.setData({
          moments: moments,
          hasMore: hasMore
        })
      } else {
        throw new Error(result.result.error || '获取动态失败')
      }
    }).catch(function(err) {
      console.error('加载动态失败：', err)
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none',
        duration: 2000
      })
    }).finally(function() {
      that.setData({ loading: false })
    })
  },

  loadMoreMoments: function() {
    var that = this
    if (this.data.loading) return

    this.setData({ loading: true })

    var nextPage = this.data.page + 1
    wx.cloud.callFunction({
      name: 'getMoments',
      data: {
        page: nextPage,
        pageSize: this.data.pageSize
      }
    }).then(function(result) {
      if (!result || !result.result) {
        throw new Error('返回数据格式错误')
      }

      if (result.result.success) {
        var list = result.result.data.list
        var hasMore = result.result.data.hasMore
        
        var newMoments = list.map(function(moment) {
          return Object.assign({}, moment, {
            images: moment.images || []
          })
        })

        var allMoments = that.data.moments.concat(newMoments)

        that.setData({
          moments: allMoments,
          page: nextPage,
          hasMore: hasMore
        })
      } else {
        throw new Error(result.result.error || '获取更多动态失败')
      }
    }).catch(function(err) {
      console.error('加载更多动态失败：', err)
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none',
        duration: 2000
      })
    }).finally(function() {
      that.setData({ loading: false })
    })
  },

  handleLike: function(e) {
    var that = this
    var momentId = e.currentTarget.dataset.id
    
    wx.cloud.callFunction({
      name: 'toggleMomentLike',
      data: { momentId: momentId }
    }).then(function(result) {
      if (result.result.success) {
        var moments = that.data.moments
        var index = -1
        for (var i = 0; i < moments.length; i++) {
          if (moments[i]._id === momentId) {
            index = i
            break
          }
        }

        if (index > -1) {
          var moment = moments[index]
          var isLiked = !moment.isLiked
          var likes = moment.likes + (isLiked ? 1 : -1)
          
          var data = {}
          data['moments[' + index + '].isLiked'] = isLiked
          data['moments[' + index + '].likes'] = likes
          that.setData(data)
        }
      } else {
        throw new Error(result.result.error || '操作失败')
      }
    }).catch(function(err) {
      console.error('点赞失败：', err)
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      })
    })
  },

  navigateToPublish: function() {
    wx.navigateTo({
      url: '/pages/publish/publish'
    })
  },

  previewImage: function(e) {
    var current = e.currentTarget.dataset.current
    var urls = e.currentTarget.dataset.urls
    wx.previewImage({
      current: current,
      urls: urls
    })
  },

  handleComment: function(e) {
    const momentId = e.currentTarget.dataset.id
    this.setData({
      currentMomentId: momentId,
      showCommentInput: true,
      commentInput: '',
      commentImages: []
    })
  },

  cancelComment: function() {
    this.setData({
      showCommentInput: false,
      commentInput: '',
      commentImages: []
    })
  },

  onCommentInput: function(e) {
    this.setData({
      commentInput: e.detail.value
    })
  },

  chooseCommentImage: function() {
    var that = this
    wx.chooseImage({
      count: 9 - that.data.commentImages.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        that.setData({
          commentImages: that.data.commentImages.concat(res.tempFilePaths)
        })
      }
    })
  },

  previewCommentImage: function(e) {
    const current = e.currentTarget.dataset.current
    wx.previewImage({
      current: current,
      urls: this.data.commentImages
    })
  },

  deleteCommentImage: function(e) {
    const index = e.currentTarget.dataset.index
    const images = this.data.commentImages
    images.splice(index, 1)
    this.setData({
      commentImages: images
    })
  },

  submitComment: function() {
    if (!this.data.commentInput.trim() && this.data.commentImages.length === 0) {
      wx.showToast({
        title: '请输入评论内容或上传图片',
        icon: 'none'
      })
      return
    }

    const that = this
    wx.showLoading({
      title: '发送中...'
    })

    const uploadTasks = this.data.commentImages.map(path => {
      return wx.cloud.uploadFile({
        cloudPath: `comments/${Date.now()}-${Math.random().toString(36).substr(2)}.${path.match(/\.[^.]+?$/)[0]}`,
        filePath: path
      })
    })

    Promise.all(uploadTasks)
      .then(res => {
        const fileIDs = res.map(file => file.fileID)
        
        return wx.cloud.callFunction({
          name: 'createComment',
          data: {
            momentId: this.data.currentMomentId,
            content: this.data.commentInput.trim(),
            images: fileIDs
          }
        })
      })
      .then(() => {
        wx.hideLoading()
        wx.showToast({
          title: '评论成功',
          icon: 'success'
        })
        
        this.refreshMoments()
        
        this.setData({
          showCommentInput: false,
          commentInput: '',
          commentImages: []
        })
      })
      .catch(err => {
        console.error('评论失败：', err)
        wx.hideLoading()
        wx.showToast({
          title: '评论失败',
          icon: 'none'
        })
      })
  }
}) 