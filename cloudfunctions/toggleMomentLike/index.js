// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const { momentId } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!momentId) {
    return {
      success: false,
      error: '参数错误'
    }
  }

  try {
    // 1. 查询是否已经点赞
    const likeResult = await db.collection('momentLikes')
      .where({
        momentId,
        _openid: openid
      })
      .get()

    const isLiked = likeResult.data.length > 0

    // 2. 开始事务
    const transaction = await db.startTransaction()

    try {
      if (isLiked) {
        // 取消点赞
        await transaction.collection('momentLikes')
          .where({
            momentId,
            _openid: openid
          })
          .remove()

        await transaction.collection('moments')
          .doc(momentId)
          .update({
            data: {
              likes: _.inc(-1)
            }
          })
      } else {
        // 添加点赞
        await transaction.collection('momentLikes')
          .add({
            data: {
              momentId,
              _openid: openid,
              createTime: db.serverDate()
            }
          })

        await transaction.collection('moments')
          .doc(momentId)
          .update({
            data: {
              likes: _.inc(1)
            }
          })
      }

      // 提交事务
      await transaction.commit()

      return {
        success: true,
        data: {
          isLiked: !isLiked
        }
      }
    } catch (err) {
      // 回滚事务
      await transaction.rollback()
      throw err
    }
  } catch (err) {
    console.error('点赞操作失败：', err)
    return {
      success: false,
      error: err.message || '操作失败，请重试'
    }
  }
} 