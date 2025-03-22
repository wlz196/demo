Page({
  data: {
    place: null,
    reviews: [],
    loading: false,
    reviewPage: 1,
    hasMore: true,
    placeId: null
  },

  onLoad(options) {
    const { id } = options
    this.setData({ placeId: id }, () => {
      this.loadPlaceDetail()
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreReviews()
    }
  },

  async loadPlaceDetail() {
    const { placeId } = this.data
    wx.showLoading({ title: '加载中...' })

    try {
      const result = await wx.cloud.callFunction({
        name: 'getPlaceDetail',
        data: {
          placeId,
          reviewPage: 1
        }
      })

      if (result.result.success) {
        const { place, reviews, reviewPagination } = result.result.data
        this.setData({
          place,
          reviews,
          hasMore: reviews.length >= reviewPagination.pageSize
        })
      } else {
        throw new Error(result.result.error)
      }
    } catch (error) {
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  async loadMoreReviews() {
    const { placeId, reviewPage, reviews } = this.data
    const nextPage = reviewPage + 1

    this.setData({ loading: true })

    try {
      const result = await wx.cloud.callFunction({
        name: 'getPlaceDetail',
        data: {
          placeId,
          reviewPage: nextPage
        }
      })

      if (result.result.success) {
        const { reviews: newReviews, reviewPagination } = result.result.data
        this.setData({
          reviews: [...reviews, ...newReviews],
          reviewPage: nextPage,
          hasMore: newReviews.length >= reviewPagination.pageSize,
          loading: false
        })
      } else {
        throw new Error(result.result.error)
      }
    } catch (error) {
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },

  async toggleLike(e) {
    const { reviewId } = e.currentTarget.dataset
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'toggleLike',
        data: { reviewId }
      })

      if (result.result.success) {
        const { reviews } = this.data
        const review = reviews.find(r => r._id === reviewId)
        if (review) {
          review.isLiked = result.result.data.isLiked
          review.likes += result.result.data.isLiked ? 1 : -1
          this.setData({ reviews: [...reviews] })
        }
      } else {
        throw new Error(result.result.error)
      }
    } catch (error) {
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  previewImage(e) {
    const { current } = e.currentTarget.dataset
    const { images } = this.data.place
    wx.previewImage({
      current,
      urls: images
    })
  },

  makePhoneCall() {
    const { phone } = this.data.place
    wx.makePhoneCall({
      phoneNumber: phone
    })
  },

  writeReview() {
    const { placeId } = this.data
    wx.navigateTo({
      url: `/pages/write-review/write-review?placeId=${placeId}`
    })
  }
}) 