"use client"

import * as React from "react"
import { Check, ChevronsUpDown, UserPlus } from "lucide-react"

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

interface Client {
  id: number
  name: string
}

interface ClientSelectionProps {
  onClientSelected: (client: { id: number | null; name: string }) => void
  accessToken?: string;
}

export default function ClientSelection({ onClientSelected, accessToken }: ClientSelectionProps) {
  const [open, setOpen] = React.useState(false)
  const [clients, setClients] = React.useState<Client[]>([])
  const [value, setValue] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    if (!accessToken) return;
    const fetchClients = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
        const response = await fetch(`${apiUrl}/clients`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch clients from API');
        }
        const data = await response.json()
        setClients(data)
      } catch (error) {
        console.error("Failed to fetch clients:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchClients()
  }, [accessToken])

  const handleSelect = (currentValue: string) => {
    setValue(currentValue === value ? "" : currentValue)
    setOpen(false)
  }

  const handleContinue = () => {
    if (!value) return;

    const existingClient = clients.find(
      (client) => client.name.toLowerCase() === value.toLowerCase()
    )

    if (existingClient) {
      onClientSelected({ id: existingClient.id, name: existingClient.name })
    } else {
      onClientSelected({ id: null, name: value })
    }
  }

  const selectedClient = clients.find(
    (client) => client.name.toLowerCase() === value.toLowerCase()
  )

  const isNewClient = value && !selectedClient

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 sm:p-8 space-y-6 sm:space-y-8 bg-black/90 border-l-4 border-yellow-500 rounded-md shadow-lg">
      <div className="text-center space-y-4">
        <div className="p-4 bg-amber-500/20 rounded-full w-fit mx-auto">
          <UserPlus className="h-12 w-12 sm:h-16 sm:w-16 text-amber-500" />
        </div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
          Siapa nama Klien?
        </h2>
        <p className="text-gray-400 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
          Ketik untuk mencari klien yang sudah ada, atau masukkan nama baru untuk membuat data klien baru.
        </p>
      </div>

      <div className="w-full max-w-sm sm:max-w-md space-y-4">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "w-full justify-between h-12 sm:h-14 text-left font-medium transition-all duration-200",
                "bg-gray-800/50 border-gray-600 text-white hover:bg-gray-700/70 hover:border-amber-500/50",
                "focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500",
                value && "bg-gray-700/70 border-amber-500/30"
              )}
            >
              <span className={cn(
                "truncate",
                value ? "text-white" : "text-gray-400"
              )}>
                {value || "Pilih atau ketik nama klien..."}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-gray-400" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0 bg-gray-800 border-gray-600 shadow-2xl">
            <Command className="bg-gray-800">
              <CommandInput
                placeholder="Cari nama klien..."
                onValueChange={(search) => setValue(search)}
                className="text-white placeholder:text-gray-400 border-gray-600"
              />
              <CommandList className="bg-gray-800">
                <CommandEmpty className="text-gray-400 py-6 text-center text-sm">
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-500"></div>
                      Memuat...
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p>Tidak ada klien ditemukan.</p>
                      {value && (
                        <p className="text-amber-400 text-xs">
                          Tekan "Lanjutkan" untuk membuat klien baru: "{value}"
                        </p>
                      )}
                    </div>
                  )}
                </CommandEmpty>
                <CommandGroup>
                  {clients.map((client) => (
                    <CommandItem
                      key={client.id}
                      value={client.name}
                      onSelect={handleSelect}
                      className="text-white hover:bg-gray-700 cursor-pointer py-3"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 text-amber-500",
                          value.toLowerCase() === client.name.toLowerCase() ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="font-medium">{client.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Selected client info */}
        {value && (
          <div className="p-4 rounded-lg border transition-all duration-200 bg-gray-800/50 border-gray-600">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                selectedClient ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"
              )}>
                {selectedClient ? "✓" : "+"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{value}</p>
                <p className="text-xs text-gray-400">
                  {selectedClient ? "Klien yang sudah ada" : "Klien baru"}
                </p>
              </div>
            </div>
          </div>
        )}

        <Button 
          onClick={handleContinue} 
          disabled={!value || isLoading} 
          className={cn(
            "w-full h-12 sm:h-14 font-medium text-base transition-all duration-200",
            "bg-amber-500 hover:bg-amber-600 text-black",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "focus:ring-2 focus:ring-amber-500/30 focus:ring-offset-2 focus:ring-offset-gray-900"
          )}
        >
          {isNewClient ? "Buat Klien Baru & Lanjutkan" : "Lanjutkan"}
        </Button>

        {/* Additional info for new clients */}
        {isNewClient && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-amber-300 text-sm text-center">
              💡 Klien baru akan dibuat dengan nama "{value}"
            </p>
          </div>
        )}
      </div>
    </div>
  )
}