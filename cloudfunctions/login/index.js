// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 生成随机session_key
function generateSessionKey(length) {
  length = length || 32
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  var result = ''
  for (var i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// 云函数入口函数
exports.main = async function(event, context) {
  console.log('登录云函数开始执行，参数：', event)
  
  try {
    const wxContext = cloud.getWXContext()
    console.log('获取微信上下文成功：', wxContext)
    
    const { OPENID: openid, APPID: appid, UNIONID: unionid } = wxContext
    const { userInfo } = event

    if (!openid) {
      console.error('获取openid失败')
      return {
        success: false,
        error: '获取用户标识失败'
      }
    }

    if (!userInfo) {
      console.error('用户信息为空')
      return {
        success: false,
        error: '用户信息不能为空'
      }
    }

    // 生成新的会话密钥
    const sessionKey = generateSessionKey()
    const now = new Date()
    const sessionExpireTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7天后过期
    
    console.log('开始查询用户信息，openid：', openid)
    // 查询用户是否已存在
    const userResult = await db.collection('users').where({
      _openid: openid
    }).get()

    let userData = null

    if (userResult.data.length === 0) {
      console.log('用户不存在，开始创建新用户')
      // 创建新用户
      const newUser = {
        _openid: openid,
        unionid: unionid || '',
        appid: appid,
        nickName: userInfo.nickName === '微信用户' ? `用户${Math.floor(Math.random() * 10000)}` : userInfo.nickName,
        avatarUrl: userInfo.avatarUrl,
        gender: userInfo.gender,
        country: userInfo.country,
        province: userInfo.province,
        city: userInfo.city,
        language: userInfo.language,
        moments: 0,
        reviews: 0,
        likes: 0,
        sessionKey: sessionKey,
        sessionExpireTime: sessionExpireTime,
        createTime: now,
        updateTime: now
      }

      const addResult = await db.collection('users').add({
        data: newUser
      })
      
      userData = newUser
      userData._id = addResult._id
      console.log('新用户创建成功：', userData)
    } else {
      console.log('用户已存在，开始更新用户信息')
      // 更新现有用户
      const user = userResult.data[0]
      const updateData = {
        nickName: user.nickName,
        avatarUrl: userInfo.avatarUrl,
        gender: userInfo.gender,
        country: userInfo.country,
        province: userInfo.province,
        city: userInfo.city,
        language: userInfo.language,
        sessionKey: sessionKey,
        sessionExpireTime: sessionExpireTime,
        updateTime: now
      }

      await db.collection('users').doc(user._id).update({
        data: updateData
      })

      userData = { ...user, ...updateData }
      console.log('用户信息更新成功：', userData)
    }

    // 返回必要的用户信息和会话密钥
    const result = {
      success: true,
      data: {
        sessionKey: userData.sessionKey,
        sessionExpireTime: userData.sessionExpireTime,
        userInfo: {
          _id: userData._id,
          openid: userData._openid,
          nickName: userData.nickName,
          avatarUrl: userData.avatarUrl,
          gender: userData.gender,
          country: userData.country,
          province: userData.province,
          city: userData.city,
          language: userData.language,
          moments: userData.moments,
          reviews: userData.reviews,
          likes: userData.likes
        }
      }
    }
    
    console.log('登录成功，返回数据：', result)
    return result
  } catch (err) {
    console.error('[云函数] [login] 调用失败', err)
    return {
      success: false,
      error: err.message || '登录失败'
    }
  }
} 