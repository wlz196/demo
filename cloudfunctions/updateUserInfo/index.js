// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async function(event, context) {
  console.log('更新用户信息云函数开始执行，参数：', event)
  
  try {
    const wxContext = cloud.getWXContext()
    const { OPENID: openid } = wxContext
    const { updateData } = event

    if (!openid) {
      console.error('获取openid失败')
      return {
        success: false,
        error: '获取用户标识失败'
      }
    }

    if (!updateData) {
      console.error('更新数据为空')
      return {
        success: false,
        error: '更新数据不能为空'
      }
    }

    // 查询用户是否存在
    const userResult = await db.collection('users').where({
      _openid: openid
    }).get()

    if (userResult.data.length === 0) {
      console.error('用户不存在')
      return {
        success: false,
        error: '用户不存在'
      }
    }

    const user = userResult.data[0]
    const now = new Date()

    // 更新用户信息
    const updateResult = await db.collection('users').doc(user._id).update({
      data: {
        ...updateData,
        updateTime: now
      }
    })

    console.log('用户信息更新成功：', updateResult)

    return {
      success: true,
      data: {
        ...user,
        ...updateData,
        updateTime: now
      }
    }
  } catch (err) {
    console.error('[云函数] [updateUserInfo] 调用失败', err)
    return {
      success: false,
      error: err.message || '更新失败'
    }
  }
} 