
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface User {
  id: string;
  username: string;
  email: string;
  profileImageUrl?: string;
  displayText: string;
}

interface UserAutocompleteProps {
  placeholder?: string;
  onSelect: (user: User) => void;
  value: string;
  onChange?: (value: string) => void;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

export default function UserAutocomplete({
  placeholder = "Enter username or email",
  onSelect,
  value,
  onChange,
  onValueChange,
  disabled = false
}: UserAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [debouncedValue, setDebouncedValue] = useState(value);

  // Use either onChange or onValueChange prop
  const handleValueChange = onChange || onValueChange || (() => {});

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  // Search users query
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['/api/users/search', debouncedValue],
    queryFn: () => apiRequest('GET', `/api/users/search?q=${encodeURIComponent(debouncedValue)}`),
    enabled: debouncedValue.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleSelect = (user: User) => {
    onSelect(user);
    setOpen(false);
  };

  const handleInputChange = (newValue: string) => {
    handleValueChange(newValue);
    setOpen(newValue.length >= 2);
  };

  const handleInputFocus = () => {
    if (value.length >= 2) {
      setOpen(true);
    }
  };

  const handleInputBlur = () => {
    // Delay closing to allow for clicks on dropdown items
    setTimeout(() => {
      setOpen(false);
    }, 200);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          disabled={disabled}
          autoComplete="off"
        />
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0 max-h-[200px] overflow-hidden" 
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <Command>
          <CommandList className="max-h-[200px] overflow-y-auto">
            {isLoading ? (
              <CommandEmpty>Searching...</CommandEmpty>
            ) : users.length === 0 && debouncedValue.length >= 2 ? (
              <CommandEmpty>No users found.</CommandEmpty>
            ) : debouncedValue.length < 2 ? (
              <CommandEmpty>Type at least 2 characters to search</CommandEmpty>
            ) : (
              <CommandGroup>
                {users.map((user: User) => (
                  <CommandItem
                    key={user.id}
                    value={`${user.username} ${user.email}`}
                    onSelect={() => handleSelect(user)}
                    className="flex items-center gap-2 cursor-pointer hover:bg-accent"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage 
                        src={user.profileImageUrl} 
                        alt={user.username}
                      />
                      <AvatarFallback className="text-xs">
                        {user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{user.username}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
