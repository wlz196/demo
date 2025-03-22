// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

// 格式化时间
function formatTime(date) {
  const now = new Date()
  const diff = now - date
  
  // 小于1分钟
  if (diff < 60000) {
    return '刚刚'
  }
  // 小于1小时
  if (diff < 3600000) {
    return Math.floor(diff / 60000) + '分钟前'
  }
  // 小于24小时
  if (diff < 86400000) {
    return Math.floor(diff / 3600000) + '小时前'
  }
  // 小于30天
  if (diff < 2592000000) {
    return Math.floor(diff / 86400000) + '天前'
  }
  
  // 超过30天显示具体日期
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { page = 1, pageSize = 10, userId } = event
  
  try {
    const skip = (page - 1) * pageSize
    
    // 构建查询条件
    let query = {}
    if (userId) {
      query._openid = userId
    }

    // 获取动态总数
    const countResult = await db.collection('moments')
      .where(query)
      .count()
    
    const total = countResult.total

    // 获取动态列表
    const momentsResult = await db.collection('moments')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()

    // 获取当前用户的点赞状态
    const moments = momentsResult.data
    const currentOpenId = wxContext.OPENID

    // 批量查询点赞状态
    const likesPromises = moments.map(moment => {
      return db.collection('momentLikes')
        .where({
          momentId: moment._id,
          _openid: currentOpenId
        })
        .get()
    })

    const likesResults = await Promise.all(likesPromises)
    
    // 将点赞状态添加到动态数据中，并格式化时间
    const momentsWithLikes = moments.map((moment, index) => {
      return {
        ...moment,
        isLiked: likesResults[index].data.length > 0,
        createTimeFormatted: formatTime(moment.createTime instanceof Date ? moment.createTime : new Date(moment.createTime))
      }
    })

    console.log('获取动态列表成功：', {
      page,
      pageSize,
      total,
      moments: momentsWithLikes
    })

    return {
      success: true,
      data: {
        list: momentsWithLikes,
        page,
        pageSize,
        total,
        hasMore: skip + pageSize < total
      }
    }

  } catch (err) {
    console.error('获取动态列表失败：', err)
    return {
      success: false,
      error: err.message || '获取动态列表失败'
    }
  }
} 