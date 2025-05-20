import React from 'react';

type CardProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Reusable card component for consistent container styling
 */
const Card: React.FC<CardProps> = ({ children, className = '', style }) => {
  return (
    <div 
      className={`card ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};

export default Card;