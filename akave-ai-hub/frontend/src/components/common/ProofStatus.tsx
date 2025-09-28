import React, { useState } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, ClockIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { ProofService } from '../../services/proof';

export interface ProofStatusProps {
  manifestId: string;
  isRegistered?: boolean;
  isValid?: boolean;
  transactionHash?: string;
  onProofUpdate?: (isRegistered: boolean, isValid: boolean, transactionHash?: string) => void;
}

export const ProofStatus: React.FC<ProofStatusProps> = ({
  manifestId,
  isRegistered = false,
  isValid = false,
  transactionHash,
  onProofUpdate
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleRegisterProof = async () => {
    setIsLoading(true);
    try {
      const response = await ProofService.registerProof(manifestId);
      toast.success('Proof registered successfully!');
      onProofUpdate?.(true, false, response.transactionHash);
    } catch (error: any) {
      console.error('Failed to register proof:', error);
      toast.error(error.response?.data?.message || 'Failed to register proof');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyProof = async () => {
    setIsVerifying(true);
    try {
      const response = await ProofService.verifyProof(manifestId);
      toast.success(response.isValid ? 'Proof verified successfully!' : 'Proof verification failed');
      onProofUpdate?.(true, response.isValid, transactionHash);
    } catch (error: any) {
      console.error('Failed to verify proof:', error);
      toast.error(error.response?.data?.message || 'Failed to verify proof');
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusIcon = () => {
    if (isValid) {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    } else if (isRegistered) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
    } else {
      return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    if (isValid) {
      return 'Verified';
    } else if (isRegistered) {
      return 'Registered';
    } else {
      return 'Not Registered';
    }
  };

  const getStatusColor = () => {
    if (isValid) {
      return 'text-green-600 bg-green-50 border-green-200';
    } else if (isRegistered) {
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    } else {
      return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="flex items-center space-x-3">
      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${getStatusColor()}`}>
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>
      </div>

      <div className="flex space-x-2">
        {!isRegistered && (
          <button
            onClick={handleRegisterProof}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />
                Registering...
              </>
            ) : (
              'Register Proof'
            )}
          </button>
        )}

        {isRegistered && (
          <button
            onClick={handleVerifyProof}
            disabled={isVerifying}
            className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying ? (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Proof'
            )}
          </button>
        )}
      </div>

      {transactionHash && (
        <div className="text-xs text-gray-500">
          <span className="font-mono">Tx: {transactionHash.slice(0, 8)}...</span>
        </div>
      )}
    </div>
  );
};

export default ProofStatus;



