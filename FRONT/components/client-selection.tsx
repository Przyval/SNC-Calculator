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
        // const response = await fetch("https://kalkulatorsnc.my.id/api/clients"), {
        const response = await fetch("http://localhost:8000/api/clients", {
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

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-8 bg-gray-900/50 rounded-lg">
      <UserPlus className="h-16 w-16 text-amber-500 mb-4" />
      <h2 className="text-2xl font-bold text-white text-center">Siapa nama Klien?</h2>
      <p className="text-gray-400 text-center max-w-md">
        Ketik untuk mencari klien yang sudah ada, atau masukkan nama baru untuk membuat data klien baru.
      </p>
      <div className="w-full max-w-sm space-y-4">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between text-white border-gray-600 hover:bg-gray-800 hover:text-white"
            >
              {value
                ? clients.find((client) => client.name.toLowerCase() === value.toLowerCase())?.name
                : "Pilih atau ketik nama klien..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput
                placeholder="Cari nama klien..."
                onValueChange={(search) => setValue(search)}
              />
              <CommandList>
                <CommandEmpty>
                  {isLoading ? "Memuat..." : "Tidak ada klien ditemukan. Ketik untuk membuat baru."}
                </CommandEmpty>
                <CommandGroup>
                  {clients.map((client) => (
                    <CommandItem
                      key={client.id}
                      value={client.name}
                      onSelect={handleSelect}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value.toLowerCase() === client.name.toLowerCase() ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {client.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Button onClick={handleContinue} disabled={!value} className="w-full bg-amber-500 hover:bg-amber-600 text-black">
          Lanjutkan
        </Button>
      </div>
    </div>
  )
}