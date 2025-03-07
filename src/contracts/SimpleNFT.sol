// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SimpleNFT is ERC721, Ownable {
    uint256 private _nextTokenId;
    uint256 public constant MINT_PRICE = 0.01 ether;

    constructor() ERC721("SimpleNFT", "SNFT") Ownable(msg.sender) {}

    function mint() public payable {
        require(msg.value >= MINT_PRICE, "Insufficient payment");
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
    }

    function withdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}