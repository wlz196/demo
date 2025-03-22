// 内容安全检查工具函数
const checkText = async (text) => {
  try {
    if (!text || text.trim().length === 0) {
      return { result: true }
    }

    const result = await wx.cloud.callFunction({
      name: 'checkContent',
      data: { text }
    })

    return {
      result: result.result.success,
      msg: result.result.msg || '内容含有违规信息'
    }
  } catch (err) {
    console.error('内容安全检查失败：', err)
    return {
      result: false,
      msg: '内容安全检查失败，请稍后重试'
    }
  }
}

const checkImage = async (filePath) => {
  try {
    const result = await wx.cloud.callFunction({
      name: 'checkImage',
      data: { filePath }
    })

    return {
      result: result.result.success,
      msg: result.result.msg || '图片含有违规信息'
    }
  } catch (err) {
    console.error('图片安全检查失败：', err)
    return {
      result: false,
      msg: '图片安全检查失败，请稍后重试'
    }
  }
}

module.exports = {
  checkText,
  checkImage
} 