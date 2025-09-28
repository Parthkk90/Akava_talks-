import { ethers } from 'ethers';

// Add type declaration for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

export class WalletService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;

  async connect(): Promise<string | null> {
    if (window.ethereum) {
      this.provider = new ethers.BrowserProvider(window.ethereum);
      
      try {
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        this.signer = await this.provider.getSigner();
        const address = await this.signer.getAddress();
        return address;
      } catch (error) {
        console.error('Failed to connect wallet:', error);
        throw error;
      }
    } else {
      throw new Error('No Ethereum wallet found. Please install MetaMask.');
    }
  }

  async signMessage(message: string): Promise<string | null> {
    if (!this.signer) return null;
    try {
      return await this.signer.signMessage(message);
    } catch (error) {
      console.error('Failed to sign message:', error);
      return null;
    }
  }

  getProvider(): ethers.BrowserProvider | null {
    return this.provider;
  }
}

export const walletService = new WalletService();
