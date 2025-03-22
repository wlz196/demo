// API请求工具函数
const api = {
  // 基础请求方法
  request: function(options) {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: options.name,
        data: options.data || {},
        success: res => {
          if (res.result && res.result.success) {
            resolve(res.result.data)
          } else {
            reject(new Error(res.result.error || '请求失败'))
          }
        },
        fail: err => {
          console.error('[API]', options.name, err)
          reject(new Error('网络请求失败'))
        }
      })
    })
  },

  // 创建评论
  createReview: function(placeId, data) {
    return this.request({
      name: 'createReview',
      data: {
        placeId,
        content: data.content,
        images: data.images,
        rating: data.rating
      }
    })
  },

  // 获取评论列表
  getReviews: function(placeId, page = 1, pageSize = 10) {
    return this.request({
      name: 'getReviews',
      data: {
        placeId,
        page,
        pageSize
      }
    })
  },

  // 删除评论
  deleteReview: function(reviewId) {
    return this.request({
      name: 'deleteReview',
      data: {
        reviewId
      }
    })
  }
}

module.exports = {
  api
} 