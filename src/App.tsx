import React, { useState, useEffect } from 'react';
import { BrowserProvider, Contract, parseEther, Signer } from 'ethers';
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
const DAILY_CHECKIN_CONTRACT_ADDRESS = "0x7eE7e02aB3C684bBF4935859dca1b3Bc07cD890B";
const CHECKIN_API_URL = "https://checkin.saigo.dev/api/check-in-data";

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
  }
];

//  主网
// const BSC_NETWORK = {
//   chainId: '0x38',
//   chainName: 'BNB Smart Chain',
//   nativeCurrency: {
//     name: 'BNB',
//     symbol: 'BNB',
//     decimals: 18
//   },
//   rpcUrls: ['https://bsc-dataseed.binance.org/'],
//   blockExplorerUrls: ['https://bscscan.com']
// };

// 测试网
const BSC_NETWORK = {
  chainId: '0x61',
  chainName: 'BNB Smart Chain Testnet',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18
  },
  rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
  blockExplorerUrls: ['https://testnet.bscscan.com']
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
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInPeriodActive, setCheckInPeriodActive] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);

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
      console.log('Connected wallet changed, checking contract status...');
      checkContractAndUpdateStatus();
      checkCheckInStatus();
    }
  }, [isConnected, address, currentNetwork]);

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
          
          const hasMintedResult = await nftContract.hasMinted(address);
          setHasMinted(hasMintedResult);
          
          const balanceResult = await nftContract.balanceOf(address);
          setNftBalance(Number(balanceResult));
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
        
        if (isActive) {
          // Check if user has already checked in today
          const hasCheckedIn = await checkInContract.hasCheckedInToday(address);
          console.log('Has checked in today:', hasCheckedIn);
          setCanCheckIn(!hasCheckedIn);
          
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

  const connectWallet = async () => {
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
      setError(t('nft.errors.noWallet'));
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
          throw new Error('Failed to switch to BSC testnet');
        }
      }
      
      // Check contract state first
      const signer = await provider.getSigner();
      const checkInContract = new Contract(DAILY_CHECKIN_CONTRACT_ADDRESS, DAILY_CHECKIN_ABI, signer);
      
      // Check if check-in period is active
      const isActive = await checkInContract.isCheckInPeriodActive();
      if (!isActive) {
        throw new Error('Check-in period is not active');
      }
      
      // Check if user has already checked in today
      const hasCheckedIn = await checkInContract.hasCheckedInToday(address);
      if (hasCheckedIn) {
        throw new Error('Already checked in today');
      }
      
      // Get signature from the server with a fresh request
      const signatureUrl = `${CHECKIN_API_URL}?address=${address}`;
      
      console.log('Fetching signature from:', signatureUrl);
      const response = await fetch(signatureUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to get signature from server: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Signature data:', data);
      
      if (!data.signature || !data.ipAddress || !data.timestamp) {
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
      const ipAddress = String(data.ipAddress);
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
        ipAddress,
        timestamp: timestamp.toString(),
        signatureBytes
      });
      
      // First test the check-in to get detailed error information
      console.log('Testing check-in before actual submission...');
      try {
        const testResult = await checkInContract.testCheckIn(
          ipAddress,
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
      const gasLimit = 1000000;
      
      // Call the contract with hex decoded signature
      const tx = await checkInContract.checkIn(
        ipAddress,
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
    const displayConsecutiveCheckins = isConnected ? consecutiveCheckins : 0;
    
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
          <div className="text-center text-gray-400">
            <p className="mb-2">{t('nft.preview.progress', { count: displayConsecutiveCheckins })}</p>
            <p className="text-sm">
              {!isConnected && t('nft.preview.connectWalletFirst')}
              {isConnected && displayConsecutiveCheckins === 0 && t('nft.preview.firstCheckIn')}
              {isConnected && displayConsecutiveCheckins === 1 && t('nft.preview.secondCheckIn')}
              {isConnected && displayConsecutiveCheckins === 2 && t('nft.preview.thirdCheckIn')}
              {isConnected && displayConsecutiveCheckins === 3 && t('nft.preview.completed')}
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
            {!checkInPeriodActive && isConnected && (
              <p className="mt-2 text-xs text-yellow-500">
                {t('nft.preview.checkInPeriodInactive')}
              </p>
            )}
            {isConnected && currentNetwork !== BSC_NETWORK.chainId && (
              <div className="mt-4">
                <p className="text-xs text-yellow-500 mb-2">
                  {t('nft.preview.wrongNetwork')}
                </p>
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
                    <span className={`px-2 py-1 rounded-full text-xs ${canCheckIn && checkInPeriodActive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                      {!checkInPeriodActive 
                        ? t('nft.checkIn.periodInactive')
                        : canCheckIn 
                          ? t('nft.checkIn.available') 
                          : t('nft.checkIn.unavailable')}
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
                  {currentNetwork !== BSC_NETWORK.chainId && (
                    <div className="flex justify-between items-center text-yellow-500">
                      <span>{t('nft.checkIn.network')}</span>
                      <span>{t('nft.checkIn.wrongNetwork')}</span>
                    </div>
                  )}
                  <div className="pt-2">
                    <button
                      onClick={handleCheckIn}
                      disabled={!canCheckIn || isCheckingIn || currentNetwork !== BSC_NETWORK.chainId || !checkInPeriodActive}
                      className={`w-full py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                        canCheckIn && !isCheckingIn && currentNetwork === BSC_NETWORK.chainId && checkInPeriodActive
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