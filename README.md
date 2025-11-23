# 🎵 音视频转码工具

一个基于浏览器的免费在线音视频转码工具，使用 FFmpeg.wasm 在浏览器端完成转换，无需上传文件到服务器，保护您的隐私。

## ✨ 功能特性

- 🔒 **隐私保护** - 所有处理完全在浏览器本地完成，文件不会上传到服务器
- 🚀 **快速转换** - 使用 WebAssembly 技术，高效处理音视频文件
- 📦 **支持多种格式** - 支持常见的音视频格式转换为 MP3 或 WAV
- 💻 **跨平台** - 无需安装任何软件，在浏览器中即可使用
- 📱 **响应式设计** - 完美适配桌面端和移动端
- 🌐 **PWA 支持** - 可安装到桌面或主屏幕，离线也能使用

## 🎯 支持的格式

### 输入格式

**视频**: mp4, avi, mov, mkv, flv, wmv, webm
**音频**: mp3, wav, aac, m4a, flac, ogg, wma

### 输出格式与品质选项

**MP3 格式**（通过比特率控制品质）：
- 低品质：128kbps, 44.1kHz, 立体声（文件更小，适合语音）
- 中品质：192kbps, 44.1kHz, 立体声（默认，平衡品质和大小）
- 高品质：320kbps, 44.1kHz, 立体声（接近无损，文件较大）

**WAV 格式**（通过采样率控制品质）：
- 低品质：32kHz, 立体声
- 中品质：44.1kHz, 立体声（默认，CD 标准）
- 高品质：48kHz, 立体声（专业音频标准）

## 🛠️ 技术栈

- **框架**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **构建工具**: [Vite 6](https://vitejs.dev/)
- **样式**: [Tailwind CSS 4](https://tailwindcss.com/)
- **组件库**: [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/)
- **核心技术**: [FFmpeg.wasm](https://ffmpegwasm.netlify.app/)
- **包管理器**: [pnpm](https://pnpm.io/)

## 🚀 快速开始

### 前置要求

- Node.js 18+
- pnpm 8+

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

打开浏览器访问 [http://localhost:5173](http://localhost:5173)

### 构建生产版本

```bash
pnpm build
```

### 预览生产构建

```bash
pnpm preview
```

## 📖 使用说明

1. **加载工具** - 首次访问时会自动加载 FFmpeg 核心文件（约 30MB），请耐心等待
2. **选择文件** - 点击"选择音视频文件"按钮，选择要转换的文件
3. **选择格式** - 选择输出格式（MP3 或 WAV）
4. **选择品质** - 选择输出品质（低、中、高），默认为中品质
5. **开始转码** - 点击"开始转码"按钮，等待转换完成
6. **下载文件** - 转换完成后点击"下载文件"按钮保存

## 🌐 浏览器要求

由于使用了 SharedArrayBuffer 和 WebAssembly 技术，需要浏览器支持：

- ✅ Chrome 92+
- ✅ Edge 92+
- ✅ Firefox 90+
- ✅ Safari 15.2+

**重要**: 浏览器必须启用跨域隔离（Cross-Origin Isolation）功能。

### 为什么需要跨域隔离？

**安全说明**：由于 2018 年发现的 Spectre 安全漏洞，浏览器要求启用跨域隔离才能使用 SharedArrayBuffer，这样可以在安全的沙盒环境中享受高性能多线程处理。

**性能对比**：

| 场景           | 无 SharedArrayBuffer | 有 SharedArrayBuffer |
| -------------- | -------------------- | -------------------- |
| 处理方式       | 单线程处理           | 多线程并行处理       |
| 100MB 视频转码 | ~10 分钟             | ~2-3 分钟            |
| 性能提升       | 基准                 | **4-8 倍**           |
| CPU 利用率     | 仅使用单核           | 充分利用多核         |

FFmpeg.wasm 使用 SharedArrayBuffer 来实现高性能的多线程处理：

```
WebAssembly (单线程)
    ↓
使用 SharedArrayBuffer
    ↓
创建多个 Worker 线程并行处理
    ↓
大幅提升转码性能（可能快 4-8 倍）
```

### 开发环境配置

项目已在 `vite.config.ts` 中配置了必要的响应头：

```typescript
headers: {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}
```

### 生产环境部署

在生产环境中，需要配置服务器返回以下响应头：

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

#### Cloudflare Pages 部署配置（推荐）

项目已包含 `public/_headers` 和 `wrangler.toml` 配置文件，可一键部署到 Cloudflare Pages。

**优势**：
- 免费无限带宽
- 全球 CDN 加速（300+ 节点）
- 自动 HTTPS
- 支持自定义域名

**快速部署**：
```bash
# 安装 Wrangler CLI
pnpm add -g wrangler

# 登录 Cloudflare
wrangler login

# 构建并部署
pnpm build
wrangler pages deploy dist
```

详细部署指南请查看 [CLOUDFLARE_PAGES_DEPLOYMENT.md](./CLOUDFLARE_PAGES_DEPLOYMENT.md)

#### Vercel 部署配置

项目根目录已包含 `vercel.json` 配置文件，可直接部署到 Vercel。

#### Nginx 配置示例

```nginx
location / {
    add_header Cross-Origin-Opener-Policy same-origin;
    add_header Cross-Origin-Embedder-Policy require-corp;
}
```

## 📝 项目结构

```
.
├── public/                 # 静态资源
│   ├── favicon/           # 网站图标
│   └── manifest.json      # PWA 配置
├── src/
│   ├── components/        # React 组件
│   │   ├── ui/           # shadcn/ui 组件
│   │   └── AudioVideoConverter.tsx  # 主转换组件
│   ├── lib/              # 工具函数
│   ├── App.tsx           # 应用入口
│   ├── main.tsx          # React 渲染入口
│   └── index.css         # 全局样式
├── index.html            # HTML 模板
├── vite.config.ts        # Vite 配置
└── tsconfig.json         # TypeScript 配置
```

## 🔧 开发

### 代码规范

```bash
pnpm lint
```

### 添加 UI 组件

项目使用 shadcn/ui，可以通过以下命令添加新组件：

```bash
npx shadcn@latest add [component-name]
```

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## ⚠️ 注意事项

- 首次使用需要下载 FFmpeg 核心文件，请确保网络连接正常
- 大文件转码可能需要较长时间，建议文件大小不超过 500MB
- 转码过程中请不要关闭浏览器标签页
- 如遇到问题，请查看浏览器控制台的诊断信息

## 📞 支持

如有问题或建议，请提交 [Issue](../../issues)。
