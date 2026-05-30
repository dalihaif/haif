/**
 * 密码验证模块
 * 默认密码：123456
 * 修改密码：更改下方 PASSWORD_HASH
 * 使用 SHA-256 生成：echo -n "你的密码" | openssl dgst -sha256
 */

// 默认密码 "123456" 的 SHA-256 哈希值
var PASSWORD_HASH = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';

/**
 * 验证密码
 * @param {string} input - 用户输入的密码
 * @returns {Promise<boolean>}
 */
async function verifyPassword(input) {
  var encoder = new TextEncoder();
  var data = encoder.encode(input);
  var hashBuffer = await crypto.subtle.digest('SHA-256', data);
  var hashArray = Array.from(new Uint8Array(hashBuffer));
  var hashHex = hashArray.map(function(b) {
    return b.toString(16).padStart(2, '0');
  }).join('');

  return hashHex === PASSWORD_HASH;
}

/**
 * 检查是否已通过验证（使用 sessionStorage）
 */
function isAuthenticated() {
  return sessionStorage.getItem('private_authenticated') === 'true';
}

/**
 * 设置已验证状态
 */
function setAuthenticated() {
  sessionStorage.setItem('private_authenticated', 'true');
}

/**
 * 清除验证状态
 */
function clearAuth() {
  sessionStorage.removeItem('private_authenticated');
}
