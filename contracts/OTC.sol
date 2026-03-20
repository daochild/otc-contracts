// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import "./interfaces/IWETH.sol";

/// @title OTC — Decentralized peer-to-peer token trading
/// @notice Permissionless ERC-20 and ETH/WETH swaps with partial fills and deadlines.
///         No intermediary: creator deposits giveToken upfront; filler settles atomically.
contract OTC is Context, ReentrancyGuardTransient {
	using SafeERC20 for IERC20;

	// ─── Errors ──────────────────────────────────────────────────────────────

	error ZeroAddress();
	error InvalidToken(address token);
	error SameToken();
	error ZeroAmount();
	error AmountTooLarge(uint256 amount);
	error InvalidDeadline(uint256 deadline);
	error DeadlineTooLarge(uint256 deadline);
	error TradeNotFound(uint256 id);
	error TradeExpired(uint256 id);
	error TradeNotETH(uint256 id);
	error NotTradeOwner(uint256 id, address caller);
	error RefundFailed(address recipient, uint256 amount);

	// ─── Types ───────────────────────────────────────────────────────────────

	struct TradeConfig {
		address creator;
		uint64 timeout;
		address giveToken;
		address wantToken;
		uint128 giveAmount;
		uint128 wantAmount;
	}

	struct TradeState {
		uint128 remainingWantAmount;
		uint128 remainingGiveAmount;
	}

	// ─── State ───────────────────────────────────────────────────────────────

	uint256 public totalTrades;
	address internal immutable _weth;
	mapping(uint256 => TradeConfig) internal _tradeConfigs;
	mapping(uint256 => TradeState) internal _tradeStates;

	// ─── Events ──────────────────────────────────────────────────────────────

	event TradeCreated(address indexed from, uint256 indexed tradeID, uint256 deadline);
	event TradePartiallyFilled(address indexed from, uint256 indexed tradeID, IERC20 giveToken, uint256 giveAmount, IERC20 wantToken, uint256 wantAmount);
	event TradeFullyFilled(address indexed from, uint256 indexed tradeID, IERC20 giveToken, uint256 giveAmount, IERC20 wantToken, uint256 wantAmount);
	event TradeCancelled(address indexed from, uint256 indexed tradeID);

	// ─── Constructor ─────────────────────────────────────────────────────────

	constructor(address _WETH) {
		if (_WETH == address(0)) revert ZeroAddress();
		_weth = _WETH;
	}

	function trades(uint256 _id)
		public
		view
		returns (
			address creator,
			uint256 remainingWantAmount,
			uint256 remainingGiveAmount,
			address giveToken,
			uint256 giveAmount,
			address wantToken,
			uint256 wantAmount,
			uint256 timeout
		)
	{
		TradeConfig storage config = _tradeConfigs[_id];
		TradeState storage state = _tradeStates[_id];

		return (
			config.creator,
			state.remainingWantAmount,
			state.remainingGiveAmount,
			config.giveToken,
			config.giveAmount,
			config.wantToken,
			config.wantAmount,
			config.timeout
		);
	}

	// ─── External / Public ───────────────────────────────────────────────────

	/// @notice Creates an ERC-20 ↔ ERC-20 trade. Creator's `_giveAmount` is escrowed immediately.
	/// @param _giveToken  Token the creator deposits and the filler will receive.
	/// @param _giveAmount Amount of `_giveToken` escrowed.
	/// @param _wantToken  Token the creator wants in return.
	/// @param _wantAmount Total amount of `_wantToken` requested.
	/// @param _deadline   Unix timestamp after which the trade cannot be filled.
	/// @return id         The assigned trade ID.
	function createTrade(
		IERC20 _giveToken,
		uint256 _giveAmount,
		IERC20 _wantToken,
		uint256 _wantAmount,
		uint256 _deadline
	) public nonReentrant returns (uint256 id) {
		if (address(_giveToken) == address(0)) revert InvalidToken(address(_giveToken));
		if (address(_wantToken) == address(0)) revert InvalidToken(address(_wantToken));
		if (address(_giveToken) == address(_wantToken)) revert SameToken();
		if (_giveAmount == 0 || _wantAmount == 0) revert ZeroAmount();
		if (_deadline <= block.timestamp) revert InvalidDeadline(_deadline);
		if (_giveAmount > type(uint128).max) revert AmountTooLarge(_giveAmount);
		if (_wantAmount > type(uint128).max) revert AmountTooLarge(_wantAmount);
		if (_deadline > type(uint64).max) revert DeadlineTooLarge(_deadline);

		_giveToken.safeTransferFrom(_msgSender(), address(this), _giveAmount);

		id = ++totalTrades;
		_tradeConfigs[id] = TradeConfig(
			_msgSender(),
			uint64(_deadline),
			address(_giveToken),
			address(_wantToken),
			uint128(_giveAmount),
			uint128(_wantAmount)
		);
		_tradeStates[id] = TradeState(uint128(_wantAmount), uint128(_giveAmount));
		emit TradeCreated(_msgSender(), id, _deadline);
	}

	/// @notice Creates an ETH → ERC-20 trade. Raw ETH is wrapped to WETH internally.
	/// @param _wantToken  Token the creator wants in return (must not be WETH).
	/// @param _wantAmount Total amount of `_wantToken` requested.
	/// @param _deadline   Unix timestamp after which the trade cannot be filled.
	/// @return id         The assigned trade ID.
	function createTradeFromETH(
		IERC20 _wantToken,
		uint256 _wantAmount,
		uint256 _deadline
	) public payable nonReentrant returns (uint256 id) {
		uint256 _giveAmount = msg.value;

		if (address(_wantToken) == address(0) || address(_wantToken) == _weth)
			revert InvalidToken(address(_wantToken));
		if (msg.value == 0 || _wantAmount == 0) revert ZeroAmount();
		if (_deadline <= block.timestamp) revert InvalidDeadline(_deadline);
		if (_giveAmount > type(uint128).max) revert AmountTooLarge(_giveAmount);
		if (_wantAmount > type(uint128).max) revert AmountTooLarge(_wantAmount);
		if (_deadline > type(uint64).max) revert DeadlineTooLarge(_deadline);

		IWETH(_weth).deposit{value: _giveAmount}();

		id = ++totalTrades;
		_tradeConfigs[id] = TradeConfig(
			_msgSender(),
			uint64(_deadline),
			_weth,
			address(_wantToken),
			uint128(_giveAmount),
			uint128(_wantAmount)
		);
		_tradeStates[id] = TradeState(uint128(_wantAmount), uint128(_giveAmount));
		emit TradeCreated(_msgSender(), id, _deadline);
	}

	/// @notice Fills a trade partially or fully.
	///         Filler provides `_fillAmount` of `wantToken`; receives pro-rata `giveToken`.
	///         If `_fillAmount` exceeds the remaining want, it is silently capped.
	/// @param _id         Trade ID to fill.
	/// @param _fillAmount Desired amount of `wantToken` to provide.
	function fillTrade(uint256 _id, uint256 _fillAmount) public nonReentrant {
		TradeConfig storage config = _tradeConfigs[_id];
		TradeState storage state = _tradeStates[_id];

		// Checks
		if (config.creator == address(0)) revert TradeNotFound(_id);
		if (_fillAmount == 0) revert ZeroAmount();
		if (config.timeout <= block.timestamp) revert TradeExpired(_id);

		uint256 remainingWantAmount = state.remainingWantAmount;
		if (_fillAmount > remainingWantAmount) {
			_fillAmount = remainingWantAmount;
		}

		uint256 sold = (_fillAmount == remainingWantAmount)
			? state.remainingGiveAmount
			: _fillAmount * uint256(config.giveAmount) / uint256(config.wantAmount);

		// Cache before effects (storage is cleared on full fill)
		IERC20 giveToken = IERC20(config.giveToken);
		IERC20 wantToken = IERC20(config.wantToken);
		address creator = config.creator;

		// Effects
		unchecked {
			state.remainingWantAmount -= uint128(_fillAmount);
			state.remainingGiveAmount -= uint128(sold);
		}

		bool isFull = state.remainingWantAmount == 0;
		if (isFull) {
			delete _tradeStates[_id];
			delete _tradeConfigs[_id];
		}

		// Interactions
		wantToken.safeTransferFrom(_msgSender(), creator, _fillAmount);
		giveToken.safeTransfer(_msgSender(), sold);

		if (isFull) {
			emit TradeFullyFilled(_msgSender(), _id, giveToken, sold, wantToken, _fillAmount);
		} else {
			emit TradePartiallyFilled(_msgSender(), _id, giveToken, sold, wantToken, _fillAmount);
		}
	}

	/// @notice Fills a WETH-want trade using raw ETH.
	///         ETH is wrapped to WETH, creator receives WETH, filler receives `giveToken`.
	///         Overfill is refunded automatically.
	/// @param _id Trade ID to fill. The trade's `wantToken` must equal WETH.
	function fillTradeInETH(uint256 _id) public payable nonReentrant {
		TradeConfig storage config = _tradeConfigs[_id];
		TradeState storage state = _tradeStates[_id];
		uint256 _fillAmount = msg.value;

		// Checks
		if (config.creator == address(0)) revert TradeNotFound(_id);
		if (msg.value == 0) revert ZeroAmount();
		if (config.timeout <= block.timestamp) revert TradeExpired(_id);
		if (config.wantToken != _weth) revert TradeNotETH(_id);

		uint256 refund;
		uint256 remainingWantAmount = state.remainingWantAmount;
		if (_fillAmount > remainingWantAmount) {
			refund = _fillAmount - remainingWantAmount;
			_fillAmount = remainingWantAmount;
		}

		uint256 sold = (_fillAmount == remainingWantAmount)
			? state.remainingGiveAmount
			: _fillAmount * uint256(config.giveAmount) / uint256(config.wantAmount);

		// Cache before effects (storage is cleared on full fill)
		IERC20 giveToken = IERC20(config.giveToken);
		IERC20 wantToken = IERC20(config.wantToken);
		address creator = config.creator;

		// Effects
		unchecked {
			state.remainingWantAmount -= uint128(_fillAmount);
			state.remainingGiveAmount -= uint128(sold);
		}

		bool isFull = state.remainingWantAmount == 0;
		if (isFull) {
			delete _tradeStates[_id];
			delete _tradeConfigs[_id];
		}

		// Interactions: wrap ETH, settle tokens, refund excess
		IWETH(_weth).deposit{value: _fillAmount}();
		wantToken.safeTransfer(creator, _fillAmount);
		giveToken.safeTransfer(_msgSender(), sold);

		if (refund > 0) {
			(bool success,) = payable(_msgSender()).call{value: refund}("");
			if (!success) revert RefundFailed(_msgSender(), refund);
		}

		if (isFull) {
			emit TradeFullyFilled(_msgSender(), _id, giveToken, sold, wantToken, _fillAmount);
		} else {
			emit TradePartiallyFilled(_msgSender(), _id, giveToken, sold, wantToken, _fillAmount);
		}
	}

	/// @notice Cancels an active trade. Only the creator may cancel.
	///         Unfilled `giveToken` is returned to the creator.
	/// @param _id Trade ID to cancel.
	function cancelTrade(uint256 _id) public nonReentrant {
		TradeConfig memory config = _tradeConfigs[_id];
		TradeState memory state = _tradeStates[_id];

		// Checks
		if (config.creator == address(0)) revert TradeNotFound(_id);
		if (config.creator != _msgSender()) revert NotTradeOwner(_id, _msgSender());

		// Effects before interactions — prevents double-withdrawal via ERC20 reentrancy
		delete _tradeStates[_id];
		delete _tradeConfigs[_id];

		// Interactions
		IERC20(config.giveToken).safeTransfer(_msgSender(), state.remainingGiveAmount);
		emit TradeCancelled(_msgSender(), _id);
	}

	/// @notice Cancels multiple active trades owned by the caller.
	/// @param _ids Trade IDs to cancel.
	function cancelTrades(uint256[] calldata _ids) external nonReentrant {
		uint256 length = _ids.length;
		for (uint256 i; i < length; ++i) {
			uint256 id = _ids[i];
			TradeConfig memory config = _tradeConfigs[id];
			TradeState memory state = _tradeStates[id];

			if (config.creator == address(0)) revert TradeNotFound(id);
			if (config.creator != _msgSender()) revert NotTradeOwner(id, _msgSender());

			delete _tradeStates[id];
			delete _tradeConfigs[id];

			IERC20(config.giveToken).safeTransfer(_msgSender(), state.remainingGiveAmount);
			emit TradeCancelled(_msgSender(), id);
		}
	}

	/// @notice Returns the WETH contract address used by this OTC instance.
	function WETH() public view returns (address) {
		return _weth;
	}
}
