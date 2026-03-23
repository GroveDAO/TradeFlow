// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title LendingPool
/// @notice USDC-H lending pool for TradeFlow invoice advances with interest accrual
contract LendingPool is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    address public owner;
    address public invoiceFactory;

    uint256 public constant LIQUIDATION_THRESHOLD = 8000; // 80% in bps
    uint256 public constant INTEREST_RATE_PER_SECOND = 3170979198; // ~10% APY in 1e18
    uint256 public constant PRECISION = 1e18;
    uint256 public constant BASIS_POINTS = 10000;

    struct Deposit {
        uint256 amount;
        uint256 shareTokens;
        uint256 depositedAt;
    }

    struct Loan {
        address borrower;
        uint256 principal;
        uint256 startTime;
        uint256 feePercent; // annualized bps
        bool repaid;
    }

    mapping(address => Deposit) public deposits;
    mapping(string => Loan) public loans;

    uint256 public totalDeposited;
    uint256 public totalBorrowed;
    uint256 public totalShares;

    event Deposited(address indexed user, uint256 amount, uint256 shares);
    event Withdrawn(address indexed user, uint256 amount);
    event Borrowed(string indexed invoiceId, address borrower, uint256 amount);
    event Repaid(string indexed invoiceId, uint256 totalRepaid);
    event Liquidated(string indexed invoiceId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyFactory() {
        require(msg.sender == invoiceFactory, "Not factory");
        _;
    }

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
        owner = msg.sender;
    }

    function setInvoiceFactory(address _factory) external onlyOwner {
        invoiceFactory = _factory;
    }

    /// @notice LP deposits USDC-H to earn yield
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        uint256 shares = totalShares == 0 || totalDeposited == 0
            ? amount
            : (amount * totalShares) / totalDeposited;

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        deposits[msg.sender].amount += amount;
        deposits[msg.sender].shareTokens += shares;
        deposits[msg.sender].depositedAt = block.timestamp;

        totalDeposited += amount;
        totalShares += shares;

        emit Deposited(msg.sender, amount, shares);
    }

    /// @notice LP withdraws their share + accrued yield
    function withdraw(uint256 shareAmount) external nonReentrant {
        Deposit storage dep = deposits[msg.sender];
        require(dep.shareTokens >= shareAmount, "Insufficient shares");

        uint256 redeemAmount = (shareAmount * totalDeposited) / totalShares;
        require(totalDeposited - totalBorrowed >= redeemAmount, "Insufficient liquidity");

        dep.shareTokens -= shareAmount;
        dep.amount = dep.amount >= redeemAmount ? dep.amount - redeemAmount : 0;
        totalShares -= shareAmount;
        totalDeposited -= redeemAmount;

        usdc.safeTransfer(msg.sender, redeemAmount);
        emit Withdrawn(msg.sender, redeemAmount);
    }

    /// @notice Borrow USDC-H for an invoice advance (called by invoiceFactory)
    function borrow(
        string calldata invoiceId,
        address borrower,
        uint256 amount,
        uint256 feePercent
    ) external onlyFactory nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(totalDeposited - totalBorrowed >= amount, "Insufficient liquidity");
        require(
            (totalBorrowed + amount) * BASIS_POINTS <= totalDeposited * LIQUIDATION_THRESHOLD,
            "Exceeds liquidation threshold"
        );
        require(!loans[invoiceId].repaid, "Already exists");
        require(loans[invoiceId].principal == 0, "Loan exists");

        loans[invoiceId] = Loan({
            borrower: borrower,
            principal: amount,
            startTime: block.timestamp,
            feePercent: feePercent,
            repaid: false
        });
        totalBorrowed += amount;

        usdc.safeTransfer(borrower, amount);
        emit Borrowed(invoiceId, borrower, amount);
    }

    /// @notice Repay an invoice advance with fees
    function repay(string calldata invoiceId) external nonReentrant {
        Loan storage loan = loans[invoiceId];
        require(loan.principal > 0, "Loan not found");
        require(!loan.repaid, "Already repaid");

        uint256 elapsed = block.timestamp - loan.startTime;
        uint256 interest = (loan.principal * loan.feePercent * elapsed) / (BASIS_POINTS * 365 days);
        uint256 total = loan.principal + interest;

        loan.repaid = true;
        totalBorrowed -= loan.principal;
        totalDeposited += interest; // interest accrues to pool

        usdc.safeTransferFrom(msg.sender, address(this), total);
        emit Repaid(invoiceId, total);
    }

    /// @notice Liquidate a defaulted invoice loan
    function liquidate(string calldata invoiceId) external onlyOwner {
        Loan storage loan = loans[invoiceId];
        require(loan.principal > 0, "Loan not found");
        require(!loan.repaid, "Already repaid");

        uint256 loss = loan.principal;
        loan.repaid = true;
        totalBorrowed -= loss;
        if (totalDeposited >= loss) {
            totalDeposited -= loss;
        } else {
            totalDeposited = 0;
        }
        emit Liquidated(invoiceId);
    }

    function getLoan(string calldata invoiceId) external view returns (Loan memory) {
        return loans[invoiceId];
    }

    function getDeposit(address user) external view returns (Deposit memory) {
        return deposits[user];
    }

    function getUtilizationRate() external view returns (uint256) {
        if (totalDeposited == 0) return 0;
        return (totalBorrowed * BASIS_POINTS) / totalDeposited;
    }

    function availableLiquidity() external view returns (uint256) {
        return totalDeposited - totalBorrowed;
    }
}
