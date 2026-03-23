// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title InvoiceFactory
/// @notice Registers and tracks invoice lifecycle on-chain for TradeFlow
contract InvoiceFactory {
    address public owner;
    address public lendingPool;

    struct InvoiceRecord {
        string invoiceId;
        address borrower;
        uint256 faceValue;
        uint256 advanceAmount;
        uint256 dueDate;
        uint256 feePercent;
        bool advanced;
        bool repaid;
        bool defaulted;
    }

    mapping(string => InvoiceRecord) public invoices;
    mapping(address => bool) public authorizedFactors;
    string[] public allInvoiceIds;

    event InvoiceRegistered(string invoiceId, address borrower, uint256 faceValue);
    event InvoiceAdvanced(string invoiceId, uint256 amount);
    event InvoiceRepaid(string invoiceId);
    event InvoiceDefaulted(string invoiceId);
    event FactorAuthorized(address factor);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyFactor() {
        require(authorizedFactors[msg.sender], "Not factor");
        _;
    }

    constructor(address _pool) {
        owner = msg.sender;
        lendingPool = _pool;
    }

    function authorizeFactor(address f) external onlyOwner {
        authorizedFactors[f] = true;
        emit FactorAuthorized(f);
    }

    function registerInvoice(
        string calldata invoiceId,
        address borrower,
        uint256 faceValue,
        uint256 dueDate
    ) external onlyFactor {
        require(bytes(invoices[invoiceId].invoiceId).length == 0, "Already exists");
        invoices[invoiceId] = InvoiceRecord(
            invoiceId, borrower, faceValue, 0, dueDate, 0,
            false, false, false
        );
        allInvoiceIds.push(invoiceId);
        emit InvoiceRegistered(invoiceId, borrower, faceValue);
    }

    function markAdvanced(
        string calldata id,
        uint256 amt,
        uint256 fee
    ) external onlyFactor {
        require(bytes(invoices[id].invoiceId).length != 0, "Not found");
        require(!invoices[id].advanced, "Already advanced");
        invoices[id].advanced = true;
        invoices[id].advanceAmount = amt;
        invoices[id].feePercent = fee;
        emit InvoiceAdvanced(id, amt);
    }

    function markRepaid(string calldata id) external onlyFactor {
        require(bytes(invoices[id].invoiceId).length != 0, "Not found");
        require(invoices[id].advanced, "Not advanced");
        require(!invoices[id].repaid, "Already repaid");
        invoices[id].repaid = true;
        emit InvoiceRepaid(id);
    }

    function markDefaulted(string calldata id) external onlyOwner {
        require(bytes(invoices[id].invoiceId).length != 0, "Not found");
        invoices[id].defaulted = true;
        emit InvoiceDefaulted(id);
    }

    function getInvoice(string calldata id) external view returns (InvoiceRecord memory) {
        return invoices[id];
    }

    function count() external view returns (uint256) {
        return allInvoiceIds.length;
    }
}
