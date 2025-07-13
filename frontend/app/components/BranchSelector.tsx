import React from 'react';

interface Branch {
  id: number;
  name: string;
  address: string;
  phone: string;
}

interface BranchSelectorProps {
  branches: Branch[];
  selectedBranch: Branch | null;
  onSelect: (branch: Branch) => void;
  className?: string;
}

const BranchSelector: React.FC<BranchSelectorProps> = ({ branches, selectedBranch, onSelect, className }) => {
  return (
    <div className={className || ''}>
      <label className="block text-sm font-semibold text-gray-700 mb-2">Şube Seçin</label>
      <div className="space-y-2">
        {branches.map((branch) => (
          <button
            key={branch.id}
            onClick={() => onSelect(branch)}
            className={`w-full text-left p-3 rounded-xl transition-all duration-200 ${
              selectedBranch?.id === branch.id
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-orange-100'
            }`}
          >
            <div className="font-semibold">{branch.name}</div>
            <div className="text-xs opacity-80">{branch.address}</div>
            <div className="text-xs text-orange-600">📞 {branch.phone}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BranchSelector; 