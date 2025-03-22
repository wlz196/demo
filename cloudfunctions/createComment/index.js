// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 内容安全检查
async function checkContentSecurity(content) {
  // 检查内容是否为空
  if (!content || !content.trim()) {
    return {
      success: false,
      error: '评论内容不能为空'
    }
  }

  // 检查内容长度
  if (content.length > 500) {
    return {
      success: false,
      error: '评论内容不能超过500字'
    }
  }

  try {
    // 调用微信内容安全接口
    const result = await cloud.openapi.security.msgSecCheck({
      content: content
    })
    return { success: true }
  } catch (err) {
    console.error('内容安全检查失败：', err)
    // 87014 是内容含有违规信息的错误码
    if (err.errCode === 87014) {
      return {
        success: false,
        error: '内容含有违规信息'
      }
    }
    // 其他错误暂时允许通过，但记录日志
    console.warn('内容安全检查出现非违规错误：', err)
    return { success: true }
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { momentId, content, images = [] } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!momentId || !content) {
    return {
      success: false,
      error: '参数错误'
    }
  }

  try {
    // 检查内容安全
    const securityCheck = await checkContentSecurity(content)
    if (!securityCheck.success) {
      return securityCheck
    }

    // 获取用户信息
    const userResult = await db.collection('users').where({
      _openid: openid
    }).get()

    if (!userResult.data || userResult.data.length === 0) {
      return {
        success: false,
        error: '用户不存在'
      }
    }

    const user = userResult.data[0]

    // 检查动态是否存在
    const momentResult = await db.collection('moments').doc(momentId).get()
    if (!momentResult.data) {
      return {
        success: false,
        error: '动态不存在'
      }
    }

    // 开始事务
    const transaction = await db.startTransaction()

    try {
      // 创建评论
      const commentResult = await transaction.collection('comments').add({
        data: {
          momentId,
          content,
          images: images || [],
          _openid: openid,
          userId: user._id,
          nickName: user.nickName,
          avatarUrl: user.avatarUrl,
          createTime: db.serverDate(),
          likes: 0
        }
      })

      // 更新动态的评论数
      await transaction.collection('moments').doc(momentId).update({
        data: {
          comments: _.inc(1)
        }
      })

      // 提交事务
      await transaction.commit()
      
      return {
        success: true,
        data: {
          commentId: commentResult._id
        }
      }
    } catch (err) {
      // 回滚事务
      await transaction.rollback()
      throw err
    }
  } catch (err) {
    console.error('创建评论失败：', err)
    return {
      success: false,
      error: err.message || '创建评论失败'
    }
  }
} 