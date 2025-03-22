// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const MAX_LIMIT = 10 // 每页评论数量

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { placeId, reviewPage = 1 } = event
  const skip = (reviewPage - 1) * MAX_LIMIT

  try {
    // 获取餐馆基本信息
    const placeResult = await db.collection('places').doc(placeId).get()
    const place = placeResult.data

    // 获取评论总数
    const reviewCountResult = await db.collection('reviews')
      .where({
        placeId: placeId
      })
      .count()
    const total = reviewCountResult.total

    // 获取评论列表
    const reviewsResult = await db.collection('reviews')
      .where({
        placeId: placeId
      })
      .skip(skip)
      .limit(MAX_LIMIT)
      .orderBy('createdAt', 'desc')
      .get()

    // 获取当前用户的点赞记录
    const likesResult = await db.collection('likes')
      .where({
        _openid: wxContext.OPENID,
        reviewId: db.command.in(reviewsResult.data.map(review => review._id))
      })
      .get()

    // 将点赞状态添加到评论中
    const likedReviewIds = new Set(likesResult.data.map(like => like.reviewId))
    const reviews = reviewsResult.data.map(review => ({
      ...review,
      isLiked: likedReviewIds.has(review._id)
    }))

    return {
      success: true,
      data: {
        place,
        reviews,
        reviewPagination: {
          current: reviewPage,
          pageSize: MAX_LIMIT,
          total
        }
      }
    }
  } catch (error) {
    console.error('[云函数] [getPlaceDetail] 调用失败', error)
    return {
      success: false,
      error: error.message
    }
  }
} 