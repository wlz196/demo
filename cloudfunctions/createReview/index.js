// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { placeId, content, rating, images = [] } = event
  const { OPENID } = wxContext

  try {
    // 获取用户信息
    const userResult = await db.collection('users').where({
      _openid: OPENID
    }).get()

    if (userResult.data.length === 0) {
      throw new Error('用户不存在')
    }

    const user = userResult.data[0]

    // 上传图片到云存储
    const fileIds = []
    for (let i = 0; i < images.length; i++) {
      const result = await cloud.uploadFile({
        cloudPath: `reviews/${Date.now()}-${i}.${images[i].match(/\.([^.]+)$/)[1]}`,
        fileContent: images[i]
      })
      fileIds.push(result.fileID)
    }

    // 创建评价
    const review = {
      _openid: OPENID,
      placeId,
      content,
      rating,
      images: fileIds,
      user: {
        _id: user._id,
        nickName: user.nickName,
        avatarUrl: user.avatarUrl
      },
      likes: 0,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    }

    // 添加评价到数据库
    const reviewResult = await db.collection('reviews').add({
      data: review
    })

    // 更新餐馆的评分信息
    const placeResult = await db.collection('places').doc(placeId).get()
    const place = placeResult.data
    const newRatingCount = place.ratingCount + 1
    const newRating = ((place.rating * place.ratingCount) + rating) / newRatingCount

    await db.collection('places').doc(placeId).update({
      data: {
        rating: newRating,
        ratingCount: newRatingCount,
        updatedAt: db.serverDate()
      }
    })

    // 更新用户统计
    await db.collection('users').doc(user._id).update({
      data: {
        'statistics.reviews': db.command.inc(1),
        updatedAt: db.serverDate()
      }
    })

    return {
      success: true,
      data: {
        reviewId: reviewResult._id
      }
    }
  } catch (error) {
    console.error('[云函数] [createReview] 调用失败', error)
    return {
      success: false,
      error: error.message
    }
  }
} 