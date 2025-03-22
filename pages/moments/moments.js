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
    showCommentInput: false
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
    var id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/pages/comment/comment?momentId=' + id
    })
  },

  showCommentInput: function(e) {
    var momentId = e.currentTarget.dataset.id
    this.setData({
      showCommentInput: true,
      currentMomentId: momentId,
      commentInput: ''
    })
  },

  hideCommentInput: function() {
    this.setData({
      showCommentInput: false,
      currentMomentId: '',
      commentInput: ''
    })
  },

  onCommentInput: function(e) {
    this.setData({
      commentInput: e.detail.value
    })
  },

  submitComment: function() {
    var that = this
    var content = this.data.commentInput.trim()
    var momentId = this.data.currentMomentId

    if (!content) {
      wx.showToast({
        title: '请输入评论内容',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '发送中...',
      mask: true
    })

    wx.cloud.callFunction({
      name: 'createComment',
      data: {
        momentId: momentId,
        content: content
      }
    }).then(function(result) {
      if (result.result.success) {
        wx.showToast({
          title: '评论成功',
          icon: 'success'
        })
        that.hideCommentInput()
        that.refreshMoments()
      } else {
        throw new Error(result.result.error || '评论失败')
      }
    }).catch(function(err) {
      console.error('评论失败：', err)
      wx.showToast({
        title: err.message || '评论失败，请重试',
        icon: 'none'
      })
    }).finally(function() {
      wx.hideLoading()
    })
  }
}) 