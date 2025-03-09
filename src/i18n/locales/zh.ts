export default {
  header: {
    title: 'SAIGO 创世 NFT',
    checkIn: '签到',
    alreadyCheckedIn: '已签到',
    checkingIn: '签到中...',
    connectWallet: '连接钱包'
  },
  nft: {
    preview: {
      progress: '签到进度: {{count}}/3',
      firstCheckIn: '首次签到点亮 S',
      secondCheckIn: '第二次签到点亮 AI',
      thirdCheckIn: '第三次签到点亮 GO',
      completed: '已全部点亮！',
      checkInPeriodInactive: '签到活动未开始',
      wrongNetwork: '请切换到 BSC 测试网进行签到',
      connectWalletFirst: '请先连接钱包进行签到'
    },
    checkIn: {
      title: '每日签到',
      status: '今日状态',
      available: '可签到',
      unavailable: '已签到',
      periodInactive: '活动未开始',
      progress: '签到进度',
      lastCheckIn: '上次签到',
      network: '网络',
      wrongNetwork: '网络错误'
    },
    details: {
      title: '项目详情',
      limitedEdition: '• SAIGO限量发行的5000份创世纪NFT',
      communityRole: '• SAIGO创世社区的角色标识',
      ownership: '• 永久所有权，储存在BSC区块链上',
      mintPrice: '• 白名单用户免费铸造，非白名单用户铸造成本0.015BNB',
      onePerAddress: '• 每个地址只能唯一次数铸造'
    },
    mint: {
      title: 'SAIGO 创世 NFT',
      description: 'SAIGO创世社区的专属身份标识，铸造后即可永久拥有',
      price: '铸造价格',
      free: '免费',
      whitelistStatus: '白名单状态',
      whitelisted: '已在白名单',
      notWhitelisted: '未在白名单',
      mintStatus: '铸造状态',
      minted: '已铸造',
      notMinted: '未铸造',
      switchNetwork: '请切换到 BSC 网络',
      switchButton: '切换网络',
      connectFirst: '请先连接钱包',
      contractNotDeployed: 'NFT 合约未部署',
      mintCompleted: '已铸造完成',
      minting: '铸造中...',
      mintNFT: '铸造 NFT',
      lastCheckIn: '上次签到: {{time}}'
    },
    errors: {
      networkSwitch: '切换到 BSC 网络失败',
      addNetwork: '添加 BSC 网络失败，请手动添加',
      connection: '连接检查失败，请刷新页面重试',
      walletConnect: '钱包连接失败，请重试',
      noWallet: '请安装 MetaMask 或 OKX 钱包继续！',
      noOKXWallet: 'OKX 钱包未安装，请安装 OKX 钱包继续。',
      contract: '无法连接到 NFT 合约',
      mint: 'NFT 铸造失败，请确保有足够的 BNB 并重试',
      notDeployed: 'NFT 合约未部署到当前网络'
    }
  }
};