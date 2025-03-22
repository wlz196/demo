const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

exports.main = async (event, context) => {
  const { momentId, page = 1, pageSize = 20 } = event
  const wxContext = cloud.getWXContext()
  
  if (!momentId) {
    return {
      success: false,
      error: '参数错误'
    }
  }

  try {
    const skip = (page - 1) * pageSize

    // 获取评论总数
    const countResult = await db.collection('comments')
      .where({
        momentId: momentId
      })
      .count()

    const total = countResult.total

    // 获取评论列表
    const commentsResult = await db.collection('comments')
      .aggregate()
      .match({
        momentId: momentId
      })
      .sort({
        createTime: -1
      })
      .skip(skip)
      .limit(pageSize)
      .lookup({
        from: 'users',
        localField: '_openid',
        foreignField: '_openid',
        as: 'userInfo'
      })
      .replaceRoot({
        newRoot: {
          $mergeObjects: [
            '$$ROOT',
            { userInfo: { $arrayElemAt: ['$userInfo', 0] } }
          ]
        }
      })
      .project({
        _id: 1,
        content: 1,
        createTime: 1,
        nickName: '$userInfo.nickName',
        avatarUrl: '$userInfo.avatarUrl'
      })
      .end()

    return {
      success: true,
      data: {
        list: commentsResult.list,
        page,
        pageSize,
        total,
        hasMore: skip + pageSize < total
      }
    }
  } catch (err) {
    console.error('获取评论列表失败：', err)
    return {
      success: false,
      error: err.message || '获取评论失败'
    }
  }
} 