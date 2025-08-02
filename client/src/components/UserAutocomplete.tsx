import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  username: string;
  email: string;
  profileImageUrl: string | null;
  displayText: string;
}

interface UserAutocompleteProps {
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (user: User) => void;
  placeholder?: string;
  className?: string;
}

export default function UserAutocomplete({
  value,
  onValueChange,
  onSelect,
  placeholder = "Enter email or username",
  className
}: UserAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search users when value changes and is at least 2 characters
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users/search', value],
    queryFn: async () => {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(value)}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to search users: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: value.length >= 2,
    staleTime: 30000, // Cache results for 30 seconds
  });

  // Show dropdown when we have users and input is focused
  useEffect(() => {
    setIsOpen(value.length >= 2 && users.length > 0);
    setSelectedIndex(-1); // Reset selection when results change
  }, [users, value]);

  // Debug logging
  useEffect(() => {
    if (value.length >= 2) {
      console.log('UserAutocomplete debug:', { value, usersCount: users.length, isLoading, isOpen });
    }
  }, [value, users, isLoading, isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || users.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < users.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : users.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < users.length) {
          handleSelectUser(users[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelectUser = (user: User) => {
    onSelect(user);
    setIsOpen(false);
    setSelectedIndex(-1);
    onValueChange(''); // Clear input after selection
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (value.length >= 2 && users.length > 0) {
            setIsOpen(true);
          }
        }}
        placeholder={placeholder}
        className="w-full"
        autoComplete="off"
      />

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              Searching users...
            </div>
          ) : users.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              No users found
            </div>
          ) : (
            users.map((user, index) => (
              <button
                key={user.id}
                type="button"
                className={cn(
                  "w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none flex items-center gap-3",
                  selectedIndex === index && "bg-gray-50"
                )}
                onClick={() => handleSelectUser(user)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.profileImageUrl || undefined} />
                  <AvatarFallback className="text-xs bg-gray-100">
                    <User className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {user.username}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {user.email}
                  </div>
                </div>
                {selectedIndex === index && (
                  <Check className="h-4 w-4 text-blue-600" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}