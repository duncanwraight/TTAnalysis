import React from 'react';

type ShotCategoryProps = {
  id: string;
  label: string;
  isActive: boolean;
  onClick: (id: string) => void;
  disabled: boolean;
};

const ShotCategory: React.FC<ShotCategoryProps> = ({
  id,
  label,
  isActive,
  onClick,
  disabled
}) => {
  return (
    <button 
      className={`category-tab ${isActive ? 'active' : ''}`}
      onClick={() => onClick(id)}
      disabled={disabled}
    >
      {label}
    </button>
  );
};

export default ShotCategory;