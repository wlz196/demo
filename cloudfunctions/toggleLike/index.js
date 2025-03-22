// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { reviewId } = event
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

    // 检查是否已经点赞
    const likeResult = await db.collection('likes').where({
      _openid: OPENID,
      reviewId: reviewId
    }).get()

    const isLiked = likeResult.data.length > 0

    if (isLiked) {
      // 取消点赞
      await db.collection('likes').doc(likeResult.data[0]._id).remove()
      
      // 更新评论点赞数
      await db.collection('reviews').doc(reviewId).update({
        data: {
          likes: db.command.inc(-1),
          updatedAt: db.serverDate()
        }
      })

      return {
        success: true,
        data: {
          isLiked: false
        }
      }
    } else {
      // 添加点赞
      await db.collection('likes').add({
        data: {
          _openid: OPENID,
          reviewId: reviewId,
          userId: user._id,
          createdAt: db.serverDate()
        }
      })

      // 更新评论点赞数
      await db.collection('reviews').doc(reviewId).update({
        data: {
          likes: db.command.inc(1),
          updatedAt: db.serverDate()
        }
      })

      return {
        success: true,
        data: {
          isLiked: true
        }
      }
    }
  } catch (error) {
    console.error('[云函数] [toggleLike] 调用失败', error)
    return {
      success: false,
      error: error.message
    }
  }
} 