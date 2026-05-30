# 李海峰的个人网站

大理大学第一附属医院 · 个人主页与文件共享平台

## 网站结构

```
├── index.html       # 首页（个人信息 + 快速入口）
├── about.html       # 关于我（工作经历、教育背景、技能）
├── files.html       # 文件共享（公开文件 + 私密入口）
├── private.html     # 私密文件区（密码保护）
├── gallery.html     # 图片画廊
├── contact.html     # 联系我
├── css/style.css    # 全局样式
├── js/main.js       # 全局脚本
├── js/auth.js       # 密码验证
├── js/gallery.js    # 画廊灯箱
├── assets/images/   # 网站图片素材（头像等）
├── public-files/    # 公开共享文件
└── private-files/   # 私密文件
```

## 使用说明

### 1. 添加头像
将头像图片放到 `assets/images/` 目录，然后在 `index.html` 中将 hero-avatar 内的文字替换为 `<img src="assets/images/你的头像.jpg" alt="李海峰">`

### 2. 添加公开文件
1. 将文件放入 `public-files/` 目录
2. 编辑 `files.html`，在 `publicFiles` 数组中添加配置：
```javascript
var publicFiles = [
  { name: '文件名.pdf', type: 'pdf', size: '1.2 MB', path: 'public-files/文件名.pdf' }
];
```

### 3. 添加私密文件
1. 将文件放入 `private-files/` 目录
2. 编辑 `private.html`，在 `privateFiles` 数组中添加配置（同上格式）

### 4. 添加图片
1. 将图片放入 `assets/images/` 目录
2. 编辑 `gallery.html`，在 `galleryImages` 数组中添加配置：
```javascript
var galleryImages = [
  { src: 'assets/images/photo1.jpg', alt: '描述', category: 'work' }
];
```
分类可选：`work`、`life`、`other`

### 5. 修改密码
默认密码：**123456**

修改方式：编辑 `js/auth.js`，将 `PASSWORD_HASH` 替换为新密码的 SHA-256 哈希值。

生成哈希：在终端运行
```
echo -n "你的新密码" | openssl dgst -sha256
```
或在浏览器控制台运行：
```javascript
crypto.subtle.digest('SHA-256', new TextEncoder().encode('你的新密码'))
  .then(buf => console.log(Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')))
```

## 部署到 GitHub Pages

1. 在 GitHub 创建仓库（如 `username.github.io` 或个人仓库）
2. 将本目录所有文件推送到仓库
3. 在仓库 Settings → Pages 中启用 GitHub Pages，选择分支
4. 等待几分钟即可通过 `https://你的用户名.github.io` 访问
