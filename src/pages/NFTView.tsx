import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { BrowserProvider, Contract } from 'ethers';
import { ArrowLeft, ExternalLink, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// NFT Contract ABI (only the functions we need)
const NFT_CONTRACT_ABI = [
  {
    "inputs": [{"name": "owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "owner", "type": "address"}, {"name": "index", "type": "uint256"}],
    "name": "tokenOfOwnerByIndex",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "tokenId", "type": "uint256"}],
    "name": "tokenURI",
    "outputs": [{"name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const NFT_CONTRACT_ADDRESS = "0xd3F43706349B2a3dCDd0D4A5aD67626180388871"; // Main net NFT contract

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: {
    trait_type: string;
    value: string;
  }[];
}

const NFTView: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const address = searchParams.get('address');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState<number | null>(null);
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchNFTData = async () => {
      if (!address) {
        setError(t('nft.view.noAddressProvided'));
        setLoading(false);
        return;
      }

      console.log("ready to fetch NFT data for address: " + address);

      try {
        // Check if window.ethereum is available
        if (!window.ethereum) {
          setError(t('nft.view.noWalletDetected'));
          setLoading(false);
          return;
        }

        const provider = new BrowserProvider(window.ethereum);
        const nftContract = new Contract(NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI, provider);

        // Get token IDs owned by the address
        let firstTokenId = null;
        try {
          // Get balance of NFTs owned by this address
          const balance = await nftContract.balanceOf(address);
          console.log("token balance: " + balance);
          
          if (Number(balance) === 0) {
            setError(t('nft.view.noNFTsFound'));
            setLoading(false);
            return;
          }
          
          // TODO:仅显示第一个 NFT
          // Get the first token ID (index 0)
          firstTokenId = await nftContract.tokenOfOwnerByIndex(address, 0);
          setTokenId(Number(firstTokenId));
          console.log("firstTokenId: " + firstTokenId);
        } catch (e) {
          console.error("Error fetching NFT tokens:", e);
          setError(t('nft.view.errorFetchingTokens'));
          setLoading(false);
          return;
        }

        // Check if firstTokenId is null or undefined, not if it's falsy (0 is a valid token ID)
        if (firstTokenId === null || firstTokenId === undefined) {
          setError(t('nft.view.noNFTsFound'));
          setLoading(false);
          console.log("noNFTsFound");   
          return;
        }

        // Use firstTokenId if available, otherwise use the state tokenId
        const tokenIdToUse = firstTokenId !== null ? Number(firstTokenId) : tokenId;
        console.log("tokenId to use: " + tokenIdToUse);

        if (tokenIdToUse === null || tokenIdToUse === undefined) {
          setError(t('nft.view.noNFTsFound'));
          setLoading(false);
          return;
        }

        // Get token URI
        const tokenURI = await nftContract.tokenURI(tokenIdToUse);

        console.log("tokenURI: " + tokenURI);
        
        // Fetch metadata from the token URI
        const response = await fetch(tokenURI);
        if (!response.ok) {
          throw new Error(`Failed to fetch metadata: ${response.status}`);
        }
        
        const metadataJson = await response.json();
        console.log("metadataJson: " + metadataJson.name);
        setMetadata(metadataJson);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching NFT data:', err);
        setError(t('nft.view.errorFetchingData'));
        setLoading(false);
      }
    };

    fetchNFTData();
  }, [address, t]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030014] text-white flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#030014] text-white p-8">
        <div className="max-w-4xl mx-auto">
          <Link to="/" className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-8">
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('nft.view.backToHome')}
          </Link>
          
          <div className="bg-[#0a0a0a] rounded-2xl p-8 border border-[#1d1d1d]">
            <h1 className="text-2xl font-bold text-red-400 mb-4">{t('nft.view.error')}</h1>
            <p className="text-gray-300">{error}</p>
            
            <div className="mt-8">
              <Link 
                to="/"
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg inline-flex items-center transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                {t('nft.view.backToHome')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030014] text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <Link to="/" className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-8">
          <ArrowLeft className="w-5 h-5 mr-2" />
          {t('nft.view.backToHome')}
        </Link>
        
        {metadata && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* NFT Image */}
            <div className="bg-[#0a0a0a] rounded-2xl overflow-hidden border border-[#1d1d1d] p-4">
              <div className="aspect-square rounded-xl overflow-hidden">
                <img 
                  src={metadata.image} 
                  alt={metadata.name} 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            
            {/* NFT Details */}
            <div className="bg-[#0a0a0a] rounded-2xl border border-[#1d1d1d] p-6 md:p-8">
              <h1 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                {metadata.name}
              </h1>
              
              <div className="flex items-center gap-2 mb-6">
                <span className="text-sm text-gray-400">Token ID: {tokenId !== null && tokenId !== undefined ? tokenId : ''}</span>
                <button 
                  onClick={() => copyToClipboard(String(tokenId !== null && tokenId !== undefined ? tokenId : ''))}
                  className="text-gray-400 hover:text-blue-400"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">{t('nft.view.description')}</h2>
                <p className="text-gray-300">{metadata.description}</p>
              </div>
              
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-4">{t('nft.view.attributes')}</h2>
                <div className="grid grid-cols-2 gap-4">
                  {metadata.attributes.map((attr, index) => (
                    <div 
                      key={index} 
                      className="bg-[#1d1d1d] rounded-lg p-4 border border-[#2d2d2d]"
                    >
                      <p className="text-sm text-gray-400 mb-1">{attr.trait_type}</p>
                      <p className="font-semibold text-blue-400">{attr.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="border-t border-[#1d1d1d] pt-6">
                <h2 className="text-lg font-semibold mb-4">{t('nft.view.details')}</h2>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('nft.view.contract')}</span>
                    <a 
                      href={`https://bscscan.com/token/${NFT_CONTRACT_ADDRESS}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 flex items-center"
                    >
                      {`${NFT_CONTRACT_ADDRESS.slice(0, 6)}...${NFT_CONTRACT_ADDRESS.slice(-4)}`}
                      <ExternalLink className="w-4 h-4 ml-1" />
                    </a>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('nft.view.owner')}</span>
                    <a 
                      href={`https://bscscan.com/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 flex items-center"
                    >
                      {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
                      <ExternalLink className="w-4 h-4 ml-1" />
                    </a>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('nft.view.blockchain')}</span>
                    <span>BNB Smart Chain</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NFTView; 