"use client"

import { signOut } from "@/lib/actions/auth"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function UserMenu({ email }: { email: string }) {
  const initials = email.slice(0, 2).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 text-xs font-medium hover:bg-neutral-300"
        aria-label="사용자 메뉴"
      >
        {initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="font-normal text-neutral-500">
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={
            <form action={signOut}>
              <button type="submit" className="w-full text-left">
                로그아웃
              </button>
            </form>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
