import React from 'react';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onSelect: (category: string) => void;
  getCategoryIcon: (category: string) => string;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ categories, selectedCategory, onSelect, getCategoryIcon }) => {
  return (
    <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onSelect(category)}
          className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 transform hover:scale-105 ${
            selectedCategory === category
              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-orange-100 hover:text-orange-700'
          }`}
        >
          {category === 'Tümü' ? '🍽️ Tümü' : `${getCategoryIcon(category)} ${category}`}
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter; 