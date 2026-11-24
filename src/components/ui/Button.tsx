import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'quiet';

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
 // Secondary is the plain white button, so it adds no class
  const variantClass = variant === 'secondary' ? '' : ` ${variant}`;

  return (
    <button
      type={type}
      className={`btn${variantClass}${className ? ` ${className}` : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
};

export default Button;