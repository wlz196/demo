Page({
  data: {
    places: [],
    loading: false,
    categories: ['全部', '美食', '咖啡', '甜品', '购物'],
    currentCategory: 0,
    page: 1,
    hasMore: true
  },

  onLoad() {
    this.loadPlaces()
  },

  onPullDownRefresh() {
    this.setData({
      page: 1,
      hasMore: true
    }, () => {
      this.loadPlaces()
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMorePlaces()
    }
  },

  async loadPlaces() {
    this.setData({ loading: true })
    
    try {
      const { currentCategory, categories } = this.data
      const category = categories[currentCategory]
      
      const result = await wx.cloud.callFunction({
        name: 'getPlaces',
        data: {
          page: 1,
          category: category === '全部' ? '' : category
        }
      })

      if (result.result.success) {
        const { places, pagination } = result.result.data
        this.setData({
          places,
          hasMore: places.length >= pagination.pageSize,
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
    } finally {
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    }
  },

  async loadMorePlaces() {
    const { page, currentCategory, categories } = this.data
    const nextPage = page + 1
    const category = categories[currentCategory]

    this.setData({ loading: true })

    try {
      const result = await wx.cloud.callFunction({
        name: 'getPlaces',
        data: {
          page: nextPage,
          category: category === '全部' ? '' : category
        }
      })

      if (result.result.success) {
        const { places, pagination } = result.result.data
        this.setData({
          places: [...this.data.places, ...places],
          page: nextPage,
          hasMore: places.length >= pagination.pageSize,
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

  switchCategory(e) {
    const { index } = e.currentTarget.dataset
    this.setData({
      currentCategory: index,
      page: 1,
      hasMore: true
    }, () => {
      this.loadPlaces()
    })
  },

  goToDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/place-detail/place-detail?id=${id}`
    })
  }
}) 