import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.connect();

type OtcContext = {
  creator: any;
  filler: any;
  other: any;
  creatorAddress: string;
  fillerAddress: string;
  otherAddress: string;
  giveToken: any;
  wantToken: any;
  weth: any;
  otc: any;
  batchFiller: any;
  rejectEthReceiver: any;
};

async function deadlineInOneHour(): Promise<bigint> {
  const block = await ethers.provider.getBlock("latest");

  if (block === null) {
    throw new Error("Latest block is unavailable");
  }

  return BigInt(block.timestamp) + 3600n;
}

async function deploySystem(): Promise<OtcContext> {
  const [creator, filler, other] = await ethers.getSigners();
  const creatorAddress = await creator.getAddress();
  const fillerAddress = await filler.getAddress();
  const otherAddress = await other.getAddress();

  const giveToken = await ethers.deployContract("MockERC20", ["Give", "GIVE", 1000n]);
  const wantToken = await ethers.deployContract("MockERC20", ["Want", "WANT", 0n]);
  const weth = await ethers.deployContract("MockWETH");
  const otc = await ethers.deployContract("OTC", [await weth.getAddress()]);
  const batchFiller = await ethers.deployContract("BatchTradeFiller");
  const rejectEthReceiver = await ethers.deployContract("RejectEthReceiver");

  await wantToken.connect(filler).mintTokens(1000n);

  return {
    creator,
    filler,
    other,
    creatorAddress,
    fillerAddress,
    otherAddress,
    giveToken,
    wantToken,
    weth,
    otc,
    batchFiller,
    rejectEthReceiver,
  };
}

async function createTrade(args: {
  otc: any;
  creator: any;
  giveToken: any;
  wantToken: any;
  giveAmount: bigint;
  wantAmount: bigint;
}): Promise<bigint> {
  const { otc, creator, giveToken, wantToken, giveAmount, wantAmount } = args;

  await giveToken.connect(creator).approve(await otc.getAddress(), giveAmount);

  const tx = await otc
    .connect(creator)
    .createTrade(
      await giveToken.getAddress(),
      giveAmount,
      await wantToken.getAddress(),
      wantAmount,
      await deadlineInOneHour(),
    );

  await tx.wait();
  return otc.totalTrades();
}

describe("OTC", function () {
  // ─── createTradeFromETH ──────────────────────────────────────────────────

  it("createTradeFromETH: wraps ETH and records trade correctly", async function () {
    const ctx = await deploySystem();
    const deadline = await deadlineInOneHour();

    const tx = await ctx.otc
      .connect(ctx.creator)
      .createTradeFromETH(await ctx.wantToken.getAddress(), 100n, deadline, { value: 50n });

    await tx.wait();

    const tradeId = await ctx.otc.totalTrades();
    const trade = await ctx.otc.trades(tradeId);

    expect(trade.creator).to.equal(ctx.creatorAddress);
    expect(trade.giveAmount).to.equal(50n);
    expect(trade.wantAmount).to.equal(100n);
    expect(trade.remainingGiveAmount).to.equal(50n);
    expect(trade.remainingWantAmount).to.equal(100n);
    expect(await ctx.weth.balanceOf(await ctx.otc.getAddress())).to.equal(50n);
  });

  it("createTradeFromETH: emits TradeCreated", async function () {
    const ctx = await deploySystem();
    const deadline = await deadlineInOneHour();

    await expect(
      ctx.otc
        .connect(ctx.creator)
        .createTradeFromETH(await ctx.wantToken.getAddress(), 100n, deadline, { value: 50n }),
    )
      .to.emit(ctx.otc, "TradeCreated")
      .withArgs(ctx.creatorAddress, 1n, deadline);
  });

  it("createTradeFromETH: reverts when wantToken is WETH", async function () {
    const ctx = await deploySystem();

    await expect(
      ctx.otc
        .connect(ctx.creator)
        .createTradeFromETH(await ctx.weth.getAddress(), 100n, await deadlineInOneHour(), {
          value: 50n,
        }),
    ).to.be.revertedWithCustomError(ctx.otc, "InvalidToken");
  });

  it("createTradeFromETH: reverts when zero ETH sent", async function () {
    const ctx = await deploySystem();

    await expect(
      ctx.otc
        .connect(ctx.creator)
        .createTradeFromETH(await ctx.wantToken.getAddress(), 100n, await deadlineInOneHour(), {
          value: 0n,
        }),
    ).to.be.revertedWithCustomError(ctx.otc, "ZeroAmount");
  });

  it("createTradeFromETH: reverts when wantAmount is zero", async function () {
    const ctx = await deploySystem();

    await expect(
      ctx.otc
        .connect(ctx.creator)
        .createTradeFromETH(await ctx.wantToken.getAddress(), 0n, await deadlineInOneHour(), {
          value: 50n,
        }),
    ).to.be.revertedWithCustomError(ctx.otc, "ZeroAmount");
  });

  it("createTrade: reverts when packed amount/deadline bounds are exceeded", async function () {
    const ctx = await deploySystem();

    await ctx.giveToken.connect(ctx.creator).approve(await ctx.otc.getAddress(), 1n);

    await expect(
      ctx.otc
        .connect(ctx.creator)
        .createTrade(
          await ctx.giveToken.getAddress(),
          1n,
          await ctx.wantToken.getAddress(),
          (1n << 128n),
          await deadlineInOneHour(),
        ),
    ).to.be.revertedWithCustomError(ctx.otc, "AmountTooLarge");

    await expect(
      ctx.otc
        .connect(ctx.creator)
        .createTrade(
          await ctx.giveToken.getAddress(),
          1n,
          await ctx.wantToken.getAddress(),
          1n,
          (1n << 64n),
        ),
    ).to.be.revertedWithCustomError(ctx.otc, "DeadlineTooLarge");
  });

  // ─── fillTrade overfill cap ──────────────────────────────────────────────

  it("fillTrade: caps fillAmount to remainingWantAmount on overfill", async function () {
    const ctx = await deploySystem();

    const tradeId = await createTrade({ ...ctx, giveAmount: 10n, wantAmount: 5n });

    // Filler sends way more than wantAmount — should be silently capped
    await ctx.wantToken.connect(ctx.filler).approve(await ctx.otc.getAddress(), 999n);
    await ctx.otc.connect(ctx.filler).fillTrade(tradeId, 999n);

    // Trade fully filled, storage cleared
    const trade = await ctx.otc.trades(tradeId);
    expect(trade.creator).to.equal(ethers.ZeroAddress);

    // Filler spent only 5 wantToken, received all 10 giveToken
    expect(await ctx.wantToken.balanceOf(ctx.fillerAddress)).to.equal(995n);
    expect(await ctx.giveToken.balanceOf(ctx.fillerAddress)).to.equal(10n);
  });

  // ─── fillTradeInETH partial fill ────────────────────────────────────────

  it("fillTradeInETH: emits TradePartiallyFilled on partial ETH fill", async function () {
    const ctx = await deploySystem();

    const tradeId = await createTrade({
      ...ctx,
      giveAmount: 10n,
      wantToken: ctx.weth,
      wantAmount: 6n,
    });

    await expect(ctx.otc.connect(ctx.filler).fillTradeInETH(tradeId, { value: 3n }))
      .to.emit(ctx.otc, "TradePartiallyFilled")
      .withArgs(
        ctx.fillerAddress,
        tradeId,
        await ctx.giveToken.getAddress(),
        5n, // sold = 3 * 10 / 6 = 5
        await ctx.weth.getAddress(),
        3n,
      );

    const trade = await ctx.otc.trades(tradeId);
    expect(trade.remainingWantAmount).to.equal(3n);
    expect(trade.remainingGiveAmount).to.equal(5n);
  });

  // ─── WETH() getter ───────────────────────────────────────────────────────

  it("WETH(): returns the configured WETH address", async function () {
    const ctx = await deploySystem();

    expect(await ctx.otc.WETH()).to.equal(await ctx.weth.getAddress());
  });

  // ─── Reentrancy audit ────────────────────────────────────────────────────

  it("blocks cancelTrade reentrancy via malicious ERC20 callback (CEI + nonReentrant)", async function () {
    const ctx = await deploySystem();

    const malToken = await ethers.deployContract("MaliciousERC20", [100n]);
    const attacker = await ethers.deployContract("CancelReentrantCreator", [
      await ctx.otc.getAddress(),
    ]);

    // Fund attacker contract with malicious token
    await malToken.transfer(await attacker.getAddress(), 100n);

    // Wire: when attacker receives tokens, fire reenterCallback → try cancelTrade again
    await malToken.setHook(await attacker.getAddress());

    // Setup trade where giveToken is the malicious token
    await attacker.setupTrade(
      await malToken.getAddress(),
      100n,
      await ctx.wantToken.getAddress(),
      50n,
      await deadlineInOneHour(),
    );

    // With CEI fix: delete happens before safeTransfer, so re-entrant cancelTrade
    // finds trades[id].creator == address(0) and reverts "Trade does not exist".
    // With nonReentrant: blocked at modifier level as defense-in-depth.
    await attacker.attackCancel();

    // Reentrancy was caught — flag set inside try/catch in reenterCallback
    expect(await attacker.reenterReverted()).to.be.true;

    // Token balance is correct: attacker got exactly 100, not 200
    expect(await malToken.balanceOf(await attacker.getAddress())).to.equal(100n);
    expect(await malToken.balanceOf(await ctx.otc.getAddress())).to.equal(0n);
  });

  // ─── Batch fill ─────────────────────────────────────────────────────────

  it("fills multiple trades in one transaction via batch filler", async function () {
    const ctx = await deploySystem();

    const tradeId1 = await createTrade({
      ...ctx,
      giveAmount: 10n,
      wantAmount: 5n,
    });

    const tradeId2 = await createTrade({
      ...ctx,
      giveAmount: 20n,
      wantAmount: 10n,
    });

    await ctx.wantToken.connect(ctx.filler).transfer(await ctx.batchFiller.getAddress(), 15n);
    await ctx.batchFiller
      .connect(ctx.filler)
      .approveToken(ctx.wantToken, await ctx.otc.getAddress(), 15n);

    await ctx.batchFiller
      .connect(ctx.filler)
      .batchFill(await ctx.otc.getAddress(), [tradeId1, tradeId2], [5n, 10n]);

    expect(await ctx.giveToken.balanceOf(await ctx.batchFiller.getAddress())).to.equal(30n);
    expect(await ctx.wantToken.balanceOf(ctx.creatorAddress)).to.equal(15n);

    const trade1 = await ctx.otc.trades(tradeId1);
    const trade2 = await ctx.otc.trades(tradeId2);
    expect(trade1.creator).to.equal(ethers.ZeroAddress);
    expect(trade2.creator).to.equal(ethers.ZeroAddress);
  });

  it("cancelTrades: cancels multiple trades and returns each remaining give amount", async function () {
    const ctx = await deploySystem();

    const tradeId1 = await createTrade({
      ...ctx,
      giveAmount: 10n,
      wantAmount: 5n,
    });

    const tradeId2 = await createTrade({
      ...ctx,
      giveAmount: 9n,
      wantAmount: 3n,
    });

    await ctx.wantToken.connect(ctx.filler).approve(await ctx.otc.getAddress(), 1n);
    await ctx.otc.connect(ctx.filler).fillTrade(tradeId2, 1n);

    expect(await ctx.giveToken.balanceOf(ctx.creatorAddress)).to.equal(981n);

    await expect(ctx.otc.connect(ctx.creator).cancelTrades([tradeId1, tradeId2]))
      .to.emit(ctx.otc, "TradeCancelled")
      .withArgs(ctx.creatorAddress, tradeId1);

    expect(await ctx.giveToken.balanceOf(ctx.creatorAddress)).to.equal(997n);

    const trade1 = await ctx.otc.trades(tradeId1);
    const trade2 = await ctx.otc.trades(tradeId2);
    expect(trade1.creator).to.equal(ethers.ZeroAddress);
    expect(trade2.creator).to.equal(ethers.ZeroAddress);
    expect(await ctx.giveToken.balanceOf(await ctx.otc.getAddress())).to.equal(0n);
  });

  it("cancelTrades: reverts atomically when one trade is not owned by caller", async function () {
    const ctx = await deploySystem();

    const creatorTradeId = await createTrade({
      ...ctx,
      giveAmount: 10n,
      wantAmount: 5n,
    });

    await ctx.giveToken.connect(ctx.other).mintTokens(10n);
    await ctx.giveToken.connect(ctx.other).approve(await ctx.otc.getAddress(), 10n);
    await ctx.otc
      .connect(ctx.other)
      .createTrade(
        await ctx.giveToken.getAddress(),
        10n,
        await ctx.wantToken.getAddress(),
        5n,
        await deadlineInOneHour(),
      );

    const otherTradeId = await ctx.otc.totalTrades();

    await expect(ctx.otc.connect(ctx.creator).cancelTrades([creatorTradeId, otherTradeId]))
      .to.be.revertedWithCustomError(ctx.otc, "NotTradeOwner")
      .withArgs(otherTradeId, ctx.creatorAddress);

    const creatorTrade = await ctx.otc.trades(creatorTradeId);
    const otherTrade = await ctx.otc.trades(otherTradeId);
    expect(creatorTrade.creator).to.equal(ctx.creatorAddress);
    expect(otherTrade.creator).to.equal(ctx.otherAddress);
  });

  it("tracks remaining give amount on partial fill and returns exact remainder on cancel", async function () {
    const ctx = await deploySystem();

    const tradeId = await createTrade({
      ...ctx,
      giveAmount: 10n,
      wantAmount: 3n,
    });

    await ctx.wantToken.connect(ctx.filler).approve(await ctx.otc.getAddress(), 1n);
    await ctx.otc.connect(ctx.filler).fillTrade(tradeId, 1n);

    const trade = await ctx.otc.trades(tradeId);
    expect(trade.remainingWantAmount).to.equal(2n);
    expect(trade.remainingGiveAmount).to.equal(7n);

    await ctx.otc.connect(ctx.creator).cancelTrade(tradeId);

    expect(await ctx.giveToken.balanceOf(await ctx.otc.getAddress())).to.equal(0n);
    expect(await ctx.giveToken.balanceOf(ctx.fillerAddress)).to.equal(3n);
    expect(await ctx.giveToken.balanceOf(ctx.creatorAddress)).to.equal(997n);
  });

  it("emits TradeFullyFilled with real token addresses after deleting storage", async function () {
    const ctx = await deploySystem();

    const tradeId = await createTrade({
      ...ctx,
      giveAmount: 10n,
      wantAmount: 3n,
    });

    await ctx.wantToken.connect(ctx.filler).approve(await ctx.otc.getAddress(), 3n);

    await expect(ctx.otc.connect(ctx.filler).fillTrade(tradeId, 3n))
      .to.emit(ctx.otc, "TradeFullyFilled")
      .withArgs(
        ctx.fillerAddress,
        tradeId,
        await ctx.giveToken.getAddress(),
        10n,
        await ctx.wantToken.getAddress(),
        3n,
      );
  });

  it("reverts fillTradeInETH for non-WETH want token", async function () {
    const ctx = await deploySystem();

    const tradeId = await createTrade({
      ...ctx,
      giveAmount: 10n,
      wantAmount: 5n,
    });

    await expect(
      ctx.otc.connect(ctx.filler).fillTradeInETH(tradeId, { value: 1n }),
    ).to.be.revertedWithCustomError(ctx.otc, "TradeNotETH").withArgs(tradeId);
  });

  it("fills only remaining want amount in ETH and refunds overfill", async function () {
    const ctx = await deploySystem();

    const tradeId = await createTrade({
      ...ctx,
      giveAmount: 10n,
      wantToken: ctx.weth,
      wantAmount: 5n,
    });

    const beforeBalance = await ethers.provider.getBalance(ctx.fillerAddress);
    const tx = await ctx.otc.connect(ctx.filler).fillTradeInETH(tradeId, { value: 7n });
    const receipt = await tx.wait();
    const gasCost = receipt.fee ?? (receipt.gasUsed * (receipt.gasPrice ?? 0n));
    const afterBalance = await ethers.provider.getBalance(ctx.fillerAddress);

    expect(beforeBalance - afterBalance - gasCost).to.equal(5n);
    expect(await ctx.weth.balanceOf(ctx.creatorAddress)).to.equal(5n);
    expect(await ctx.giveToken.balanceOf(ctx.fillerAddress)).to.equal(10n);
    expect(await ethers.provider.getBalance(await ctx.otc.getAddress())).to.equal(0n);
  });

  it("closes a partially filled trade and transfers residual give amount on final fill", async function () {
    const ctx = await deploySystem();

    const tradeId = await createTrade({
      ...ctx,
      giveAmount: 10n,
      wantAmount: 3n,
    });

    await ctx.wantToken.connect(ctx.filler).approve(await ctx.otc.getAddress(), 2n);
    await ctx.otc.connect(ctx.filler).fillTrade(tradeId, 1n);
    await ctx.otc.connect(ctx.filler).fillTrade(tradeId, 1n);

    await ctx.wantToken.connect(ctx.other).mintTokens(1n);
    await ctx.wantToken.connect(ctx.other).approve(await ctx.otc.getAddress(), 1n);

    await expect(ctx.otc.connect(ctx.other).fillTrade(tradeId, 1n))
      .to.emit(ctx.otc, "TradeFullyFilled")
      .withArgs(
        ctx.otherAddress,
        tradeId,
        await ctx.giveToken.getAddress(),
        4n,
        await ctx.wantToken.getAddress(),
        1n,
      );

    expect(await ctx.giveToken.balanceOf(ctx.fillerAddress)).to.equal(6n);
    expect(await ctx.giveToken.balanceOf(ctx.otherAddress)).to.equal(4n);
    expect(await ctx.wantToken.balanceOf(ctx.creatorAddress)).to.equal(3n);
    expect(await ctx.giveToken.balanceOf(await ctx.otc.getAddress())).to.equal(0n);
  });

  it("reverts when ETH refund cannot be delivered", async function () {
    const ctx = await deploySystem();

    const tradeId = await createTrade({
      ...ctx,
      giveAmount: 10n,
      wantToken: ctx.weth,
      wantAmount: 5n,
    });

    await expect(
      ctx.rejectEthReceiver
        .connect(ctx.filler)
        .fillViaContract(await ctx.otc.getAddress(), tradeId, { value: 7n }),
    ).to.be.revertedWithCustomError(ctx.otc, "RefundFailed");
  });

  it("reverts for invalid operations", async function () {
    const ctx = await deploySystem();

    await expect(ctx.otc.connect(ctx.filler).fillTrade(999n, 1n))
      .to.be.revertedWithCustomError(ctx.otc, "TradeNotFound")
      .withArgs(999n);

    const deadline = await deadlineInOneHour();
    await ctx.giveToken.connect(ctx.creator).approve(await ctx.otc.getAddress(), 10n);
    await ctx.otc
      .connect(ctx.creator)
      .createTrade(
        await ctx.giveToken.getAddress(),
        10n,
        await ctx.wantToken.getAddress(),
        10n,
        deadline,
      );

    const expiringTradeId = await ctx.otc.totalTrades();
    await networkHelpers.time.increaseTo(deadline + 1n);

    await expect(ctx.otc.connect(ctx.filler).fillTrade(expiringTradeId, 1n))
      .to.be.revertedWithCustomError(ctx.otc, "TradeExpired")
      .withArgs(expiringTradeId);

    const activeTradeId = await createTrade({
      ...ctx,
      giveAmount: 10n,
      wantAmount: 5n,
    });

    await expect(ctx.otc.connect(ctx.filler).fillTrade(activeTradeId, 0n))
      .to.be.revertedWithCustomError(ctx.otc, "ZeroAmount");

    await expect(ctx.otc.connect(ctx.filler).cancelTrade(activeTradeId))
      .to.be.revertedWithCustomError(ctx.otc, "NotTradeOwner")
      .withArgs(activeTradeId, ctx.fillerAddress);

    await ctx.otc.connect(ctx.creator).cancelTrade(activeTradeId);

    await expect(ctx.otc.connect(ctx.creator).cancelTrade(activeTradeId))
      .to.be.revertedWithCustomError(ctx.otc, "TradeNotFound")
      .withArgs(activeTradeId);
  });
});

