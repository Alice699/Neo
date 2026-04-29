export type ThemeMode = "dark" | "light";

export type NeoNetwork = "shelbynet" | "testnet";

export type AccessMode = "private" | "public" | "token-gated";

export type UploadStatus = "local" | "uploading" | "uploaded" | "failed";

export type VaultFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  owner: string;
  network: NeoNetwork;
  access: AccessMode;
  status: UploadStatus;
  createdAt: number;
  expiresAt: number;
  shareSlug: string;
  blobName: string;
  txHash?: string;
  error?: string;
};

export type NeoSettings = {
  theme: ThemeMode;
  network: NeoNetwork;
  apiKey: string;
};
