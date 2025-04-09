import React from 'react';

interface GradientButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  active?: boolean;
}

const GradientButton: React.FC<GradientButtonProps> = ({
  children,
  onClick,
  className = '',
  active = false,
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        relative p-[1px] overflow-hidden rounded-lg group
        ${
          active
            ? 'before:opacity-100'
            : 'before:opacity-0 hover:before:opacity-100'
        }
        before:absolute before:inset-0
        before:bg-gradient-border
        before:transition-opacity before:duration-500
        ${className}
      `}
    >
      <span className="relative block px-6 py-3 rounded-lg bg-n-8 text-n-1 transition-colors">
        {children}
      </span>
    </button>
  );
};

export default GradientButton;
