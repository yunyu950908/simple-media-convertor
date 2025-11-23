# Cloudflare Pages 部署指南

## 简介

本指南将帮助你将音视频转码工具部署到 Cloudflare Pages。Cloudflare Pages 提供免费的静态网站托管服务，具有全球 CDN 加速、自动 HTTPS、无限带宽等优势。

## 前置要求

1. **Cloudflare 账号** - 注册地址：https://dash.cloudflare.com/sign-up
2. **GitHub/GitLab 账号** - 用于连接代码仓库
3. **Git 仓库** - 项目代码需要推送到 Git 仓库

## 项目特殊要求

由于本项目使用了 FFmpeg.wasm，需要浏览器的 SharedArrayBuffer 支持，因此必须配置跨域隔离（Cross-Origin Isolation）响应头：

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

Cloudflare Pages 通过 `public/_headers` 文件来配置这些响应头（详见下方配置文件部分）。

## 部署步骤

### 方法一：通过 Cloudflare Dashboard 部署（推荐）

#### 1. 连接 Git 仓库

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 选择你的账号，进入 **Workers & Pages**
3. 点击 **Create application** → **Pages** → **Connect to Git**
4. 授权 Cloudflare 访问你的 GitHub 或 GitLab 账号
5. 选择项目仓库

#### 2. 配置构建设置

在 **Set up builds and deployments** 页面，使用以下配置：

| 配置项 | 值 |
|--------|-----|
| **Production branch** | `main` （或你的主分支名称） |
| **Framework preset** | `Vite` |
| **Build command** | `pnpm build` |
| **Build output directory** | `dist` |
| **Node version** | `18` 或更高 |

**环境变量（可选）：**

如需设置环境变量，在 **Environment variables** 部分添加：

```bash
NODE_VERSION=18
```

#### 3. 高级构建配置

点击 **Build settings** 下方的 **Advanced** 展开高级选项：

- **Root directory**: 保持为空（或填写项目根目录路径）
- **Install command**: `pnpm install`（默认会自动检测）

#### 4. 开始部署

1. 点击 **Save and Deploy** 按钮
2. Cloudflare Pages 将自动克隆仓库、安装依赖、执行构建
3. 构建完成后，你会得到一个 `*.pages.dev` 域名

#### 5. 验证部署

1. 访问分配的 `*.pages.dev` 域名
2. 打开浏览器开发者工具 → Network 标签
3. 刷新页面，检查响应头中是否包含：
   ```
   Cross-Origin-Opener-Policy: same-origin
   Cross-Origin-Embedder-Policy: require-corp
   ```
4. 测试音视频转码功能是否正常工作

### 方法二：通过 Wrangler CLI 部署

#### 1. 配置项目名称

项目根目录已包含 `wrangler.toml` 配置文件。首次部署前，请修改其中的项目名称：

```toml
# wrangler.toml
name = "simple-media-convertor"  # 修改为你的项目名称
pages_build_output_dir = "dist"
```

#### 2. 安装 Wrangler

```bash
npm install -g wrangler
# 或使用 pnpm
pnpm add -g wrangler
```

#### 3. 登录 Cloudflare

```bash
wrangler login
```

这会打开浏览器完成 OAuth 授权。

#### 4. 构建项目

```bash
pnpm build
```

#### 5. 部署到 Pages

```bash
wrangler pages deploy dist
```

**注意**：由于项目已包含 `wrangler.toml` 配置文件，部署时会自动使用配置文件中的项目名称，无需交互式输入。

#### 6. 后续部署

```bash
# 生产环境部署
wrangler pages deploy dist

# 预览环境部署
wrangler pages deploy dist --branch=preview
```

## 配置自定义域名

### 1. 添加自定义域名

1. 在 Cloudflare Dashboard 中，进入你的 Pages 项目
2. 点击 **Custom domains** 标签
3. 点击 **Set up a custom domain**
4. 输入你的域名（如 `convert.example.com`）
5. 按照提示添加 DNS 记录

### 2. DNS 配置

Cloudflare 会自动提示添加 CNAME 记录：

```
类型: CNAME
名称: convert (或你的子域名)
内容: your-project.pages.dev
代理状态: 已代理（橙色云朵）
```

### 3. 等待生效

- DNS 记录通常在几分钟内生效
- SSL 证书会自动签发和续期

## 环境变量配置

如果项目需要环境变量（如 API 密钥），可以在 Cloudflare Dashboard 中配置：

1. 进入 Pages 项目 → **Settings** → **Environment variables**
2. 选择环境（Production / Preview）
3. 添加变量名和值
4. 点击 **Save**
5. 重新部署项目以应用更改

注意：环境变量在构建时注入，修改后需要重新部署。

## 持续部署（CI/CD）

Cloudflare Pages 支持自动部署：

### 自动部署触发条件

- **Production 部署**：推送到主分支（如 `main`）时自动触发
- **Preview 部署**：推送到其他分支或创建 Pull Request 时自动触发

### 取消自动部署

如需暂停自动部署：

1. 进入项目 → **Settings** → **Builds & deployments**
2. 点击 **Pause deployments**

### 部署钩子（Deploy Hooks）

可以创建部署钩子 URL，通过 HTTP POST 请求触发部署：

1. 进入 **Settings** → **Builds & deployments**
2. 滚动到 **Deploy hooks** 部分
3. 点击 **Add deploy hook**
4. 设置名称和分支
5. 使用生成的 URL 触发部署

```bash
curl -X POST "https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/YOUR_HOOK_URL"
```

## 性能优化建议

### 1. 启用 HTTP/3

Cloudflare Pages 默认支持 HTTP/3（QUIC），无需额外配置。

### 2. Brotli 压缩

Cloudflare 自动为文本资源（HTML、CSS、JS）启用 Brotli 压缩。

### 3. 缓存优化

在 `public/_headers` 文件中配置缓存策略（已在配置文件中包含）：

```
/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

### 4. 预加载关键资源

在 `index.html` 中添加预加载标签：

```html
<link rel="preload" href="/path/to/critical.js" as="script">
<link rel="preload" href="/path/to/critical.css" as="style">
```

## 监控和分析

### 1. 查看部署日志

1. 进入 Pages 项目
2. 点击 **View build** 查看最新部署
3. 查看构建日志和错误信息

### 2. Web Analytics

Cloudflare 提供免费的 Web Analytics：

1. 进入项目 → **Analytics**
2. 查看访问量、性能指标等
3. 或启用 **Web Analytics** 获取更详细的数据

### 3. 实时日志

使用 Wrangler 查看实时日志：

```bash
wrangler pages deployment tail
```

## 故障排查

### 问题 1: 构建失败 - "pnpm: command not found"

**解决方案**：在项目根目录创建或修改 `.node-version` 文件：

```
18
```

或在 Cloudflare Dashboard 中设置环境变量：

```
NODE_VERSION=18
```

### 问题 2: FFmpeg.wasm 无法加载 SharedArrayBuffer

**解决方案**：确保 `public/_headers` 文件存在且配置正确（见下方配置文件）。

可以通过浏览器开发者工具检查响应头：

```bash
curl -I https://your-domain.pages.dev
```

### 问题 3: 部署后 404 错误

**解决方案**：检查 Build output directory 是否设置为 `dist`，并确保 `pnpm build` 命令正常执行。

### 问题 4: 自定义域名无法访问

**解决方案**：

1. 检查 DNS 记录是否正确配置
2. 确保 CNAME 记录的代理状态为"已代理"（橙色云朵）
3. 等待 DNS 传播（最多 24 小时）

### 问题 5: 构建时间过长

**解决方案**：

- 使用 `pnpm` 替代 `npm`（速度更快）
- 优化 `node_modules` 缓存
- 减少不必要的依赖

## 成本和限制

### 免费计划（Free）

- **构建次数**：500 次/月
- **请求数**：无限
- **带宽**：无限
- **自定义域名**：100 个/项目
- **并发构建**：1 个

### Pro 计划（$20/月）

- **构建次数**：5000 次/月
- **并发构建**：5 个
- **更快的构建速度**
- **优先支持**

详细定价：https://pages.cloudflare.com/#pricing

## 对比其他部署平台

| 特性 | Cloudflare Pages | Vercel | Netlify |
|------|------------------|--------|---------|
| **免费带宽** | 无限 | 100GB/月 | 100GB/月 |
| **构建时间** | 500 次/月 | 6000 分钟/月 | 300 分钟/月 |
| **全球 CDN** | ✅ 300+ 节点 | ✅ | ✅ |
| **自动 HTTPS** | ✅ | ✅ | ✅ |
| **自定义域名** | ✅ 100 个 | ✅ 无限 | ✅ |
| **Preview 部署** | ✅ | ✅ | ✅ |
| **边缘函数** | ✅ Workers | ✅ Edge Functions | ✅ Edge Functions |
| **中国访问速度** | 🟢 较快 | 🔴 较慢 | 🟡 一般 |

## 安全最佳实践

### 1. 启用 DNSSEC

如果使用 Cloudflare 管理域名，启用 DNSSEC：

1. 进入域名 → **DNS** → **Settings**
2. 启用 **DNSSEC**

### 2. 配置 CSP（内容安全策略）

在 `public/_headers` 文件中添加 CSP 头（根据需要调整）：

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval'; worker-src 'self' blob:; connect-src 'self' https://unpkg.com; style-src 'self' 'unsafe-inline'
```

**注意**：FFmpeg.wasm 需要 `'unsafe-eval'` 和 `blob:` 协议支持。

### 3. 定期更新依赖

```bash
pnpm update
pnpm audit
```

## 参考资源

- [Cloudflare Pages 官方文档](https://developers.cloudflare.com/pages/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [Vite 部署指南](https://vitejs.dev/guide/static-deploy.html)
- [FFmpeg.wasm 文档](https://ffmpegwasm.netlify.app/)

## 常见命令速查

```bash
# 构建项目
pnpm build

# 预览构建结果
pnpm preview

# 登录 Cloudflare
wrangler login

# 部署到 Pages
wrangler pages deploy dist

# 查看项目列表
wrangler pages project list

# 查看部署历史
wrangler pages deployment list

# 删除项目
wrangler pages project delete <project-name>
```

## 获取帮助

如遇到问题：

1. 查看 [Cloudflare Community](https://community.cloudflare.com/)
2. 提交工单到 [Cloudflare Support](https://dash.cloudflare.com/?to=/:account/support)
3. 查看项目 Issues：[GitHub Issues](../../issues)

---

最后更新：2025-11-23
