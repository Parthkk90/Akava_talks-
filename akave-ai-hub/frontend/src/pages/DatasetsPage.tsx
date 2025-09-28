import React, { useState } from 'react';
import { FileUpload } from '../components/files/FileUpload';
import { FileList } from '../components/files/FileList';

const DatasetsPage: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadSuccess = () => {
    // Trigger a refresh of the file list
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Datasets</h2>
        <p className="text-gray-600">
          Upload and manage your datasets. Register proofs on the blockchain to ensure data integrity.
        </p>
      </div>

      <div className="space-y-8">
        {/* Upload Section */}
        <FileUpload onUploadSuccess={handleUploadSuccess} />

        {/* Files List Section */}
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Your Files</h3>
          <FileList key={refreshKey} />
        </div>
      </div>
    </div>
  );
};

export default DatasetsPage;

