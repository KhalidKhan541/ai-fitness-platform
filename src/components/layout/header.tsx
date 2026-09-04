"use client";

import * as React from "react";
import { Menu, Bell, Search, Settings, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { UserAvatar } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown";
import { Badge } from "../ui/badge";

interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  onMenuClick?: () => void;
  showSearch?: boolean;
  user?: {
    name: string;
    email: string;
    image?: string | null;
  };
}

function Header({
  onMenuClick,
  showSearch = true,
  user,
  className,
  children,
  ...props
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = React.useState("");

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6",
        className
      )}
      {...props}
    >
      {onMenuClick && (
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      )}
      {children}
      {showSearch && (
        <div className="relative flex-1 max-w-sm ml-auto md:ml-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/50"
          />
        </div>
      )}
      <div className="flex items-center gap-2 ml-auto">
        <HeaderNotificationButton count={3} />
        <HeaderUserMenu user={user} />
      </div>
    </header>
  );
}

interface HeaderNotificationButtonProps {
  count?: number;
}

function HeaderNotificationButton({ count = 0 }: HeaderNotificationButtonProps) {
  return (
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <Badge
          variant="destructive"
          className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-[10px]"
        >
          {count}
        </Badge>
      )}
    </Button>
  );
}

interface HeaderUserMenuProps {
  user?: {
    name: string;
    email: string;
    image?: string | null;
  };
  onProfile?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
}

function HeaderUserMenu({ user, onProfile, onSettings, onLogout }: HeaderUserMenuProps) {
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <UserAvatar name={user.name} image={user.image} size="sm" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onProfile}>
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onSettings}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { Header, HeaderNotificationButton, HeaderUserMenu };
