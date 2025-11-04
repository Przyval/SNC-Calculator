"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxOption {
  id: number;
  name: string;
}

interface CreatableComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
}

export function CreatableCombobox({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  searchPlaceholder = "Search...",
  emptyMessage = "No option found.",
  className,
}: CreatableComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (currentValue: string) => {
    onChange(currentValue.toLowerCase() === value.toLowerCase() ? "" : currentValue)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between text-white",
            "bg-gray-800 border-gray-600 hover:bg-gray-700/70",
            "focus:ring-2 focus:ring-offset-0 focus:ring-amber-500",
            !value && "text-gray-400",
            className
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-gray-800 border-gray-700 shadow-xl" align="start">
        <Command className="bg-gray-800">
          <CommandInput
            placeholder={searchPlaceholder}
            value={value}
            onValueChange={onChange}
            className="h-10 text-white bg-transparent border-0 ring-0 focus:ring-0 placeholder:text-gray-400 border-b border-gray-600 rounded-none"
          />
          <CommandList className="bg-gray-800">
            <CommandEmpty>
              <div className="py-4 text-center text-sm text-gray-400">
                <p>{emptyMessage}</p>
                {value && (
                  <p className="text-amber-400 text-xs mt-1">
                    Ketik untuk membuat tipe baru: "{value}"
                  </p>
                )}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.name}
                  onSelect={handleSelect}
                  className="cursor-pointer text-white data-[highlighted]:bg-gray-700"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 text-amber-500",
                      value.toLowerCase() === option.name.toLowerCase() ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}