pragma solidity 0.8.28;

import "./libraries/Math.sol";
import "./libraries/UQ112x112.sol";

import "./ERC20.sol";

import "./interfaces/IUniswapV2Pair.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IUniswapV2Factory.sol";
import "./interfaces/IUniswapV2Callee.sol";


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
    modifier Lock() {
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

    //function _update()


    // Calculate the amount of LP tokens to mint more for the feeTo address (Uniswap V2 protocol)
    function _mintFee(uint112 _reserve0, uint112 _reserve1) private returns (bool feeOn) {
        address feeTo = IUniswapV2Factory(factory).feeTo();
        feeOn = feeTo != address(0);
        uint _kLast = kLast; // gas savings

        if (feeOn) {
            if (_kLast > 0) {
                uint rootK = Math.sqrt(uint(_reserve0 * _reserve1));
                uint rootKLast = Math.sqrt(_kLast);

                uint numerator = (rootK - rootKLast) * totalSupply;
                uint denominator = 5*rootK + rootLast;
                uint LPTokenMintedMore = numerator / denominator;

                if (LPTokenMintedMore > 0) 
                    _mint(feeTo, LPTokenMintedMore);
            }
        }
        else if (_kLast != 0)
            kLast = 0;
    }

    
    

    


}