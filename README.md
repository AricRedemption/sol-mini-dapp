# Solana Connection DApp

一个简洁而强大的 Solana 资产查看器 (Dashboard)，支持连接多种 Solana 钱包，并利用 Helius RPC API 实时展示用户的代币资产和余额信息。

## 🌟 核心功能

- **多钱包支持**: 集成 `@solana/wallet-adapter`，支持 Phantom, Solflare 等主流钱包。
- **实时余额显示**: 自动获取并展示连接钱包的 SOL 余额及总资产价值。
- **详细资产列表**: 清晰排列用户持有的所有 SPL 代币，包括代币图标、名称、符号、余额及实时价值。
- **高性能 RPC 框架**: 深度集成 Helius RPC 服务，利用其强大的 Digital Asset Standard (DAS) API 实现高效的资产数据获取。
- **响应式界面**: 采用现代化的网格布局，在不同屏幕尺寸下均有良好表现。

## 🛠️ 技术栈

- **前端框架**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **构建工具**: [Vite](https://vite.dev/)
- **Solana 交互**:
  - `@solana/web3.js`
  - `@solana/wallet-adapter-react`
  - `@solana/spl-token`
- **数据服务**: [Helius RPC](https://www.helius.dev/)
- **代码规范**: ESLint

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd sol-connect-dapp
```

### 2. 安装依赖

推荐使用 `pnpm` 安装依赖：

```bash
pnpm install
```

### 3. 环境配置

在项目根目录创建 `.env` 文件，并参考 `.env.example` 配置你的 Helius API Key：

```bash
cp .env.example .env
```

在 `.env` 中填入你的 Key:
`VITE_HELIUS_API_KEY=your_helius_api_key`

> [!NOTE]
> 如果不填写 API Key，项目将回退到默认的公共 RPC 节点，但部分资产元数据可能无法显示。

### 4. 运行开发服务器

```bash
pnpm dev
```

打开浏览器访问 `http://localhost:5173`。

## 📂 项目结构

```text
src/
├── components/     # UI 组件 (Header, BalanceCard, AssetList 等)
├── constants/      # 全局常量配置
├── hooks/          # 自定义 React Hooks (usePortfolio)
├── services/       # 外部服务集成 (Helius API)
├── types/          # TypeScript 类型定义
├── App.tsx         # 核心应用入口
└── main.tsx        # 挂载点
```

## 📄 许可证

[MIT License](LICENSE)
