import {
  Client,
  AccountId,
  PrivateKey,
  TokenId,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  NftId,
  TokenMintTransaction,
  TransferTransaction,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TokenBurnTransaction,
  Hbar,
} from "@hashgraph/sdk";
import { ReputationEvent } from "@tradeflow/shared";

export class HederaService {
  private client: Client;
  private operatorId: AccountId;
  private operatorKey: PrivateKey;

  constructor() {
    this.operatorId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID!);
    this.operatorKey = PrivateKey.fromString(process.env.HEDERA_OPERATOR_KEY!);
    this.client =
      process.env.HEDERA_NETWORK === "mainnet"
        ? Client.forMainnet()
        : Client.forTestnet();
    this.client.setOperator(this.operatorId, this.operatorKey);
  }

  async createInvoiceCollection(): Promise<string> {
    const tx = await new TokenCreateTransaction()
      .setTokenName("TradeFlow Invoice NFT")
      .setTokenSymbol("TFINV")
      .setTokenType(TokenType.NonFungibleUnique)
      .setSupplyType(TokenSupplyType.Infinite)
      .setTreasuryAccountId(this.operatorId)
      .setSupplyKey(this.operatorKey)
      .setAdminKey(this.operatorKey)
      .setMaxTransactionFee(new Hbar(30))
      .execute(this.client);
    return (await tx.getReceipt(this.client)).tokenId!.toString();
  }

  async mintInvoiceNFT(tokenId: string, metadata: string): Promise<number> {
    const tx = await new TokenMintTransaction()
      .setTokenId(TokenId.fromString(tokenId))
      .addMetadata(Buffer.from(metadata))
      .setMaxTransactionFee(new Hbar(10))
      .execute(this.client);
    return (await tx.getReceipt(this.client)).serials[0].toNumber();
  }

  async transferInvoiceNFT(
    tokenId: string,
    serial: number,
    from: string,
    to: string,
    fromKey: PrivateKey
  ): Promise<string> {
    const tx = await new TransferTransaction()
      .addNftTransfer(
        new NftId(TokenId.fromString(tokenId), serial),
        AccountId.fromString(from),
        AccountId.fromString(to)
      )
      .freezeWith(this.client)
      .sign(fromKey);
    const resp = await (await tx).execute(this.client);
    await resp.getReceipt(this.client);
    return resp.transactionId.toString();
  }

  async burnInvoiceNFT(tokenId: string, serial: number): Promise<string> {
    const tx = await new TokenBurnTransaction()
      .setTokenId(TokenId.fromString(tokenId))
      .setSerials([serial])
      .setMaxTransactionFee(new Hbar(5))
      .execute(this.client);
    await tx.getReceipt(this.client);
    return tx.transactionId.toString();
  }

  async createReputationTopic(debtorName: string): Promise<string> {
    const tx = await new TopicCreateTransaction()
      .setTopicMemo(`TradeFlow Reputation: ${debtorName}`)
      .setSubmitKey(this.operatorKey)
      .execute(this.client);
    return (await tx.getReceipt(this.client)).topicId!.toString();
  }

  async submitReputationEvent(
    topicId: string,
    event: ReputationEvent
  ): Promise<string> {
    const payload = JSON.stringify({
      ...event,
      ts: new Date().toISOString(),
      v: "1.0",
    });
    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(payload)
      .setMaxTransactionFee(new Hbar(2))
      .execute(this.client);
    return (
      await tx.getReceipt(this.client)
    ).topicSequenceNumber!.toString();
  }

  async getDebtorHistory(topicId: string): Promise<ReputationEvent[]> {
    const url = `https://testnet.mirrornode.hedera.com/api/v1/topics/${topicId}/messages?limit=100&order=asc`;
    const resp = await fetch(url);
    const data = await resp.json() as { messages?: Array<{ message: string; sequence_number: number }> };
    return (data.messages || []).map((m) => ({
      ...(JSON.parse(
        Buffer.from(m.message, "base64").toString()
      ) as ReputationEvent),
      seq: m.sequence_number,
    }));
  }
}
