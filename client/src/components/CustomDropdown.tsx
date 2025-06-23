import { useState, useRef, useEffect, ReactNode } from 'react';

interface CustomDropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export default function CustomDropdown({ 
  trigger, 
  children, 
  align = 'right',
  className = '' 
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const alignmentClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 transform -translate-x-1/2'
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer"
      >
        {trigger}
      </div>

      {isOpen && (
        <div 
          className={`absolute top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg min-w-48 ${alignmentClasses[align]}`}
          onClick={(e) => e.stopPropagation()} // Prevent dropdown from closing when clicking inside
        >
          <div className="py-1">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

interface DropdownItemProps {
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'destructive';
}

export function DropdownItem({ 
  onClick, 
  children, 
  className = '',
  variant = 'default'
}: DropdownItemProps) {
  const variantClasses = {
    default: 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100',
    destructive: 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 hover:text-red-700'
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2 text-sm transition-colors ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="border-t border-gray-200 dark:border-gray-700 my-1" />;
}