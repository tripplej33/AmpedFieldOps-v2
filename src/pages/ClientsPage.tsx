import { useState, useCallback } from 'react'
import { useClients, useCreateClient, useUpdateClient, useDeleteClient, ClientsFilters } from '../hooks/useClients'
import { Client, ClientFormData } from '../types'
import ClientFilters from '../components/ClientFilters'
import ClientTable from '../components/ClientTable'
import ClientCard from '../components/ClientCard'
import ClientModal from '../components/ClientModal'
import Button from '../components/ui/Button'

export default function ClientsPage() {
  const [filters, setFilters] = useState<ClientsFilters>({
    search: undefined,
    status: 'all',
    sortBy: 'name',
    sortOrder: 'asc',
  })
  const [currentPage, setCurrentPage] = useState(0)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const { clients, loading, error, hasMore } = useClients(filters, currentPage, refreshKey)
  const { create: createClient, loading: isCreating } = useCreateClient()
  const { update: updateClient, loading: isUpdating } = useUpdateClient()
  const { delete: deleteClient, loading: isDeleting } = useDeleteClient()

  const handleFilterChange = useCallback((newFilters: ClientsFilters) => {
    setFilters(newFilters)
    setCurrentPage(0) // Reset to first page when filters change
  }, [])

  const handleAddClient = () => {
    setSelectedClient(null)
    setIsModalOpen(true)
  }

  const handleEditClient = (client: Client) => {
    setSelectedClient(client)
    setIsModalOpen(true)
  }

  const handleSaveClient = async (data: ClientFormData) => {
    if (selectedClient) {
      await updateClient(selectedClient.id, data)
    } else {
      await createClient(data)
    }

    // Refresh list after save
    setRefreshKey((key) => key + 1)
  }

  const handleDeleteClient = async (client: Client) => {
    if (confirm('Are you sure you want to delete this client?')) {
      await deleteClient(client.id)
      setRefreshKey((key) => key + 1)
    }
  }

  const handleDeleteFromModal = async (clientId: string) => {
    if (confirm('Are you sure you want to delete this client?')) {
      await deleteClient(clientId)
      setRefreshKey((key) => key + 1)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-display">Clients</h1>
          <p className="text-text-muted mt-1">Manage all your clients and contacts</p>
        </div>
        <Button
          onClick={handleAddClient}
          className="bg-primary hover:bg-primary/90 text-white w-full sm:w-auto"
        >
          + Add Client
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Filters */}
        <div className="lg:col-span-1">
          <ClientFilters onFiltersChange={handleFilterChange} isLoading={loading} />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block bg-card-dark border border-border-dark rounded-lg overflow-hidden">
            <ClientTable
              clients={clients}
              isLoading={loading}
              onEdit={handleEditClient}
              onDelete={handleDeleteClient}
            />
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {loading && clients.length === 0 ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-text-muted">Loading clients...</p>
                </div>
              </div>
            ) : clients.length === 0 ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="text-4xl mb-4">📋</div>
                  <p className="text-white text-lg font-semibold mb-2">No clients found</p>
                  <p className="text-text-muted">Start by creating your first client</p>
                </div>
              </div>
            ) : (
              clients.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  onEdit={handleEditClient}
                  onDelete={handleDeleteClient}
                />
              ))
            )}
          </div>

          {/* Pagination */}
          {clients.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-card-dark border border-border-dark rounded-lg">
              <p className="text-sm text-text-muted">
                Page {currentPage + 1} • {clients.length} clients
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0 || loading}
                  variant="secondary"
                  className="text-sm"
                >
                  ← Previous
                </Button>
                <Button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!hasMore || loading}
                  variant="secondary"
                  className="text-sm"
                >
                  Next →
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Client Modal */}
      <ClientModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedClient(null)
        }}
        onSave={handleSaveClient}
        onDelete={handleDeleteFromModal}
        client={selectedClient}
        isLoading={isCreating || isUpdating || isDeleting}
      />
    </div>
  )
}
