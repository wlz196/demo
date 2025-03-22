// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-4g0b3awl8f2e9e53'
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
  const wxContext = cloud.getWXContext()
  const { OPENID: openid, APPID: appid, UNIONID: unionid } = wxContext
  const { userInfo } = event

  if (!userInfo) {
    return {
      success: false,
      error: '用户信息不能为空'
    }
  }

  try {
    // 生成新的会话密钥
    const sessionKey = generateSessionKey()
    const now = new Date()
    const sessionExpireTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7天后过期
    
    // 查询用户是否已存在
    const userResult = await db.collection('users').where({
      _openid: openid
    }).get()

    let userData = null

    if (userResult.data.length === 0) {
      // 创建新用户
      const newUser = {
        _openid: openid,
        unionid: unionid || '',
        appid: appid,
        nickName: userInfo.nickName,
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
    } else {
      // 更新现有用户
      const user = userResult.data[0]
      const updateData = {
        nickName: userInfo.nickName,
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
    }

    // 返回必要的用户信息和会话密钥
    return {
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
  } catch (err) {
    console.error('[云函数] [login] 调用失败', err)
    return {
      success: false,
      error: err.message || '登录失败'
    }
  }
} 