// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { 
    name, 
    address, 
    description, 
    phone,
    businessHours,
    tags = [],
    images = [],
    location = {} // 包含经纬度信息
  } = event

  try {
    // 验证管理员权限
    const adminResult = await db.collection('admins').where({
      _openid: wxContext.OPENID
    }).get()

    if (adminResult.data.length === 0) {
      throw new Error('没有添加餐馆的权限')
    }

    // 上传图片到云存储
    const fileIds = []
    for (let i = 0; i < images.length; i++) {
      const result = await cloud.uploadFile({
        cloudPath: `places/${Date.now()}-${i}.${images[i].match(/\.([^.]+)$/)[1]}`,
        fileContent: images[i]
      })
      fileIds.push(result.fileID)
    }

    // 创建餐馆信息
    const place = {
      name,
      address,
      description,
      phone,
      businessHours,
      tags,
      images: fileIds,
      location,
      rating: 0,
      ratingCount: 0,
      reviewCount: 0,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    }

    // 添加到数据库
    const result = await db.collection('places').add({
      data: place
    })

    return {
      success: true,
      data: {
        placeId: result._id
      }
    }
  } catch (error) {
    console.error('[云函数] [createPlace] 调用失败', error)
    return {
      success: false,
      error: error.message
    }
  }
} 