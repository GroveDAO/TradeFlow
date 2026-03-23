import { expect } from "chai";
import { ethers } from "hardhat";
import { InvoiceFactory, LendingPool } from "../typechain-types";

describe("InvoiceFactory", function () {
  let factory: InvoiceFactory;
  let pool: LendingPool;
  let owner: Awaited<ReturnType<typeof ethers.getSigners>>[0];
  let factor: Awaited<ReturnType<typeof ethers.getSigners>>[0];
  let borrower: Awaited<ReturnType<typeof ethers.getSigners>>[0];

  beforeEach(async function () {
    [owner, factor, borrower] = await ethers.getSigners();

    // Deploy a mock ERC20 for the pool
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);

    const LendingPool = await ethers.getContractFactory("LendingPool");
    pool = await LendingPool.deploy(await usdc.getAddress());

    const InvoiceFactory = await ethers.getContractFactory("InvoiceFactory");
    factory = await InvoiceFactory.deploy(await pool.getAddress());
  });

  it("should deploy with correct owner", async function () {
    expect(await factory.owner()).to.equal(owner.address);
    expect(await factory.lendingPool()).to.equal(await pool.getAddress());
  });

  it("should authorize a factor", async function () {
    await factory.authorizeFactor(factor.address);
    expect(await factory.authorizedFactors(factor.address)).to.be.true;
  });

  it("should not allow non-owner to authorize factor", async function () {
    await expect(
      factory.connect(factor).authorizeFactor(borrower.address)
    ).to.be.revertedWith("Not owner");
  });

  it("should register an invoice", async function () {
    await factory.authorizeFactor(factor.address);
    const dueDate = Math.floor(Date.now() / 1000) + 30 * 86400;

    await factory
      .connect(factor)
      .registerInvoice("INV-001", borrower.address, ethers.parseUnits("10000", 6), dueDate);

    const inv = await factory.getInvoice("INV-001");
    expect(inv.invoiceId).to.equal("INV-001");
    expect(inv.borrower).to.equal(borrower.address);
    expect(inv.faceValue).to.equal(ethers.parseUnits("10000", 6));
    expect(inv.advanced).to.be.false;
    expect(await factory.count()).to.equal(1);
  });

  it("should prevent duplicate invoice registration", async function () {
    await factory.authorizeFactor(factor.address);
    const dueDate = Math.floor(Date.now() / 1000) + 30 * 86400;
    await factory
      .connect(factor)
      .registerInvoice("INV-001", borrower.address, ethers.parseUnits("10000", 6), dueDate);

    await expect(
      factory
        .connect(factor)
        .registerInvoice("INV-001", borrower.address, ethers.parseUnits("10000", 6), dueDate)
    ).to.be.revertedWith("Already exists");
  });

  it("should mark invoice as advanced", async function () {
    await factory.authorizeFactor(factor.address);
    const dueDate = Math.floor(Date.now() / 1000) + 30 * 86400;
    await factory
      .connect(factor)
      .registerInvoice("INV-002", borrower.address, ethers.parseUnits("5000", 6), dueDate);

    await factory
      .connect(factor)
      .markAdvanced("INV-002", ethers.parseUnits("4250", 6), 180);

    const inv = await factory.getInvoice("INV-002");
    expect(inv.advanced).to.be.true;
    expect(inv.advanceAmount).to.equal(ethers.parseUnits("4250", 6));
    expect(inv.feePercent).to.equal(180);
  });

  it("should prevent double advancing", async function () {
    await factory.authorizeFactor(factor.address);
    const dueDate = Math.floor(Date.now() / 1000) + 30 * 86400;
    await factory
      .connect(factor)
      .registerInvoice("INV-003", borrower.address, ethers.parseUnits("5000", 6), dueDate);
    await factory
      .connect(factor)
      .markAdvanced("INV-003", ethers.parseUnits("4250", 6), 180);

    await expect(
      factory.connect(factor).markAdvanced("INV-003", ethers.parseUnits("4250", 6), 180)
    ).to.be.revertedWith("Already advanced");
  });

  it("should mark invoice as repaid", async function () {
    await factory.authorizeFactor(factor.address);
    const dueDate = Math.floor(Date.now() / 1000) + 30 * 86400;
    await factory
      .connect(factor)
      .registerInvoice("INV-004", borrower.address, ethers.parseUnits("5000", 6), dueDate);
    await factory
      .connect(factor)
      .markAdvanced("INV-004", ethers.parseUnits("4250", 6), 180);
    await factory.connect(factor).markRepaid("INV-004");

    const inv = await factory.getInvoice("INV-004");
    expect(inv.repaid).to.be.true;
  });

  it("should mark invoice as defaulted by owner", async function () {
    await factory.authorizeFactor(factor.address);
    const dueDate = Math.floor(Date.now() / 1000) + 30 * 86400;
    await factory
      .connect(factor)
      .registerInvoice("INV-005", borrower.address, ethers.parseUnits("5000", 6), dueDate);
    await factory.markDefaulted("INV-005");

    const inv = await factory.getInvoice("INV-005");
    expect(inv.defaulted).to.be.true;
  });

  it("should emit events correctly", async function () {
    await factory.authorizeFactor(factor.address);
    const dueDate = Math.floor(Date.now() / 1000) + 30 * 86400;

    await expect(
      factory
        .connect(factor)
        .registerInvoice("INV-006", borrower.address, ethers.parseUnits("5000", 6), dueDate)
    )
      .to.emit(factory, "InvoiceRegistered")
      .withArgs("INV-006", borrower.address, ethers.parseUnits("5000", 6));
  });
});
