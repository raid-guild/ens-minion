pragma solidity ^0.5.0;

contract Registrar {
  function approve(address to, uint256 tokenId) public;
  function transferFrom(address from, address to, uint256 tokenId) public;
  function ownerOf(uint256 tokenId) public view returns (address owner);
  function reclaim(uint256 id, address owner) external;
}
