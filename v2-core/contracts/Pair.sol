pragma solidity 0.8.28;

// import "./libraries/Math.sol";
// import "./libraries/UQ112x112.sol";

// import "./ERC20.sol";

// import "./interfaces/IUniswapV2Pair.sol";
// import "./interfaces/IERC20.sol";
// import "./interfaces/IUniswapV2Factory.sol";
// import "./interfaces/IUniswapV2Callee.sol";

import {IUniswapV2Pair} from "./interfaces/IUniswapV2Pair.sol";
import {ERC20} from "./ERC20.sol";
import {Math} from "./libraries/Math.sol";
import {UQ112x112} from "./libraries/UQ112x112.sol";
import {IERC20} from "./interfaces/IERC20.sol";
import {IUniswapV2Factory} from "./interfaces/IUniswapV2Factory.sol";
import {IUniswapV2Callee} from "./interfaces/IUniswapV2Callee.sol";


contract Pair is IUniswapV2Pair, ERC20 {
    using UQ112x112 for uint224;

    uint public constant MINIMUM_LIQUIDITY = 10**3;
    bytes4 private constant SELECTOR = bytes4(keccak256(bytes("transfer(address,uint256)")));
    
    address public factory;
    address public token0;
    address public token1;

    // x x y = k (x: reserve0, y: reserve1, k: kLast)
    uint112 private reserve0;
    uint112 private reserve1;
    uint public kLast;
    uint32 private blockTimestampLast;

    uint public price0CumulativeLast;
    uint public price1CumulativeLast;

    // Prevent reentrancy attacks
    uint private unlocked = 1;
    modifier lock() {
        require(unlocked == 1, "UniswapV2: LOCKED");
        unlocked = 0;
        _;
        unlocked = 1;
    }

    constructor() {
        factory = msg.sender;
    }

    // Called only once by the factory at time of deployment
    function initialize(address _token0, address _token1) external {
        require(msg.sender == factory, "UniswapV2: FORBIDDEN");

        token0 = _token0;
        token1 = _token1;
    }

    // abi.encodeWithSelector(SELECTOR, to, value) -> To safely call the function    
    // abi.encode -> Data encoding/packing
    // abi.encodeWithSelector -> Call the function at the low level    
    function _safeTransfer(address token, address to, uint value) private {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, to, value));
        // data.length == 0 -> For example: USDT (non-ERC20 token)
        // abi.decode(data, (bool)) -> Have returned data (ERC20-token)
        require(success && (data.length == 0 || abi.decode(data, (bool))), "UniswapV2: TRANSFER_FAILED");
    }

    function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }

    function _update(uint balance0, uint balance1, uint112 _reserve0, uint112 _reserve1) private {
        // Maximum token balnce is 2^112 - 1
        require(balance0 <= type(uint112).max && balance1 <= type(uint112).max, "UniswapV2: OVERFLOW");
        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        uint32 timeElapsed = blockTimestamp - blockTimestampLast;

        // Update accumulative price for token0 and token1
        if (timeElapsed > 0 && _reserve0 > 0 && _reserve1 > 0 ) {
            price0CumulativeLast += uint(UQ112x112.encode(_reserve1).uqdiv(_reserve0) * timeElapsed);
            price1CumulativeLast += uint(UQ112x112.encode(_reserve0).uqdiv(_reserve1) * timeElapsed);
        }

        // Update reserve0, reserve1, and blockTimestampLast
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = blockTimestamp;
        emit Sync(reserve0, reserve1);
    }


    // Calculate the amount of LP tokens to mint more for the feeTo address (Uniswap V2 protocol)
    // Read the equation in whitepaper 2.4 Protocol fee (s_m = \frac{\sqrt(k_2) - \sqrt(k_1)}{5 * \sqrt(k_2) + \sqrt(k_1)} * s_1)
    function _mintFee(uint112 _reserve0, uint112 _reserve1) private returns (bool feeOn) {
        address feeTo = IUniswapV2Factory(factory).feeTo();
        feeOn = feeTo != address(0);
        uint _kLast = kLast; // gas savings

        if (feeOn) {
            if (_kLast > 0) {
                uint rootK = Math.sqrt(uint(_reserve0 * _reserve1));
                uint rootKLast = Math.sqrt(_kLast);

                uint numerator = (rootK - rootKLast) * totalSupply;
                uint denominator = 5*rootK + rootKLast;
                uint LPTokenMintedMore = numerator / denominator;

                if (LPTokenMintedMore > 0) 
                    _mint(feeTo, LPTokenMintedMore);
            }
        }
        else if (_kLast != 0)
            kLast = 0;
    }

    
    function mint(address to) external lock returns (uint liquidity) {
        (uint112 _reserve0, uint112 _reserve1, ) = getReserves();
        uint balance0 = IERC20(token0).balanceOf(address(this));
        uint balance1 = IERC20(token1).balanceOf(address(this));

        // Calculate the amount of token0 and token1 to be added to the pool
        uint amount0 = balance0 - _reserve0;
        uint amount1 = balance1 - _reserve1;


        // Call _mintFee function when users deposit or withdraw the liquidity because it changes the ratio of token0 
        bool feeOn = _mintFee(_reserve0, _reserve1);
        uint _totalSupply = totalSupply;

        // Check if there are any liquidity tokens
        if (_totalSupply == 0) {
            // The first deposit => s_minted = \sqrt{amount0 * amount1} - MINIMUM_LIQUIDITY
            liquidity = Math.sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(address(0), MINIMUM_LIQUIDITY);
        }
        else {
            // The second deposit => s_minted = The min of \frac{amount0 * s_totalSupply}{_reserve0} or \frac{amount1 * s_totalSupply}{_reserve1}
            // Encourage users to deposit the correct ratio of token0 and token1
            liquidity = Math.min(amount0 * _totalSupply / _reserve0, amount1 * _totalSupply / _reserve1);
        }

        // Mint the liquidity token to liquidity provider
        require(liquidity > 0, "UniswapV2: INSUFFICIENT_LIQUIDITY_MINTED");
        _mint(to, liquidity);
        emit Mint(msg.sender, amount0, amount1);
        
        // Update reserve0, reserve1, kLast
        _update(balance0, balance1, _reserve0, _reserve1);
        if (feeOn) kLast = reserve0 * reserve1;
    }
    

    


}

