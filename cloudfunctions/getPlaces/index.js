// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const MAX_LIMIT = 20

// 云函数入口函数
exports.main = async (event, context) => {
  const { page = 1, keyword = '' } = event
  const skip = (page - 1) * MAX_LIMIT

  try {
    let query = {}
    
    // 如果有关键词，进行模糊搜索
    if (keyword) {
      query = db.command.or([
        {
          name: db.RegExp({
            regexp: keyword,
            options: 'i'
          })
        },
        {
          address: db.RegExp({
            regexp: keyword,
            options: 'i'
          })
        },
        {
          tags: db.RegExp({
            regexp: keyword,
            options: 'i'
          })
        }
      ])
    }

    // 获取餐馆总数
    const countResult = await db.collection('places')
      .where(query)
      .count()
    const total = countResult.total

    // 获取餐馆列表
    const placesResult = await db.collection('places')
      .where(query)
      .skip(skip)
      .limit(MAX_LIMIT)
      .orderBy('rating', 'desc')  // 按评分降序排序
      .get()

    // 为每个餐馆获取最新的3条评论
    const places = await Promise.all(placesResult.data.map(async (place) => {
      const reviewsResult = await db.collection('reviews')
        .where({
          placeId: place._id
        })
        .orderBy('createdAt', 'desc')
        .limit(3)
        .get()

      return {
        ...place,
        recentReviews: reviewsResult.data
      }
    }))

    return {
      success: true,
      data: {
        places,
        pagination: {
          current: page,
          pageSize: MAX_LIMIT,
          total
        }
      }
    }
  } catch (error) {
    console.error('[云函数] [getPlaces] 调用失败', error)
    return {
      success: false,
      error: error.message
    }
  }
} 