// SPDX-License-Identifier: MIT

// To call the internal function _mint() of ERC20 contract to test
// ERC20.spec.ts will test this file
pragma solidity 0.8.28;

import {ERC20} from '../ERC20.sol';

contract TestERC20 is ERC20 {
        constructor(uint _totalSupply) {
                _mint(msg.sender, _totalSupply);
        }
}