// pages/write-review/write-review.js
const { checkText } = require('../../utils/contentSecurity.js')

Page({

    /**
     * 页面的初始数据
     */
    data: {
        placeId: null,
        content: '',
        images: [],
        maxImageCount: 3,
        rating: 5,
        submitting: false
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {
        const { placeId } = options
        this.setData({ placeId })
    },

    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady() {

    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow() {

    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide() {

    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload() {

    },

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh() {

    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom() {

    },

    /**
     * 用户点击右上角分享
     */
    onShareAppMessage() {

    },

    handleInput(e) {
        this.setData({
            content: e.detail.value
        })
    },

    setRating(e) {
        const { rating } = e.currentTarget.dataset
        this.setData({ rating })
    },

    chooseImage() {
        const { images, maxImageCount } = this.data
        const remainCount = maxImageCount - images.length
        
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
            success: (res) => {
                this.setData({
                    images: [...images, ...res.tempFilePaths]
                })
            }
        })
    },

    removeImage(e) {
        const { index } = e.currentTarget.dataset
        const { images } = this.data
        images.splice(index, 1)
        this.setData({ images })
    },

    previewImage(e) {
        const { url } = e.currentTarget.dataset
        wx.previewImage({
            current: url,
            urls: this.data.images
        })
    },

    async submitReview() {
        const { content, images, placeId, rating, submitting } = this.data
        
        if (submitting) return
        
        if (!content.trim()) {
            wx.showToast({
                title: '请输入评价内容',
                icon: 'none'
            })
            return
        }

        this.setData({ submitting: true })
        wx.showLoading({
            title: '发送中...'
        })

        try {
            // 检查文本内容
            const textCheck = await checkText(content)
            if (!textCheck.result) {
                wx.showToast({
                    title: textCheck.msg,
                    icon: 'none'
                })
                return
            }

            // 上传图片
            const uploadTasks = images.map(filePath => {
                return wx.cloud.uploadFile({
                    cloudPath: `reviews/${Date.now()}-${Math.random().toString(36).substr(2)}.${filePath.match(/\.(\w+)$/)[1]}`,
                    filePath
                })
            })

            const uploadResults = await Promise.all(uploadTasks)
            const fileIds = uploadResults.map(res => res.fileID)

            // 创建评价
            const result = await wx.cloud.callFunction({
                name: 'createReview',
                data: {
                    placeId,
                    content,
                    images: fileIds,
                    rating
                }
            })

            if (result.result.success) {
                wx.showToast({
                    title: '发布成功',
                    icon: 'success'
                })
                setTimeout(() => {
                    wx.navigateBack()
                }, 1500)
            } else {
                throw new Error(result.result.error || '发布失败')
            }
        } catch (error) {
            console.error('发布评价失败：', error)
            wx.showToast({
                title: '发布失败，请重试',
                icon: 'none'
            })
        } finally {
            wx.hideLoading()
            this.setData({ submitting: false })
        }
    },

    navigateBack() {
        const { content, images } = this.data
        if (content || images.length > 0) {
            wx.showModal({
                title: '提示',
                content: '是否放弃当前编辑？',
                success: (res) => {
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