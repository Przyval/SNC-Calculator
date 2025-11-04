"use client"

import * as React from "react"
import { Check, ChevronsUpDown, UserPlus, Loader2, Building2, Mail, Phone } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CreatableCombobox } from "@/components/ui/creatable-combobox"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"


interface ClientType {
  id: number
  name: string
}

export interface Client {
  id: number
  name: string
  email?: string
  phone_number?: string
  client_type?: ClientType
}

interface ClientSelectionProps {
  onClientSelected: (client: Client) => void;
  accessToken?: string;
}

export default function ClientSelection({ onClientSelected, accessToken }: ClientSelectionProps) {
  const [popoverOpen, setPopoverOpen] = React.useState(false)
  const [modalOpen, setModalOpen] = React.useState(false)

  const [clients, setClients] = React.useState<Client[]>([])
  const [clientTypes, setClientTypes] = React.useState<ClientType[]>([])
  
  const [value, setValue] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(true)
  const [isCreating, setIsCreating] = React.useState(false)

  const [newClientDetails, setNewClientDetails] = React.useState({
    email: "",
    phone_number: "",
    client_type: "",
  })

  const [validationError, setValidationError] = React.useState("")

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

  React.useEffect(() => {
    if (!accessToken) return;

    const fetchInitialData = async () => {
      setIsLoading(true)
      try {
        const [clientsResponse, clientTypesResponse] = await Promise.all([
          fetch(`${apiUrl}/clients`, {
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
          }),
          fetch(`${apiUrl}/client-types`, {
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
          })
        ]);

        if (!clientsResponse.ok) throw new Error('Failed to fetch clients');
        if (!clientTypesResponse.ok) throw new Error('Failed to fetch client types');

        const clientsData = await clientsResponse.json();
        const clientTypesData = await clientTypesResponse.json();

        setClients(clientsData)
        setClientTypes(clientTypesData)
      } catch (error) {
        console.error("Failed to fetch initial data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchInitialData()
  }, [accessToken, apiUrl])

  
  const handleSelectClient = (clientName: string) => {
    setValue(clientName === value ? "" : clientName)
    setPopoverOpen(false)
  }

  const handleContinue = () => {
    if (!value) return;
    const existingClient = clients.find(c => c.name.toLowerCase() === value.toLowerCase());

    if (existingClient) {
      if (!existingClient.client_type) {
        setValidationError("Klien ini tidak memiliki tipe klien. Silakan perbarui data klien terlebih dahulu.");
        return;
      }
      onClientSelected(existingClient);
    } else {
      setValidationError("");
      setModalOpen(true);
    }
  }

  const handleCreateClient = async () => {
    if (!value || isCreating) return;
    
    if (!newClientDetails.client_type) {
      setValidationError("Tipe klien wajib diisi!");
      return;
    }

    setIsCreating(true);
    setValidationError("");

    const clientTypeName = newClientDetails.client_type;
    const existingType = clientTypes.find(
      (ct) => ct.name.toLowerCase() === clientTypeName.toLowerCase()
    );

    const clientTypePayload = existingType ? existingType.id : clientTypeName;

   try {
      const response = await fetch(`${apiUrl}/clients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: value,
          email: newClientDetails.email || null,
          phone_number: newClientDetails.phone_number || null,
          client_type: clientTypePayload,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        throw new Error(errorData.message || 'Failed to create client');
      }

      const newlyCreatedClient = await response.json();
      
      setClients(prev => [...prev, newlyCreatedClient]);

      onClientSelected(newlyCreatedClient);
      
      setModalOpen(false);
      setNewClientDetails({ email: "", phone_number: "", client_type: "" });
      
    } catch (error) {
      console.error("Failed to create client:", error);
      setValidationError(error instanceof Error ? error.message : "Gagal membuat klien baru");
    } finally {
      setIsCreating(false);
    }
  };

  const selectedClient = clients.find(c => c.name.toLowerCase() === value.toLowerCase());
  const isNewClient = value && !selectedClient;

  return (
    <>
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
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={popoverOpen}
                    className={cn(
                        "w-full justify-between h-12 sm:h-14 text-left font-medium transition-all duration-200",
                        "bg-gray-800/50 border-gray-600 text-white hover:bg-gray-700/70 hover:border-amber-500/50",
                        "focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500",
                        value && "bg-gray-700/70 border-amber-500/30"
                    )}
                    >
                    <span className={cn("truncate", value ? "text-white" : "text-gray-400")}>
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
                                <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
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
                            onSelect={handleSelectClient}
                            className="text-white hover:bg-gray-700 cursor-pointer py-3"
                            >
                            <Check
                                className={cn(
                                "mr-2 h-4 w-4 text-amber-500",
                                value.toLowerCase() === client.name.toLowerCase() ? "opacity-100" : "opacity-0"
                                )}
                            />
                            <div className="flex-1">
                              <span className="font-medium">{client.name}</span>
                              {client.client_type && (
                                <span className="ml-2 text-xs text-gray-400">
                                  ({client.client_type.name})
                                </span>
                              )}
                            </div>
                            </CommandItem>
                        ))}
                        </CommandGroup>
                    </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {value && selectedClient && (
              <div className="p-4 rounded-lg border transition-all duration-200 bg-gray-800/50 border-gray-600">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-green-500/20 text-green-400">
                      ✓
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{selectedClient.name}</p>
                      <p className="text-xs text-gray-400">Klien yang sudah ada</p>
                    </div>
                  </div>
                  
                  {selectedClient.client_type && (
                    <div className="flex items-center gap-2 text-sm pl-11">
                      <Building2 className="h-4 w-4 text-amber-500" />
                      <span className="text-gray-300">{selectedClient.client_type.name}</span>
                    </div>
                  )}
                  
                  {selectedClient.email && (
                    <div className="flex items-center gap-2 text-sm pl-11">
                      <Mail className="h-4 w-4 text-blue-500" />
                      <span className="text-gray-300">{selectedClient.email}</span>
                    </div>
                  )}
                  
                  {selectedClient.phone_number && (
                    <div className="flex items-center gap-2 text-sm pl-11">
                      <Phone className="h-4 w-4 text-green-500" />
                      <span className="text-gray-300">{selectedClient.phone_number}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {value && isNewClient && (
              <div className="p-4 rounded-lg border transition-all duration-200 bg-amber-500/10 border-amber-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-amber-500/20 text-amber-400">
                    +
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{value}</p>
                    <p className="text-xs text-amber-400">Klien baru - Detail diperlukan</p>
                  </div>
                </div>
              </div>
            )}

            {validationError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-400">{validationError}</p>
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
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl">Detail Klien Baru</DialogTitle>
            <DialogDescription className="text-gray-400">
              Lengkapi informasi untuk klien: <span className="font-bold text-amber-400">{value}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="client_type" className="text-right text-gray-300">
                Tipe Klien <span className="text-red-400">*</span>
              </Label>
              <div className="col-span-3">
                <CreatableCombobox
                  options={clientTypes}
                  value={newClientDetails.client_type}
                  onChange={(newValue) => {
                    setNewClientDetails({ ...newClientDetails, client_type: newValue });
                    setValidationError("");
                  }}
                  placeholder="Pilih atau buat tipe"
                  searchPlaceholder="Cari tipe..."
                  emptyMessage="Tipe tidak ditemukan."
                />
                {!newClientDetails.client_type && (
                  <p className="text-xs text-amber-400 mt-1">Wajib diisi untuk pembuatan proposal</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right text-gray-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={newClientDetails.email}
                onChange={(e) => setNewClientDetails({ ...newClientDetails, email: e.target.value })}
                className="col-span-3 bg-gray-800 border-gray-600 focus:ring-amber-500 text-white"
                placeholder="email@example.com (opsional)"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone_number" className="text-right text-gray-300">
                No. Telepon
              </Label>
              <Input
                id="phone_number"
                value={newClientDetails.phone_number}
                onChange={(e) => setNewClientDetails({ ...newClientDetails, phone_number: e.target.value })}
                className="col-span-3 bg-gray-800 border-gray-600 focus:ring-amber-500 text-white"
                placeholder="+62 xxx xxxx xxxx (opsional)"
              />
            </div>
          </div>
          
          {validationError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 mb-2">
              <p className="text-sm text-red-400">{validationError}</p>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => {
                setModalOpen(false);
                setValidationError("");
              }}
              className="bg-gray-800 hover:bg-gray-700 text-white border-gray-600"
            >
              Batal
            </Button>
            <Button 
                type="submit" 
                onClick={handleCreateClient} 
                disabled={isCreating || !newClientDetails.client_type}
                className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Buat Klien & Lanjutkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}