import React, { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, Contract, parseEther, Signer, formatEther } from 'ethers';
import { Wallet, LogOut, CheckCircle, Coins, ChevronRight, ChevronDown, Github, Twitter, Mail, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// 为OKX钱包添加TypeScript声明
declare global {
  interface Window {
    okxwallet?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    };
    ethereum?: any;
  }
}

// 自定义全球图标组件
const GlobeIcon = ({ className }: { className?: string }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      <line x1="2" y1="12" x2="22" y2="12"></line>
    </svg>
  );
};

// 自定义 Telegram 图标组件
const TelegramIcon = ({ className }: { className?: string }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M21.73 4.04c-.29-.21-.66-.28-1.01-.2L4.11 8.91c-.7.17-1.12.78-1.09 1.47.03.69.5 1.27 1.22 1.38l5.23.84 2.28 7.4c.11.39.38.71.76.87.38.16.8.12 1.15-.09l3.87-2.41 4.93 3.68c.3.22.66.34 1.03.34.25 0 .5-.05.74-.16.4-.18.71-.5.87-.92l3.07-13.5c.21-.89-.28-1.8-1.14-2.17z"></path>
      <path d="M10.5 14.5l-1.5 7 3.8-2.5 4.8 3.5 3.4-15-15 5 4.5 2z"></path>
    </svg>
  );
};

const NFT_CONTRACT_ABI = [
  {
    "inputs": [{"name": "_to", "type": "address"}],
    "name": "mint",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"name": "owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "_address", "type": "address"}],
    "name": "isWhitelisted",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "_address", "type": "address"}],
    "name": "getMintedCountByAddress",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "mintPrice",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "mintedCount",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_SUPPLY",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "mintingEnabled",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "mintStartTimestamp",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const NFT_CONTRACT_ADDRESS = "0xd3F43706349B2a3dCDd0D4A5aD67626180388871";//主网NFT合约
const DAILY_CHECKIN_CONTRACT_ADDRESS = "0x6813d9dd411AaB8934643049C267A6E0F3d5bD3d";//主网每日签到合约
const CHECKIN_API_URL = "https://checkin.saigo.dev/api/check-in-data";

// 社交媒体和联系方式配置
const SOCIAL_LINKS = {
  github: "https://github.com/saigo-team",
  twitter: "https://x.com/SaigoTrading",
  telegram: "https://t.me/SAIGOGroup",
  discord: "",
  medium: "",
  email: "saigo-team@saigo.dev"
};

const DAILY_CHECKIN_ABI = [
  {
    "inputs": [
      {"name": "_ipAddress", "type": "string"},
      {"name": "_timestamp", "type": "uint256"},
      {"name": "_signature", "type": "bytes"}
    ],
    "name": "checkIn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "_ipAddress", "type": "string"},
      {"name": "_timestamp", "type": "uint256"},
      {"name": "_signature", "type": "bytes"}
    ],
    "name": "testCheckIn",
    "outputs": [
      {"name": "errorCode", "type": "uint8"},
      {"name": "errorMessage", "type": "string"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "_user", "type": "address"}],
    "name": "getUserCheckInStatus",
    "outputs": [
      {"name": "lastCheckIn", "type": "uint256"},
      {"name": "totalCheckIns", "type": "uint256"},
      {"name": "hasCheckedInToday", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "_user", "type": "address"}],
    "name": "getUserCheckInDays",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "_user", "type": "address"}],
    "name": "hasCheckedInToday",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "isCheckInPeriodActive",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "startDate",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "endDate",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "minBnbBalance",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

//  主网
const BSC_NETWORK = {
  chainId: '0x38',
  chainName: 'BNB Smart Chain',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18
  },
  rpcUrls: ['https://bsc-dataseed.binance.org/'],
  blockExplorerUrls: ['https://bscscan.com']
};

// 测试网
// const BSC_NETWORK = {
//   chainId: '0x61',
//   chainName: 'BNB Smart Chain Testnet',
//   nativeCurrency: {
//     name: 'BNB',
//     symbol: 'BNB',
//     decimals: 18
//   },
//   rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
//   blockExplorerUrls: ['https://testnet.bscscan.com']
// };

function App() {
  const { t, i18n } = useTranslation();
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [lastCheckIn, setLastCheckIn] = useState<string | null>(null);
  const [canCheckIn, setCanCheckIn] = useState(true);
  const [isMinting, setIsMinting] = useState(false);
  const [nftBalance, setNftBalance] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentNetwork, setCurrentNetwork] = useState<string>('');
  const [isContractAvailable, setIsContractAvailable] = useState(false);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [hasMinted, setHasMinted] = useState(false);
  const [mintPrice, setMintPrice] = useState<string>('0');
  const [maxSupply, setMaxSupply] = useState<number>(5000); // Default to 5000 as per contract
  const [mintedCount, setMintedCount] = useState<number>(0);
  const [mintingEnabled, setMintingEnabled] = useState<boolean>(false);
  const [mintStartTimestamp, setMintStartTimestamp] = useState<number>(0);
  const [consecutiveCheckins, setConsecutiveCheckins] = useState(0);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInPeriodActive, setCheckInPeriodActive] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    // 检查 localStorage 中是否有保存的语言设置
    const savedLanguage = localStorage.getItem('userLanguage');
    // 如果有保存的设置则使用，否则默认为英文
    return savedLanguage || 'en';
  });
  const [checkInStartDate, setCheckInStartDate] = useState<Date | null>(null);
  const [checkInEndDate, setCheckInEndDate] = useState<Date | null>(null);
  const [minBnbBalance, setMinBnbBalance] = useState<string>('0');
  const [userBnbBalance, setUserBnbBalance] = useState<string>('0');
  const [hasSufficientBalance, setHasSufficientBalance] = useState(true);
  const [communityLightCount, setCommunityLightCount] = useState<number>(0);
  const languageDropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkConnection();
    loadCheckInStatus();
    fetchCommunityLightCount();
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('disconnect', handleDisconnect);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('disconnect', handleDisconnect);
      }
    };
  }, []);

  // 确保在组件挂载时设置正确的语言
  useEffect(() => {
    // 如果当前语言与 i18n 的语言不同，则更新 i18n 的语言
    if (currentLanguage !== i18n.language) {
      i18n.changeLanguage(currentLanguage);
    }
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      console.log('Connected wallet changed, checking contract status...');
      checkContractAndUpdateStatus();
      checkCheckInStatus();
    }
  }, [isConnected, address, currentNetwork]);

  useEffect(() => {
    // Update currentLanguage when i18n language changes
    const handleLanguageChange = () => {
      setCurrentLanguage(i18n.language || 'en');
    };
    
    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  useEffect(() => {
    // Close language dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
        setIsLanguageDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Check URL parameters for language setting
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('lang');
    
    if (langParam === 'en' || langParam === 'zh') {
      i18n.changeLanguage(langParam);
      setCurrentLanguage(langParam);
      // 保存 URL 参数设置的语言到 localStorage
      localStorage.setItem('userLanguage', langParam);
    }
  }, []);

  const loadCheckInStatus = () => {
    if (!isConnected) {
      setConsecutiveCheckins(0);
    }
  };

  const checkContractAndUpdateStatus = async () => {
    if (!window.ethereum || !address) return;

    try {
      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const chainIdHex = '0x' + network.chainId.toString(16);
      setCurrentNetwork(chainIdHex);
      
      // Only check NFT contract status if we're on the correct network
      if (chainIdHex === BSC_NETWORK.chainId) {
        try {
          const signer = await provider.getSigner();
          const nftContract = new Contract(NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI, signer);
          
          setIsContractAvailable(true);
          
          const isWhitelistedResult = await nftContract.isWhitelisted(address);
          setIsWhitelisted(isWhitelistedResult);
          
          const mintedCountByAddress = await nftContract.getMintedCountByAddress(address);
          setHasMinted(Number(mintedCountByAddress) > 0);
          
          const balanceResult = await nftContract.balanceOf(address);
          setNftBalance(Number(balanceResult));
          
          // Fetch mint price
          const mintPriceWei = await nftContract.mintPrice();
          setMintPrice(formatEther(mintPriceWei));
          
          // Fetch total minted count
          const totalMinted = await nftContract.mintedCount();
          setMintedCount(Number(totalMinted));
          
          // Fetch max supply (though it's a constant, we fetch it to be sure)
          try {
            const maxSupplyResult = await nftContract.MAX_SUPPLY();
            setMaxSupply(Number(maxSupplyResult));
          } catch (error) {
            // If MAX_SUPPLY is truly a constant and not accessible via call, use the default
            console.log('Using default MAX_SUPPLY value');
          }
          
          // Check if minting is enabled
          try {
            const mintingEnabledResult = await nftContract.mintingEnabled();
            setMintingEnabled(mintingEnabledResult);
            
            // Get mint start timestamp
            const mintStartTimestampResult = await nftContract.mintStartTimestamp();
            setMintStartTimestamp(Number(mintStartTimestampResult));
          } catch (error) {
            console.error('Error checking if minting is enabled:', error);
            setMintingEnabled(false);
            setMintStartTimestamp(0);
          }
        } catch (contractError) {
          console.error('NFT contract error:', contractError);
          setIsContractAvailable(false);
        }
      } else {
        setIsContractAvailable(false);
      }
    } catch (error) {
      console.error('Connection check failed:', error);
      setError(t('nft.errors.connection'));
    }
  };

  const checkCheckInStatus = async () => {
    if (!window.ethereum || !address) return;
    
    try {
      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const chainIdHex = '0x' + network.chainId.toString(16);
      
      if (chainIdHex !== BSC_NETWORK.chainId) {
        console.log('Not on BSC testnet, skipping contract calls');
        setCheckInPeriodActive(false);
        setCanCheckIn(false);
        return;
      }
      
      try {
        const signer = await provider.getSigner();
        const checkInContract = new Contract(DAILY_CHECKIN_CONTRACT_ADDRESS, DAILY_CHECKIN_ABI, signer);
        
        // Check if check-in period is active
        const isActive = await checkInContract.isCheckInPeriodActive();
        console.log('Check-in period active:', isActive);
        setCheckInPeriodActive(isActive);
        
        // Get check-in period dates
        const startDateTimestamp = await checkInContract.startDate();
        const endDateTimestamp = await checkInContract.endDate();
        const startDate = new Date(Number(startDateTimestamp) * 1000);
        const endDate = new Date(Number(endDateTimestamp) * 1000);
        setCheckInStartDate(startDate);
        setCheckInEndDate(endDate);
        
        // Get minimum BNB balance requirement
        const minBnbBalanceWei = await checkInContract.minBnbBalance();
        const minBnbBalanceEther = formatEther(minBnbBalanceWei);
        setMinBnbBalance(minBnbBalanceEther);
        
        // Get user's BNB balance
        const userBalanceWei = await provider.getBalance(address);
        const userBalanceEther = formatEther(userBalanceWei);
        setUserBnbBalance(userBalanceEther);
        
        // Check if user has sufficient balance
        const hasSufficient = userBalanceWei >= minBnbBalanceWei;
        setHasSufficientBalance(hasSufficient);
        
        if (isActive) {
          // Check if user has already checked in today
          const hasCheckedIn = await checkInContract.hasCheckedInToday(address);
          console.log('Has checked in today:', hasCheckedIn);
          
          // User can check in if they haven't checked in today AND have sufficient balance
          setCanCheckIn(!hasCheckedIn && hasSufficient);
          
          // Get user's check-in status
          const [lastCheckInTime, totalCheckIns, hasCheckedInToday] = await checkInContract.getUserCheckInStatus(address);
          console.log('User check-in status:', {
            lastCheckInTime: Number(lastCheckInTime),
            totalCheckIns: Number(totalCheckIns),
            hasCheckedInToday
          });
          
          if (lastCheckInTime > 0) {
            const date = new Date(Number(lastCheckInTime) * 1000);
            setLastCheckIn(date.toLocaleString());
            setConsecutiveCheckins(Number(totalCheckIns) > 3 ? 3 : Number(totalCheckIns));
          }
        } else {
          setCanCheckIn(false);
        }
      } catch (contractError) {
        console.error('Contract call error:', contractError);
        // Reset values on error
        setCheckInPeriodActive(false);
        setCanCheckIn(false);
        setConsecutiveCheckins(0);
      }
    } catch (error) {
      console.error('Failed to check check-in status:', error);
      setCheckInError('Failed to check check-in status');
      // Reset values on error
      setConsecutiveCheckins(0);
    }
  };

  const handleChainChanged = (chainId: string) => {
    window.location.reload();
  };

  const switchToBSC = async () => {
    if (!window.ethereum) return;
    
    try {
      // Try to switch to BSC testnet
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BSC_NETWORK.chainId }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: BSC_NETWORK.chainId,
                chainName: BSC_NETWORK.chainName,
                nativeCurrency: BSC_NETWORK.nativeCurrency,
                rpcUrls: BSC_NETWORK.rpcUrls,
                blockExplorerUrls: BSC_NETWORK.blockExplorerUrls
              },
            ],
          });
        } catch (addError) {
          console.error('Error adding BSC network:', addError);
          setError(t('nft.errors.addNetwork'));
        }
      } else {
        console.error('Error switching to BSC network:', switchError);
        setError(t('nft.errors.networkSwitch'));
      }
    }
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      // Disconnected
      handleDisconnect();
    } else {
      const newAddress = accounts[0];
      if (address && newAddress !== address) {
        // Address changed
        setAddress(newAddress);
        checkContractAndUpdateStatus();
        checkCheckInStatus();
      } else if (!address) {
        // New connection
        setIsConnected(true);
        setAddress(newAddress);
        checkContractAndUpdateStatus();
        checkCheckInStatus();
      }
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setAddress('');
    setLastCheckIn(null);
    setCanCheckIn(true);
    setNftBalance(0);
    setError(null);
    setIsContractAvailable(false);
    setIsWhitelisted(false);
    setHasMinted(false);
  };

  const checkConnection = async () => {
    if (window.ethereum) {
      try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        setCurrentNetwork(chainId);

        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const currentAddress = accounts[0];
          setIsConnected(true);
          setAddress(currentAddress);
          
          const stored = localStorage.getItem(`checkin_${currentAddress}`);
          if (stored) {
            setLastCheckIn(stored);
            setCanCheckIn(true);
          }
          checkContractAndUpdateStatus();
        }
      } catch (error) {
        console.error('Error checking connection:', error);
        setError(t('nft.errors.connection'));
      }
    }
  };

  // 检测是否为移动设备
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // 检测是否在OKX App内部浏览器中
  const isInOKXApp = () => {
    return /OKX/i.test(navigator.userAgent);
  };

  // 连接OKX钱包
  const connectOKXWallet = useCallback(async () => {
    // 检查OKX钱包是否可用
    if (!window.okxwallet) {
      // 如果在移动设备上，尝试打开OKX App
      if (isMobileDevice() && !isInOKXApp()) {
        // 尝试打开OKX App
        window.location.href = 'okx://wallet/dapp/details?dappUrl=' + encodeURIComponent(window.location.href);
        
        // 设置一个超时，如果用户没有OKX App，提示下载
        setTimeout(() => {
          window.location.href = 'https://www.okx.com/download';
        }, 1500);
        return;
      }
      
      setError(t('nft.errors.noOKXWallet'));
      return;
    }

    try {
      await switchToBSC();
      
      const accounts = await window.okxwallet.request({ method: 'eth_requestAccounts' });
      const newAddress = accounts[0];
      setIsConnected(true);
      setAddress(newAddress);
      
      checkContractAndUpdateStatus();
      checkCheckInStatus();
    } catch (error) {
      console.error('Error connecting OKX wallet:', error);
      setError(t('nft.errors.walletConnect'));
    }
  }, [t]);

  const connectWallet = async () => {
    // 检查是否为移动设备
    const isMobile = isMobileDevice();
    
    // 如果是移动设备，优先尝试连接OKX钱包
    if (isMobile) {
      if (window.okxwallet || !isInOKXApp()) {
        return connectOKXWallet();
      }
    }
    
    // 桌面端或其他情况，使用MetaMask
    if (window.ethereum) {
      try {
        await switchToBSC();

        const provider = new BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        const newAddress = accounts[0];
        setIsConnected(true);
        setAddress(newAddress);
        
        checkContractAndUpdateStatus();
        checkCheckInStatus();
      } catch (error) {
        console.error('Error connecting wallet:', error);
        setError(t('nft.errors.walletConnect'));
      }
    } else {
      // 如果没有检测到MetaMask，尝试OKX钱包
      if (window.okxwallet) {
        return connectOKXWallet();
      } else {
        setError(t('nft.errors.noWallet'));
      }
    }
  };

  const disconnectWallet = () => {
    handleDisconnect();
  };

  const handleCheckIn = async () => {
    if (!address) return;
    
    setIsCheckingIn(true);
    setCheckInError(null);
    
    try {
      // Check if we're on the correct network
      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const chainIdHex = '0x' + network.chainId.toString(16);
      
      if (chainIdHex !== BSC_NETWORK.chainId) {
        // Try to switch to BSC testnet
        await switchToBSC();
        // Check again after switching
        const newNetwork = await provider.getNetwork();
        const newChainIdHex = '0x' + newNetwork.chainId.toString(16);
        if (newChainIdHex !== BSC_NETWORK.chainId) {
          throw new Error(t('nft.preview.wrongNetwork'));
        }
      }
      
      // Check contract state first
      const signer = await provider.getSigner();
      const checkInContract = new Contract(DAILY_CHECKIN_CONTRACT_ADDRESS, DAILY_CHECKIN_ABI, signer);
      
      // Check if check-in period is active
      const isActive = await checkInContract.isCheckInPeriodActive();
      if (!isActive) {
        throw new Error(t('nft.preview.checkInPeriodInactive'));
      }
      
      // Check if user has already checked in today
      const hasCheckedIn = await checkInContract.hasCheckedInToday(address);
      if (hasCheckedIn) {
        throw new Error(t('nft.checkIn.alreadyCheckedIn'));
      }
      
      // Check minimum BNB balance requirement
      const minBnbBalanceWei = await checkInContract.minBnbBalance();
      const userBalanceWei = await provider.getBalance(address);
      
      if (userBalanceWei < minBnbBalanceWei) {
        const minBnbBalanceEther = formatEther(minBnbBalanceWei);
        throw new Error(`${t('nft.checkIn.insufficientBalance')}: ${minBnbBalanceEther} BNB`);
      }
      
      // Get signature from the server with a fresh request
      const signatureUrl = `${CHECKIN_API_URL}?address=${address}`;
      
      console.log('Fetching signature from:', signatureUrl);
      const response = await fetch(signatureUrl);
      
      if (!response.ok) {
        throw new Error(`${t('nft.errors.serverError')}: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Signature data:', data);
      
      if (!data.signature || !data.ipHash || !data.timestamp) {
        throw new Error('Invalid signature received from server');
      }
      
      // Ensure the timestamp is recent
      const currentTime = Math.floor(Date.now() / 1000);
      const signatureTime = Number(data.timestamp);
      const timeDiff = Math.abs(currentTime - signatureTime);
      
      console.log('Time difference (seconds):', timeDiff);
      
      if (timeDiff > 300) { // 5 minutes
        throw new Error('Signature timestamp is too old. Please try again.');
      }
      
      // Format the parameters correctly
      const ipHash = String(data.ipHash);
      const timestamp = BigInt(data.timestamp);
      
      // Ensure signature has 0x prefix
      let signature = data.signature;
      if (!signature.startsWith('0x')) {
        signature = '0x' + signature;
      }
      
      // Hex decode the signature
      // First remove 0x prefix if present
      let signatureHex = signature;
      if (signatureHex.startsWith('0x')) {
        signatureHex = signatureHex.slice(2);
      }
      
      // Convert hex string to byte array
      const signatureBytes = new Uint8Array(signatureHex.match(/.{1,2}/g)?.map((byte: string) => parseInt(byte, 16)) || []);
      
      console.log('Original signature:', signature);
      console.log('Hex decoded signature bytes length:', signatureBytes.length);
      
      console.log('Calling contract with parameters:', {
        ipHash,
        timestamp: timestamp.toString(),
        signatureBytes
      });
      
      // First test the check-in to get detailed error information
      console.log('Testing check-in before actual submission...');
      try {
        const testResult = await checkInContract.testCheckIn(
          ipHash,
          timestamp.toString(),
          signatureBytes
        );
        
        const errorCode = Number(testResult.errorCode);
        const errorMessage = testResult.errorMessage;
        
        console.log('Test check-in result:', {
          errorCode,
          errorMessage
        });
        
        // If there's an error, throw it to be caught by the outer catch block
        if (errorCode !== 0) {
          throw new Error(`Check-in would fail: ${errorMessage} (Error code: ${errorCode})`);
        }
        
        console.log('Test check-in successful, proceeding with actual check-in');
      } catch (testError: any) {
        console.error('Test check-in failed:', testError);
        throw new Error(`Test check-in failed: ${testError.message}`);
      }
      
      // Set a high gas limit to ensure the transaction goes through
      const gasLimit = 400000;
      
      // Call the contract with hex decoded signature
      const tx = await checkInContract.checkIn(
        ipHash,
        timestamp,
        signatureBytes,
        { gasLimit }
      );
      
      console.log('Transaction sent:', tx.hash);
      
      // Wait for transaction to be mined
      console.log('Waiting for transaction confirmation...');
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      
      // Update UI
      setCanCheckIn(false);
      const now = new Date().toLocaleString();
      setLastCheckIn(now);
      
      // Update check-in status from contract
      await checkCheckInStatus();
      
      // 直接在本地将社区点亮次数加 1，而不是再次调用 API
      setCommunityLightCount(prevCount => prevCount + 1);
    } catch (error: any) {
      console.error('Check-in failed:', error);
      
      // Provide a more helpful error message
      let errorMessage = error.message || 'Unknown error';
      
      // Check if this is a detailed error from testCheckIn
      if (errorMessage.includes('Check-in would fail:') || errorMessage.includes('Test check-in failed:')) {
        // Already a detailed message, use it as is
        setCheckInError(`${errorMessage}`);
      } else if (errorMessage.includes('execution reverted')) {
        errorMessage = 'Contract execution failed. This may be due to an invalid signature or the contract rejecting the check-in. Please try again later or contact support.';
        setCheckInError(`Check-in failed: ${errorMessage}`);
      } else {
        setCheckInError(`Check-in failed: ${errorMessage}`);
      }
    } finally {
      setIsCheckingIn(false);
    }
  };

  const mintNFT = async () => {
    if (!window.ethereum || !address || !isContractAvailable || hasMinted) return;

    if (currentNetwork !== BSC_NETWORK.chainId) {
      setError(t('nft.mint.switchNetwork'));
      await switchToBSC();
      return;
    }

    try {
      setIsMinting(true);
      setError(null);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI, signer);
      
      // Check if minting is enabled
      const isMintingEnabled = await contract.mintingEnabled();
      if (!isMintingEnabled) {
        setError(t('nft.errors.mintingDisabled'));
        setIsMinting(false);
        return;
      }
      
      // Check if mint start time has been reached
      const mintStartTimestampResult = await contract.mintStartTimestamp();
      const mintStartTime = Number(mintStartTimestampResult);
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (mintStartTime > 0 && currentTime < mintStartTime) {
        setError(t('nft.errors.mintTimeNotReached'));
        setIsMinting(false);
        return;
      }
      
      // Check if minting is still available
      const totalMinted = await contract.mintedCount();
      const maxSupplyValue = await contract.MAX_SUPPLY();
      
      if (Number(totalMinted) >= Number(maxSupplyValue)) {
        setError(t('nft.errors.soldOut'));
        setIsMinting(false);
        return;
      }
      
      // Get mint price from contract
      const mintPriceWei = await contract.mintPrice();
      
      // If whitelisted, mint price should be 0
      const mintValue = isWhitelisted ? 0 : mintPriceWei;
      
      // Call mint function with address parameter
      const tx = await contract.mint(address, { value: mintValue });
      await tx.wait();
      
      await checkContractAndUpdateStatus();
      alert(t('nft.mint.success'));
    } catch (error) {
      console.error('Error minting NFT:', error);
      setError(t('nft.errors.mint'));
    } finally {
      setIsMinting(false);
    }
  };

  const formatAddress = (addr: string) => {
    return addr.slice(0, 6) + '...' + addr.slice(-4);
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setCurrentLanguage(lng);
    // 保存用户的语言选择到 localStorage
    localStorage.setItem('userLanguage', lng);
    setIsLanguageDropdownOpen(false);
  };

  // 获取社区点亮次数
  const fetchCommunityLightCount = async () => {
    try {
      const response = await fetch('https://checkin.saigo.dev/api/get_light_count');
      if (response.ok) {
        const data = await response.json();
        if (data && typeof data.count === 'number') {
          setCommunityLightCount(data.count);
        }
      }
    } catch (error) {
      console.error('Failed to fetch community light count:', error);
    }
  };

  const isCorrectNetwork = currentNetwork === BSC_NETWORK.chainId;
  const isSoldOut = mintedCount >= maxSupply;
  
  // Check if minting is available based on timestamp
  const isMintTimeReached = useCallback(() => {
    if (mintStartTimestamp === 0) return false;
    const currentTime = Math.floor(Date.now() / 1000);
    return currentTime >= mintStartTimestamp;
  }, [mintStartTimestamp]);
  
  // Calculate time remaining until mint starts
  const getTimeRemainingForMint = useCallback(() => {
    if (mintStartTimestamp === 0 || isMintTimeReached()) return null;
    
    const currentTime = Math.floor(Date.now() / 1000);
    const timeRemaining = mintStartTimestamp - currentTime;
    
    if (timeRemaining <= 0) return null;
    
    const days = Math.floor(timeRemaining / 86400);
    const hours = Math.floor((timeRemaining % 86400) / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);
    const seconds = timeRemaining % 60;
    
    return { days, hours, minutes, seconds };
  }, [mintStartTimestamp, isMintTimeReached]);
  
  // State to hold formatted countdown
  const [mintCountdown, setMintCountdown] = useState<string | null>(null);
  
  // Update countdown timer
  useEffect(() => {
    if (!mintingEnabled || mintStartTimestamp === 0 || isMintTimeReached()) {
      setMintCountdown(null);
      return;
    }
    
    const updateCountdown = () => {
      const timeRemaining = getTimeRemainingForMint();
      if (!timeRemaining) {
        setMintCountdown(null);
        return;
      }
      
      const { days, hours, minutes, seconds } = timeRemaining;
      let countdownText = '';
      
      if (days > 0) {
        countdownText = `${days}d ${hours}h ${minutes}m ${seconds}s`;
      } else if (hours > 0) {
        countdownText = `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        countdownText = `${minutes}m ${seconds}s`;
      } else {
        countdownText = `${seconds}s`;
      }
      
      setMintCountdown(countdownText);
    };
    
    // Update immediately
    updateCountdown();
    
    // Then update every second
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [mintingEnabled, mintStartTimestamp, isMintTimeReached, getTimeRemainingForMint]);
  
  const isMintingAvailable = !hasMinted && isContractAvailable && isCorrectNetwork && !isSoldOut && mintingEnabled && (mintStartTimestamp === 0 || isMintTimeReached());

  const NFTPreview = () => {
    const displayConsecutiveCheckins = isConnected ? consecutiveCheckins : 0;
    
    // 添加数字动画效果
    const [displayCount, setDisplayCount] = useState(0);
    
    useEffect(() => {
      if (communityLightCount > 0) {
        // 如果点亮次数很大，使用动画效果
        if (communityLightCount > 100) {
          let start = 0;
          const increment = Math.max(1, Math.floor(communityLightCount / 20)); // 20步完成动画
          const timer = setInterval(() => {
            start += increment;
            if (start >= communityLightCount) {
              setDisplayCount(communityLightCount);
              clearInterval(timer);
            } else {
              setDisplayCount(start);
            }
          }, 20);
          return () => clearInterval(timer);
        } else {
          // 如果点亮次数较小，直接显示
          setDisplayCount(communityLightCount);
        }
      }
    }, [communityLightCount]);
    
    // Determine the check-in status message
    const getCheckInStatusMessage = () => {
      if (!isConnected) {
        return t('nft.preview.connectWalletFirst');
      }
      
      if (!checkInPeriodActive) {
        return t('nft.preview.checkInPeriodInactive');
      }
      
      if (currentNetwork !== BSC_NETWORK.chainId) {
        return t('nft.preview.wrongNetwork');
      }
      
      if (!hasSufficientBalance && minBnbBalance !== '0') {
        return `${t('nft.checkIn.insufficientBalance')}: ${minBnbBalance} BNB`;
      }
      
      if (!canCheckIn && lastCheckIn) {
        return t('nft.checkIn.alreadyCheckedIn');
      }
      
      if (displayConsecutiveCheckins === 0) {
        return t('nft.preview.firstCheckIn');
      } else if (displayConsecutiveCheckins === 1) {
        return t('nft.preview.secondCheckIn');
      } else if (displayConsecutiveCheckins === 2) {
        return t('nft.preview.thirdCheckIn');
      } else {
        return t('nft.preview.completed');
      }
    };
    
    return (
      <div className="bg-[#0a0a0a] rounded-2xl overflow-hidden border border-[#1d1d1d] p-8">
        <div className="flex flex-col items-center justify-center min-h-[280px] gap-6">
          <div className="text-5xl md:text-7xl font-bold tracking-widest">
            <span className={`transition-all duration-500 ${displayConsecutiveCheckins >= 1 ? 'text-blue-400' : 'text-gray-800'}`}>S</span>
            <span className={`transition-all duration-500 ${displayConsecutiveCheckins >= 2 ? 'text-blue-400' : 'text-gray-800'}`}>A</span>
            <span className={`transition-all duration-500 ${displayConsecutiveCheckins >= 2 ? 'text-blue-400' : 'text-gray-800'}`}>I</span>
            <span className={`transition-all duration-500 ${displayConsecutiveCheckins >= 3 ? 'text-blue-400' : 'text-gray-800'}`}>G</span>
            <span className={`transition-all duration-500 ${displayConsecutiveCheckins >= 3 ? 'text-blue-400' : 'text-gray-800'}`}>O</span>
          </div>
          
          {/* 社区点亮次数显示 */}
          {communityLightCount > 0 && (
            <div className="flex items-center justify-center">
              <div className="px-4 py-2 bg-blue-400/10 rounded-full border border-blue-400/20 transition-all duration-300 hover:bg-blue-400/20">
                <p className="text-sm text-blue-400 flex items-center">
                  <span className="mr-1 animate-pulse">✨</span>
                  {t('nft.preview.communityLightCount', { count: displayCount })}
                </p>
              </div>
            </div>
          )}
          
          <div className="text-center text-gray-400">
            <p className="mb-2">{t('nft.preview.progress', { count: displayConsecutiveCheckins })}</p>
            <p className={`text-sm ${
              !isConnected || !checkInPeriodActive || currentNetwork !== BSC_NETWORK.chainId || !hasSufficientBalance 
                ? 'text-yellow-500' 
                : ''
            }`}>
              {getCheckInStatusMessage()}
            </p>
            {lastCheckIn && (
              <p className="mt-2 text-xs text-gray-500">
                {t('nft.mint.lastCheckIn', { time: lastCheckIn })}
              </p>
            )}
            {checkInError && (
              <p className="mt-2 text-xs text-red-500">
                {checkInError}
              </p>
            )}
            {isConnected && currentNetwork !== BSC_NETWORK.chainId && (
              <div className="mt-4">
                <button
                  onClick={switchToBSC}
                  className="px-3 py-1.5 rounded-full text-xs bg-[#0ea5e9] hover:bg-[#0284c7] text-white transition-colors"
                >
                  {t('nft.mint.switchButton')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#030014] text-[#e4e4e7]">
      <header className="fixed top-0 left-0 right-0 bg-[#030014]/80 backdrop-blur-sm border-b border-[#1d1d1d] z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            {t('header.title')}
          </h1>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative" ref={languageDropdownRef}>
              <button
                onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#1d1d1d] hover:bg-[#1d1d1d] transition-colors"
              >
                <GlobeIcon className="w-4 h-4 text-gray-300" />
                <span className="text-sm text-gray-300">{currentLanguage === 'en' ? 'English' : '中文'}</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>
              {isLanguageDropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-[#0a0a0a] border border-[#1d1d1d] rounded-lg shadow-lg overflow-hidden z-50">
                  <button
                    onClick={() => changeLanguage('en')}
                    className={`w-full px-4 py-3 text-left hover:bg-[#1d1d1d] transition-colors flex items-center ${currentLanguage === 'en' ? 'text-blue-500 font-medium' : 'text-gray-300'}`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => changeLanguage('zh')}
                    className={`w-full px-4 py-3 text-left hover:bg-[#1d1d1d] transition-colors flex items-center ${currentLanguage === 'zh' ? 'text-blue-500 font-medium' : 'text-gray-300'}`}
                  >
                    中文
                  </button>
                </div>
              )}
            </div>
            {isConnected ? (
              <div className="flex items-center gap-2">
                <span className="text-[#94a3b8] hidden md:inline">{formatAddress(address)}</span>
                <button
                  onClick={disconnectWallet}
                  className="text-[#94a3b8] hover:text-red-400 p-1.5 rounded-full hover:bg-[#1d1d1d]"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-full py-2 px-4 flex items-center gap-2 transition-colors"
              >
                <Wallet className="w-5 h-5" />
                <span className="hidden md:inline">{t('header.connectWallet')}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="pt-24 pb-16 container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <div className="space-y-6">
            <NFTPreview />
            
            {isConnected && (
              <div className="bg-[#0a0a0a] rounded-2xl p-6 space-y-4 border border-[#1d1d1d]">
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                  {t('nft.checkIn.title')}
                </h3>
                <div className="space-y-2 text-[#94a3b8]">
                  <div className="flex justify-between items-center">
                    <span>{t('nft.checkIn.status')}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      canCheckIn && checkInPeriodActive 
                        ? 'bg-green-900/30 text-green-400' 
                        : !checkInPeriodActive
                          ? 'bg-yellow-900/30 text-yellow-400'
                          : !hasSufficientBalance
                            ? 'bg-red-900/30 text-red-400'
                            : 'bg-red-900/30 text-red-400'
                    }`}>
                      {!checkInPeriodActive 
                        ? t('nft.checkIn.periodInactive')
                        : !hasSufficientBalance
                          ? t('nft.checkIn.insufficientBalanceStatus')
                          : canCheckIn 
                            ? t('nft.checkIn.available') 
                            : t('nft.checkIn.alreadyCheckedIn')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t('nft.checkIn.progress')}</span>
                    <span>{consecutiveCheckins}/3</span>
                  </div>
                  {lastCheckIn && (
                    <div className="flex justify-between items-center">
                      <span>{t('nft.checkIn.lastCheckIn')}</span>
                      <span>{lastCheckIn}</span>
                    </div>
                  )}
                  {checkInStartDate && checkInEndDate && (
                    <div className="flex justify-between items-center">
                      <span>{t('nft.checkIn.period')}</span>
                      <span>{checkInStartDate.toLocaleDateString()} - {checkInEndDate.toLocaleDateString()}</span>
                    </div>
                  )}
                  {minBnbBalance !== '0' && (
                    <div className="flex justify-between items-center">
                      <span>{t('nft.checkIn.minBalance')}</span>
                      <span className={!hasSufficientBalance ? 'text-red-400' : ''}>
                        {minBnbBalance} BNB
                        {!hasSufficientBalance && ` (${t('nft.checkIn.insufficientBalance')})`}
                      </span>
                    </div>
                  )}
                  {currentNetwork !== BSC_NETWORK.chainId && (
                    <div className="flex justify-between items-center text-yellow-500">
                      <span>{t('nft.checkIn.network')}</span>
                      <span>{t('nft.checkIn.wrongNetwork')}</span>
                    </div>
                  )}
                  <div className="pt-2">
                    <button
                      onClick={handleCheckIn}
                      disabled={!canCheckIn || isCheckingIn || currentNetwork !== BSC_NETWORK.chainId || !checkInPeriodActive || !hasSufficientBalance}
                      className={`w-full py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                        canCheckIn && !isCheckingIn && currentNetwork === BSC_NETWORK.chainId && checkInPeriodActive && hasSufficientBalance
                          ? 'bg-[#0ea5e9] hover:bg-[#0284c7] text-white'
                          : 'bg-[#1d1d1d] text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isCheckingIn ? (
                        <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                      ) : (
                        <CheckCircle className="w-5 h-5" />
                      )}
                      <span>
                        {isCheckingIn 
                          ? t('header.checkingIn') 
                          : !checkInPeriodActive
                            ? t('nft.checkIn.periodInactive')
                            : currentNetwork !== BSC_NETWORK.chainId
                              ? t('nft.preview.wrongNetwork')
                              : !hasSufficientBalance
                                ? t('nft.checkIn.insufficientBalance')
                                : canCheckIn 
                                  ? t('header.checkIn') 
                                  : t('header.alreadyCheckedIn')}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-[#0a0a0a] rounded-2xl p-6 space-y-4 border border-[#1d1d1d]">
              <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                {t('nft.details.title')}
              </h3>
              <div className="space-y-2 text-[#94a3b8]">
                <p>{t('nft.details.limitedEdition')}</p>
                <p>{t('nft.details.communityRole')}</p>
                <p>{t('nft.details.ownership')}</p>
                <p>{t('nft.details.mintPrice')}</p>
                <p>{t('nft.details.onePerAddress')}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[#0a0a0a] rounded-2xl p-6 border border-[#1d1d1d]">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                    {t('nft.mint.title')}
                  </h2>
                  <p className="text-[#94a3b8]">{t('nft.mint.description')}</p>
                </div>

                {error && (
                  <div className="p-4 bg-red-900/20 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-[#1d1d1d]">
                    <span className="text-[#94a3b8]">{t('nft.mint.price')}</span>
                    <span className="font-semibold">
                      {isWhitelisted ? t('nft.mint.free') : `${mintPrice} BNB`}
                    </span>
                  </div>
                  {!isWhitelisted && isConnected && (
                    <div className="text-right">
                      <a 
                        href="https://docs.google.com/forms/d/e/1FAIpQLScRWYX2aQOrL2jaKqhebzDXjOupx8f9HKlxp6bP32Q_JkfgRg/viewform" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center justify-end gap-1"
                      >
                        <span>{t('nft.mint.whitelistAppeal')}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-3 border-b border-[#1d1d1d]">
                    <span className="text-[#94a3b8]">{t('nft.mint.whitelistStatus')}</span>
                    <span className={`font-semibold ${isWhitelisted ? 'text-green-400' : 'text-yellow-400'}`}>
                      {isWhitelisted ? t('nft.mint.whitelisted') : t('nft.mint.notWhitelisted')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-[#1d1d1d]">
                    <span className="text-[#94a3b8]">{t('nft.mint.mintStatus')}</span>
                    <span className={`font-semibold ${hasMinted ? 'text-green-400' : ''}`}>
                      {hasMinted ? t('nft.mint.minted') : t('nft.mint.notMinted')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-[#1d1d1d]">
                    <span className="text-[#94a3b8]">{t('nft.mint.mintProgress')}</span>
                    <span className="font-semibold">
                      {mintedCount} / {maxSupply} ({((mintedCount / maxSupply) * 100).toFixed(2)}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-[#1d1d1d]">
                    <span className="text-[#94a3b8]">{t('nft.mint.mintingStatus')}</span>
                    <span className={`font-semibold ${mintingEnabled ? 'text-green-400' : 'text-red-400'}`}>
                      {mintingEnabled ? t('nft.mint.mintingEnabled') : t('nft.mint.mintingDisabled')}
                    </span>
                  </div>
                  {mintStartTimestamp > 0 && (
                    <div className="flex justify-between items-center py-3 border-b border-[#1d1d1d]">
                      <span className="text-[#94a3b8]">{t('nft.mint.mintStartTime')}</span>
                      <span className="font-semibold">
                        {isMintTimeReached() 
                          ? t('nft.mint.mintStarted')
                          : new Date(mintStartTimestamp * 1000).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {!isCorrectNetwork && (
                    <div className="flex items-center justify-between text-yellow-500">
                      <span>{t('nft.mint.switchNetwork')}</span>
                      <button
                        onClick={switchToBSC}
                        className="flex items-center gap-1 hover:text-yellow-400"
                      >
                        {t('nft.mint.switchButton')}
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={mintNFT}
                  disabled={!isConnected || isMinting || !isMintingAvailable || hasMinted}
                  className={`w-full rounded-xl py-4 px-6 flex items-center justify-center gap-3 text-lg font-semibold transition-colors ${
                    !isConnected || isMinting || !isMintingAvailable || hasMinted
                      ? 'bg-[#1d1d1d] text-gray-500 cursor-not-allowed'
                      : 'bg-[#0ea5e9] hover:bg-[#0284c7] text-white'
                  }`}
                >
                  <Coins className="w-6 h-6" />
                  {!isConnected 
                    ? t('nft.mint.connectFirst')
                    : !isContractAvailable
                      ? t('nft.mint.contractNotDeployed')
                      : hasMinted
                        ? t('nft.mint.mintCompleted')
                        : isSoldOut
                          ? t('nft.mint.soldOut')
                          : !mintingEnabled
                            ? t('nft.mint.mintingDisabled')
                            : mintingEnabled && mintStartTimestamp > 0 && !isMintTimeReached()
                              ? t('nft.mint.mintStartsIn', { time: mintCountdown || '...' })
                              : isMinting 
                                ? t('nft.mint.minting')
                                : t('nft.mint.mintNFT')}
                </button>

                {lastCheckIn && (
                  <div className="text-center text-sm text-[#94a3b8]">
                    {t('nft.mint.lastCheckIn', { time: lastCheckIn })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-6 border-t border-[#1d1d1d] bg-[#030014]">
        <div className="container mx-auto px-4">
          {/* 社交媒体链接 */}
          <div className="mb-6">
            <h3 className="text-center text-lg font-semibold mb-4 bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              {t('footer.connectWithUs')}
            </h3>
            <div className="flex justify-center gap-6">
              <a 
                href={SOCIAL_LINKS.github} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-6 h-6" />
              </a>
              <a 
                href={SOCIAL_LINKS.twitter} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-400 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-6 h-6" />
              </a>
              <a 
                href={SOCIAL_LINKS.telegram} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-500 transition-colors"
                aria-label="Telegram"
              >
                <TelegramIcon className="w-6 h-6" />
              </a>
              <a 
                href={`mailto:${SOCIAL_LINKS.email}`} 
                className="text-gray-400 hover:text-red-400 transition-colors"
                aria-label="Email"
              >
                <Mail className="w-6 h-6" />
              </a>
            </div>
          </div>
          
          {/* 版权信息 */}
          <div className="text-center">
            <p className="text-[#94a3b8] text-sm">{t('footer.copyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;