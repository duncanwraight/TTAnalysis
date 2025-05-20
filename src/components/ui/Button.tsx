import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline';

type ButtonProps = {
  variant?: ButtonVariant;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
};

/**
 * Reusable button component with standardized styling
 */
const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  onClick,
  disabled = false,
  className = '',
  title,
  children,
  type = 'button',
}) => {
  const baseClass = 'btn';
  const variantClass = `${variant}-btn`;
  
  return (
    <button
      type={type}
      className={`${baseClass} ${variantClass} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
};

export default Button;