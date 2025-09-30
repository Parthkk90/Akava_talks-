import { ethers } from 'ethers';

export class WalletService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;

  async connect(): Promise<string | null> {
    if (!window.ethereum) {
      throw new Error('No Ethereum wallet found. Please install MetaMask.');
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);
    
    try {
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock your wallet.');
      }

      this.signer = await this.provider.getSigner();
      const address = await this.signer.getAddress();
      
      console.log('✅ Wallet connected:', address);
      return address;
    } catch (error: any) {
      console.error('❌ Failed to connect wallet:', error);
      
      // Handle specific error cases
      if (error.code === 4001) {
        throw new Error('User rejected wallet connection');
      } else if (error.code === -32002) {
        throw new Error('Wallet connection request pending');
      }
      
      throw error;
    }
  }

  async signMessage(message: string): Promise<string | null> {
    if (!this.signer) {
      throw new Error('Wallet not connected. Please connect first.');
    }
    
    try {
      const signature = await this.signer.signMessage(message);
      console.log('✅ Message signed successfully');
      return signature;
    } catch (error: any) {
      console.error('❌ Failed to sign message:', error);
      
      if (error.code === 4001) {
        throw new Error('User rejected message signing');
      }
      
      throw error;
    }
  }

  async getNetwork(): Promise<ethers.Network | null> {
    if (!this.provider) return null;
    return await this.provider.getNetwork();
  }

  async getBalance(): Promise<string | null> {
    if (!this.signer) return null;
    const balance = await this.provider!.getBalance(await this.signer.getAddress());
    return ethers.formatEther(balance);
  }

  disconnect(): void {
    this.provider = null;
    this.signer = null;
    console.log('🔌 Wallet disconnected');
  }

  isConnected(): boolean {
    return this.signer !== null;
  }
}

export const walletService = new WalletService();
