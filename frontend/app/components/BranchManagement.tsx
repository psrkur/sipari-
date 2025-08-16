import React from 'react';

interface Branch {
  id: number;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
}

interface BranchManagementProps {
  branches: Branch[];
  onEditBranch: (branch: Branch) => void;
  onDeleteBranch: (branchId: number) => void;
  onDeactivateBranch?: (branchId: number) => void;
  onAddBranch?: () => void; // Yeni prop ekle
}

const BranchManagement: React.FC<BranchManagementProps> = ({ branches, onEditBranch, onDeleteBranch, onDeactivateBranch, onAddBranch }) => {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Şubeler ({branches.length})</h2>
          {onAddBranch && (
            <button
              onClick={onAddBranch}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all duration-200 hover:shadow-md"
            >
              <span className="text-lg">🏢</span>
              <span>Şube Ekle</span>
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şube Adı</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adres</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefon</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {branches.map((branch) => (
              <tr key={branch.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {branch.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {branch.address}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {branch.phone}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    branch.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {branch.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onEditBranch(branch)}
                      className="text-blue-600 hover:text-blue-900 font-medium hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                    >
                      ✏️ Düzenle
                    </button>
                    {branch.isActive && onDeactivateBranch && (
                      <button
                        onClick={() => onDeactivateBranch(branch.id)}
                        className="text-orange-600 hover:text-orange-900 font-medium hover:bg-orange-50 px-2 py-1 rounded transition-colors"
                      >
                        ⏸️ Pasif Yap
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteBranch(branch.id)}
                      className="text-red-600 hover:text-red-900 font-medium hover:bg-red-50 px-2 py-1 rounded transition-colors"
                    >
                      🗑️ Sil
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BranchManagement; 