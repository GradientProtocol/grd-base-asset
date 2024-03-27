// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import {IUniswapV2Router02} from "./libs/uni.sol";

contract Gradient is ERC20, ERC20Burnable, AccessControl {
    struct LiquidityPairs {
        address router;
        address base;
    }

    bytes32 public constant AUX_ADMIN = keccak256("AUX_ADMIN");
    uint256 constant DIVISOR = 10_000;

    mapping(address => LiquidityPairs) public routerPairs;
    mapping(address => uint256) public lastTransferBlock;
    mapping(address => bool) public bypassCapable;

    bool private swapping;

    address payable public tributeHolder;

    uint256 public thresholdTimestamp = 0;
    uint256 public schnipperTribute = 3333;


    constructor() ERC20("Gradient", "GRAD") {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(AUX_ADMIN, msg.sender);

        _mint(msg.sender, 14000000 * 10 ** decimals());

        tributeHolder = payable(msg.sender);
    }

    function _transfer(address from, address recipient, uint256 amount) internal override {
        if (!bypassCapable[recipient] && !bypassCapable[from] && !swapping) {
            require(block.number > lastTransferBlock[from], "Only one transfer per block per address is allowed");
            lastTransferBlock[from] = block.number;

            if (block.timestamp <= thresholdTimestamp && routerPairs[recipient].router != address(0)) {

                uint schnipperTributeTotal = (amount * schnipperTribute) / DIVISOR;
                amount -= schnipperTributeTotal;

                super._transfer(from, address(this), schnipperTributeTotal);
                _swapTokensByPair(schnipperTributeTotal, recipient);
            }
        }

        super._transfer(from, recipient, amount);
    }

    function setBypass(address account, bool setting) public {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender) || hasRole(AUX_ADMIN, msg.sender), "Insufficient privileges");
        require(bypassCapable[account] != setting, "Account already at setting");
        bypassCapable[account] = setting;
    }

    function _swapTokensByPair(uint tokenAmount, address pair) private {
        swapping = true;

        LiquidityPairs memory currentPair = routerPairs[pair];

        address path1 = currentPair.base;
        IUniswapV2Router02 router = IUniswapV2Router02(currentPair.router);

        // generate the pair path of token from current pair
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = path1;

        _approve(address(this), address(router), tokenAmount);

        // make the swap
        router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
            tokenAmount,
            0, // accept any amount
            path,
            tributeHolder,
            block.timestamp
        );

        swapping = false;
    }

    function addPair(address pair, address router, address base) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender) || hasRole(AUX_ADMIN, msg.sender), "Insufficient privileges");

        routerPairs[pair].router = router;
        routerPairs[pair].base = base;
        bypassCapable[router] = true;
    }

    function setThreshold(uint _thresholdTimestamp) external {
        require(
          hasRole(DEFAULT_ADMIN_ROLE, msg.sender) ||
          hasRole(AUX_ADMIN, msg.sender)
          , "Insufficient privileges"
        );
        thresholdTimestamp = _thresholdTimestamp;
    }

    function setTribute(uint _schnipperTribute) external {
        require(
          hasRole(DEFAULT_ADMIN_ROLE, msg.sender) ||
          hasRole(AUX_ADMIN, msg.sender)
          , "Insufficient privileges"
        );
        schnipperTribute = _schnipperTribute;
    }


    function setFundingWallet(address payable _wallet) external onlyRole(DEFAULT_ADMIN_ROLE){
        tributeHolder = _wallet;
        bypassCapable[address(_wallet)] = true;
    }


    function rescueTokens(address recipient, address token, uint amount) public {
        require(
          hasRole(DEFAULT_ADMIN_ROLE, msg.sender)
          , "Insufficient privileges"
        );

        IERC20(token).transfer(recipient, amount);
    }

    function rescueEth(address payable recipient) public {
        require(
          hasRole(DEFAULT_ADMIN_ROLE, msg.sender)
          , "Insufficient privileges"
        );

        recipient.transfer(address(this).balance);
    }

}
