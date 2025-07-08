'use client'

import React from 'react'

interface Branch {
  id: number
  name: string
  address: string
  phone: string
}

interface BranchSelectorProps {
  branches: Branch[]
  selectedBranch: Branch | null
  onSelectBranch: (branch: Branch) => void
}

export default function BranchSelector({ branches, selectedBranch, onSelectBranch }: BranchSelectorProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Şube Seçimi</h3>
      
      {branches.length === 0 ? (
        <p className="text-gray-500 text-sm">Şube bulunamadı</p>
      ) : (
        <div className="space-y-3">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedBranch?.id === branch.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-primary-300'
              }`}
              onClick={() => onSelectBranch(branch)}
            >
              <h4 className="font-medium text-gray-900">{branch.name}</h4>
              <p className="text-sm text-gray-600 mt-1">{branch.address}</p>
              <p className="text-sm text-gray-500 mt-1">{branch.phone}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 