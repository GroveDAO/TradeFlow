export class OracleService {
  async getHbarUsdPrice(): Promise<number> {
    try {
      const url = `${process.env.SUPRA_PULL_URL}/api/v1/getProof?pair_indexes=0&chain_type=evm`;
      const data = await fetch(url, {
        headers: { "x-api-key": process.env.SUPRA_API_KEY! },
      }).then((r) => r.json());
      return (data as { price?: number }).price ?? 0.08;
    } catch {
      try {
        const data = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph&vs_currencies=usd"
        ).then((r) => r.json());
        return (
          (data as { "hedera-hashgraph"?: { usd?: number } })[
            "hedera-hashgraph"
          ]?.usd ?? 0.08
        );
      } catch {
        return 0.08;
      }
    }
  }
}
