pragma solidity ^0.5.0;

contract IMoloch {
  function members(address) public view returns (address, uint256, uint256, bool, uint256, uint256);
}
