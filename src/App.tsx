import React, { useState, useEffect } from 'react';
import { BrowserProvider, Contract, parseEther } from 'ethers';
import { Wallet, LogOut, CheckCircle, Coins, ChevronRight, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const NFT_CONTRACT_ABI = [
  {
    "inputs": [],
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
    "inputs": [{"name": "account", "type": "address"}],
    "name": "isWhitelisted",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "owner", "type": "address"}],
    "name": "hasMinted",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const NFT_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

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
  const [consecutiveCheckins, setConsecutiveCheckins] = useState(0);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);

  useEffect(() => {
    checkConnection();
    loadCheckInStatus();
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

  useEffect(() => {
    if (isConnected && address) {
      checkContractAndUpdateStatus();
    }
  }, [isConnected, address, currentNetwork]);

  const loadCheckInStatus = () => {
    const storedCheckins = localStorage.getItem('consecutive_checkins');
    if (storedCheckins) {
      setConsecutiveCheckins(parseInt(storedCheckins));
    }
  };

  const checkContractAndUpdateStatus = async () => {
    if (!window.ethereum || !address) return;

    try {
      const provider = new BrowserProvider(window.ethereum);
      const code = await provider.getCode(NFT_CONTRACT_ADDRESS);
      
      if (code === '0x' || code === '') {
        setIsContractAvailable(false);
        setNftBalance(0);
        setError(t('nft.errors.notDeployed'));
        return;
      }

      setIsContractAvailable(true);
      const contract = new Contract(NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI, provider);
      
      const [balance, whitelist, minted] = await Promise.all([
        contract.balanceOf(address),
        contract.isWhitelisted(address),
        contract.hasMinted(address)
      ]);

      setNftBalance(Number(balance));
      setIsWhitelisted(whitelist);
      setHasMinted(minted);
      setError(null);
    } catch (error) {
      console.error('Error checking contract:', error);
      setIsContractAvailable(false);
      setNftBalance(0);
      setError(t('nft.errors.contract'));
    }
  };

  const handleChainChanged = (chainId: string) => {
    setCurrentNetwork(chainId);
    window.location.reload();
  };

  const switchToBSC = async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BSC_NETWORK.chainId }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [BSC_NETWORK],
          });
        } catch (addError) {
          console.error('Error adding BSC network:', addError);
          setError(t('nft.errors.addNetwork'));
        }
      } else {
        console.error('Error switching to BSC:', switchError);
        setError(t('nft.errors.networkSwitch'));
      }
    }
  };

  const checkCanCheckIn = (address: string) => {
    const stored = localStorage.getItem(`checkin_${address}`);
    if (stored) {
      const lastDate = new Date(stored);
      const today = new Date();
      return (
        lastDate.getDate() !== today.getDate() ||
        lastDate.getMonth() !== today.getMonth() ||
        lastDate.getFullYear() !== today.getFullYear()
      );
    }
    return true;
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      handleDisconnect();
    } else {
      const newAddress = accounts[0];
      setAddress(newAddress);
      setIsConnected(true);
      
      const stored = localStorage.getItem(`checkin_${newAddress}`);
      if (stored) {
        setLastCheckIn(stored);
        setCanCheckIn(checkCanCheckIn(newAddress));
      } else {
        setLastCheckIn(null);
        setCanCheckIn(true);
      }
      checkContractAndUpdateStatus();
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
            setCanCheckIn(checkCanCheckIn(currentAddress));
          }
          checkContractAndUpdateStatus();
        }
      } catch (error) {
        console.error('Error checking connection:', error);
        setError(t('nft.errors.connection'));
      }
    }
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        await switchToBSC();

        const provider = new BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        const newAddress = accounts[0];
        setIsConnected(true);
        setAddress(newAddress);
        
        const stored = localStorage.getItem(`checkin_${newAddress}`);
        if (stored) {
          setLastCheckIn(stored);
          setCanCheckIn(checkCanCheckIn(newAddress));
        }
        checkContractAndUpdateStatus();
      } catch (error) {
        console.error('Error connecting wallet:', error);
        setError(t('nft.errors.walletConnect'));
      }
    } else {
      setError(t('nft.errors.noWallet'));
    }
  };

  const disconnectWallet = () => {
    handleDisconnect();
  };

  const handleCheckIn = () => {
    if (address && canCheckIn) {
      const now = new Date().toLocaleString();
      localStorage.setItem(`checkin_${address}`, now);
      setLastCheckIn(now);
      setCanCheckIn(false);

      const lastCheckInDate = localStorage.getItem('last_checkin_date');
      const today = new Date().toDateString();

      if (lastCheckInDate) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastCheckInDate === yesterday.toDateString()) {
          const newCount = Math.min(consecutiveCheckins + 1, 3);
          setConsecutiveCheckins(newCount);
          localStorage.setItem('consecutive_checkins', newCount.toString());
        } else if (lastCheckInDate !== today) {
          setConsecutiveCheckins(1);
          localStorage.setItem('consecutive_checkins', '1');
        }
      } else {
        setConsecutiveCheckins(1);
        localStorage.setItem('consecutive_checkins', '1');
      }

      localStorage.setItem('last_checkin_date', today);
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
      
      const mintValue = isWhitelisted ? 0 : parseEther("0.015");
      const tx = await contract.mint({ value: mintValue });
      await tx.wait();
      
      await checkContractAndUpdateStatus();
      alert('NFT 铸造成功！');
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
    setIsLanguageDropdownOpen(false);
  };

  const isCorrectNetwork = currentNetwork === BSC_NETWORK.chainId;
  const canMint = !hasMinted && isContractAvailable && isCorrectNetwork;

  const NFTPreview = () => {
    return (
      <div className="bg-[#0a0a0a] rounded-2xl overflow-hidden border border-[#1d1d1d] p-8">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-8">
          <div className="text-6xl md:text-8xl font-bold tracking-widest">
            <span className={`transition-all duration-500 ${consecutiveCheckins >= 1 ? 'text-blue-400' : 'text-gray-800'}`}>S</span>
            <span className={`transition-all duration-500 ${consecutiveCheckins >= 2 ? 'text-blue-400' : 'text-gray-800'}`}>A</span>
            <span className={`transition-all duration-500 ${consecutiveCheckins >= 2 ? 'text-blue-400' : 'text-gray-800'}`}>I</span>
            <span className={`transition-all duration-500 ${consecutiveCheckins >= 3 ? 'text-blue-400' : 'text-gray-800'}`}>G</span>
            <span className={`transition-all duration-500 ${consecutiveCheckins >= 3 ? 'text-blue-400' : 'text-gray-800'}`}>O</span>
          </div>
          <div className="text-center text-gray-400">
            <p className="mb-2">{t('nft.preview.progress', { count: consecutiveCheckins })}</p>
            <p className="text-sm">
              {consecutiveCheckins === 0 && t('nft.preview.firstCheckIn')}
              {consecutiveCheckins === 1 && t('nft.preview.secondCheckIn')}
              {consecutiveCheckins === 2 && t('nft.preview.thirdCheckIn')}
              {consecutiveCheckins === 3 && t('nft.preview.completed')}
            </p>
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
            <div className="relative">
              <button
                onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                className="p-2 rounded-full hover:bg-[#1d1d1d] transition-colors"
              >
                <Languages className="w-5 h-5" />
              </button>
              {isLanguageDropdownOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-[#0a0a0a] border border-[#1d1d1d] rounded-lg shadow-lg overflow-hidden">
                  <button
                    onClick={() => changeLanguage('en')}
                    className="w-full px-4 py-2 text-left hover:bg-[#1d1d1d] transition-colors"
                  >
                    English
                  </button>
                  <button
                    onClick={() => changeLanguage('zh')}
                    className="w-full px-4 py-2 text-left hover:bg-[#1d1d1d] transition-colors"
                  >
                    中文
                  </button>
                </div>
              )}
            </div>
            {isConnected && (
              <button
                onClick={handleCheckIn}
                disabled={!canCheckIn}
                className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 transition-colors ${
                  canCheckIn
                    ? 'bg-[#0ea5e9] hover:bg-[#0284c7] text-white'
                    : 'bg-[#1d1d1d] text-gray-500 cursor-not-allowed'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <span className="hidden md:inline">
                  {canCheckIn ? t('header.checkIn') : t('header.alreadyCheckedIn')}
                </span>
              </button>
            )}
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
                      {isWhitelisted ? t('nft.mint.free') : '0.015 BNB'}
                    </span>
                  </div>
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
                  disabled={!isConnected || isMinting || !canMint || hasMinted}
                  className={`w-full rounded-xl py-4 px-6 flex items-center justify-center gap-3 text-lg font-semibold transition-colors ${
                    !isConnected || isMinting || !canMint || hasMinted
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
    </div>
  );
}

export default App;