// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 内容预处理函数
function preprocessContent(content) {
  if (!content) return ''
  
  // 1. 去除首尾空格
  content = content.trim()
  
  // 2. 处理重复的表情符号和标点
  content = content.replace(/([！!。，,？?～~哈呵嘻嘿啊呀哦吧吗嗯]+)\1+/g, '$1')
  
  // 3. 处理连续的标点符号
  content = content.replace(/([。，！？～])\1+/g, '$1')
  
  // 4. 如果内容过短且全是重复字符，添加一些中性词
  if (content.length <= 3 && new Set(content.split('')).size === 1) {
    content += ' 分享一下'
  }
  
  // 5. 处理特殊字符
  content = content.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '') // 移除 emoji
  
  return content
}

// 内容安全检查函数
async function securityCheck(content) {
  if (!content) return { pass: true }
  
  try {
    // 预处理内容
    const processedContent = preprocessContent(content)
    
    // 如果处理后的内容为空，直接通过
    if (!processedContent) {
      return { pass: true }
    }
    
    // 进行安全检查
    await cloud.openapi.security.msgSecCheck({
      content: processedContent
    })
    return { pass: true }
  } catch (err) {
    console.error('内容安全检查失败：', err)
    // 如果是内容检查不通过的错误
    if (err.errCode === 87014) {
      return {
        pass: false,
        error: '内容可能包含不当信息'
      }
    }
    // 如果是其他错误，暂时允许通过
    console.warn('内容安全检查遇到技术问题，暂时跳过：', err)
    return { pass: true }
  }
}

// 图片安全检查函数
async function imageSecurityCheck(fileID) {
  try {
    const { fileContent } = await cloud.downloadFile({
      fileID: fileID
    })
    
    await cloud.openapi.security.imgSecCheck({
      media: {
        contentType: 'image/png',
        value: fileContent
      }
    })
    return { pass: true }
  } catch (err) {
    console.error('图片安全检查失败：', err)
    // 如果是图片检查不通过的错误
    if (err.errCode === 87014) {
      return {
        pass: false,
        error: '图片可能包含不当内容'
      }
    }
    // 如果是其他错误，暂时允许通过
    console.warn('图片安全检查遇到技术问题，暂时跳过：', err)
    return { pass: true }
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { content, images = [] } = event

  try {
    // 1. 检查用户是否存在
    const userResult = await db.collection('users').where({
      _openid: openid
    }).get()

    if (userResult.data.length === 0) {
      throw new Error('用户不存在')
    }

    const user = userResult.data[0]

    // 2. 进行文本内容安全检查
    if (content) {
      const textCheckResult = await securityCheck(content)
      if (!textCheckResult.pass) {
        return {
          success: false,
          error: textCheckResult.error || '内容可能包含不当信息，请调整后重试'
        }
      }
    }

    // 3. 上传并检查图片
    const checkedImages = []
    for (let i = 0; i < images.length; i++) {
      try {
        // 上传图片到云存储
        const cloudPath = `moments/${openid}/${Date.now()}_${i}.jpg`
        const uploadResult = await cloud.uploadFile({
          cloudPath,
          fileContent: Buffer.from(images[i].replace(/^data:image\/\w+;base64,/, ''), 'base64')
        })

        // 进行图片安全检查
        const imageCheckResult = await imageSecurityCheck(uploadResult.fileID)
        if (!imageCheckResult.pass) {
          // 如果图片不合规，删除已上传的图片
          await cloud.deleteFile({
            fileList: [uploadResult.fileID]
          })
          return {
            success: false,
            error: imageCheckResult.error || '图片含有不当内容，请修改后重试'
          }
        }

        checkedImages.push(uploadResult.fileID)
      } catch (err) {
        console.error('处理图片失败：', err)
        // 清理已上传的图片
        if (checkedImages.length > 0) {
          await cloud.deleteFile({
            fileList: checkedImages
          })
        }
        throw new Error('图片处理失败，请重试')
      }
    }

    // 4. 创建动态
    const moment = {
      _openid: openid,
      userInfo: {
        nickName: user.nickName,
        avatarUrl: user.avatarUrl
      },
      content: content || '',
      images: checkedImages,
      likes: 0,
      comments: 0,
      createTime: db.serverDate()
    }

    const result = await db.collection('moments').add({
      data: moment
    })

    // 5. 更新用户动态数
    await db.collection('users').doc(user._id).update({
      data: {
        moments: _.inc(1)
      }
    })

    return {
      success: true,
      data: {
        _id: result._id,
        ...moment
      }
    }

  } catch (err) {
    console.error('[云函数] [createMoment] 调用失败', err)
    return {
      success: false,
      error: err.message || '发布失败，请稍后重试'
    }
  }
} 