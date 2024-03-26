// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, ERC20Burnable, ERC20Permit, Ownable {
    constructor()
        ERC20("Gradient", "GRAD")
        ERC20Permit("Gradient")
        Ownable(msg.sender)
    {
        _mint(msg.sender, 14000000 * 10 ** decimals());
    }
}
