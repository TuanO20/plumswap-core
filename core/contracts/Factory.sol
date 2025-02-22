pragma solidity 0.8.28;

import {IUniswapV2Factory} from "./interfaces/IUniswapV2Factory.sol";
import {IUniswapV2Pair} from "./interfaces/IUniswapV2Pair.sol";
import {Pair} from "./Pair.sol";


contract Factory is IUniswapV2Factory {
    bytes32 public constant PAIR_HASH = keccak256(type(Pair).creationCode);

    address public feeTo;
    address public feeToSetter;

    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    constructor(address _feeToSetter) {
        feeToSetter = _feeToSetter;
    }

    function allPairsLength() external view override returns (uint) {
        return allPairs.length;
    }

    function setFeeTo(address _feeTo) external override {
        require(msg.sender == feeToSetter, "UniswapV2: FORBIDDEN");
        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external override {
        require(msg.sender == feeToSetter, "UniswapV2: FORBIDDEN");
        feeToSetter = _feeToSetter;
    }

    function createPair(address tokenA, address tokenB) external override returns (address pair) {
        // Rearrange the order pair of tokens
        (address token0, address token1) = (tokenA <= tokenB) ? (tokenA, tokenB) : (tokenB, tokenA);

        require(token0 != address(0), "UniswapV2: ZERO_ADDRESS");
        require(token0 != token1, "UniswapV2: IDENTICAL_ADDRESSES");
        require(getPair[token0][token1] == address(0), "UniswapV2: PAIR_EXISTS"); 

        pair = address(new Pair {
            salt: keccak256(abi.encodePacked(token0, token1))
            }()
        );

        IUniswapV2Pair(pair).initialize(token0, token1);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        allPairs.push(pair);

        emit PairCreated(token0, token1, pair, allPairs.length);
    }
}

