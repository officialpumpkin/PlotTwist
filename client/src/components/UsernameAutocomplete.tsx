
import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiRequest } from '@/lib/queryClient';
import { Check, User } from 'lucide-react';

interface User {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

interface UsernameAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (user: User) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function UsernameAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Enter username",
  disabled = false,
  className = ""
}: UsernameAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['/api/users/search', value],
    queryFn: async () => {
      if (value.length < 2) return [];
      const response = await apiRequest('GET', `/api/users/search?q=${encodeURIComponent(value)}`);
      return response as User[];
    },
    enabled: value.length >= 2,
    staleTime: 30000, // Cache results for 30 seconds
  });

  useEffect(() => {
    setSelectedIndex(-1);
  }, [users]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(newValue.length >= 2);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || users.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < users.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < users.length) {
          handleUserSelect(users[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleUserSelect = (user: User) => {
    onChange(user.username);
    setIsOpen(false);
    setSelectedIndex(-1);
    onSelect?.(user);
    inputRef.current?.blur();
  };

  const showDropdown = isOpen && value.length >= 2 && (users.length > 0 || isLoading);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => value.length >= 2 && setIsOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full"
      />
      
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Searching...
            </div>
          ) : users.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No users found
            </div>
          ) : (
            users.map((user, index) => (
              <div
                key={user.id}
                className={`px-3 py-2 cursor-pointer flex items-center gap-3 hover:bg-accent ${
                  index === selectedIndex ? 'bg-accent' : ''
                }`}
                onClick={() => handleUserSelect(user)}
              >
                <Avatar className="h-6 w-6">
                  {user.profileImageUrl ? (
                    <AvatarImage src={user.profileImageUrl} alt={user.username} />
                  ) : (
                    <AvatarFallback className="text-xs">
                      <User className="h-3 w-3" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {user.username}
                  </div>
                  {(user.firstName || user.lastName) && (
                    <div className="text-xs text-muted-foreground truncate">
                      {[user.firstName, user.lastName].filter(Boolean).join(' ')}
                    </div>
                  )}
                </div>
                {value.toLowerCase() === user.username.toLowerCase() && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
