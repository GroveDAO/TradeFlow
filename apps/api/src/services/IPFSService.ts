import PinataSDK from "@pinata/sdk";
import { Readable } from "stream";

export class IPFSService {
  private pinata: PinataSDK;

  constructor() {
    this.pinata = new PinataSDK(
      process.env.PINATA_API_KEY!,
      process.env.PINATA_SECRET_API_KEY!
    );
  }

  async uploadBuffer(buffer: Buffer, filename: string): Promise<string> {
    const stream = Readable.from(buffer) as NodeJS.ReadableStream & {
      path?: string;
    };
    stream.path = filename;
    const result = await this.pinata.pinFileToIPFS(stream, {
      pinataMetadata: { name: filename },
      pinataOptions: { cidVersion: 1 },
    });
    return result.IpfsHash;
  }

  async uploadJSON(data: Record<string, unknown>, name: string): Promise<string> {
    const result = await this.pinata.pinJSONToIPFS(data, {
      pinataMetadata: { name },
      pinataOptions: { cidVersion: 1 },
    });
    return result.IpfsHash;
  }
}
