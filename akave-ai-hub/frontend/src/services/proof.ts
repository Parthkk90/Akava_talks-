import api from './api';

export interface ProofRegistrationRequest {
  manifestId: string;
}

export interface ProofRegistrationResponse {
  status: string;
  message: string;
  transactionHash: string;
}

export interface ProofVerificationResponse {
  status: string;
  isValid: boolean;
  onChainHash: string;
  localHash: string;
}

export class ProofService {
  /**
   * Register a manifest's hash on the blockchain
   */
  static async registerProof(manifestId: string): Promise<ProofRegistrationResponse> {
    const response = await api.post<ProofRegistrationResponse>('/proof/register', {
      manifestId
    });
    return response.data;
  }

  /**
   * Verify a manifest's hash against the blockchain
   */
  static async verifyProof(manifestId: string): Promise<ProofVerificationResponse> {
    const response = await api.get<ProofVerificationResponse>(`/proof/verify/${manifestId}`);
    return response.data;
  }
}

export default ProofService;



