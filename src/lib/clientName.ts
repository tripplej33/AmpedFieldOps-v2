export interface ClientLike {
  name?: string | null
  company?: string | null
  first_name?: string | null
  last_name?: string | null
  contact_name?: string | null
}

/**
 * Normalizes client display name across the app with consistent fallback ordering:
 * 1. name
 * 2. company
 * 3. first_name + last_name
 * 4. contact_name
 * 5. '—'
 */
export function getClientDisplayName(client?: ClientLike | null): string {
  if (!client) return '—'
  const name = client.name?.trim()
  if (name) return name
  const company = client.company?.trim()
  if (company) return company
  const fullName = [client.first_name, client.last_name].filter(Boolean).join(' ').trim()
  if (fullName) return fullName
  const contactName = client.contact_name?.trim()
  if (contactName) return contactName
  return '—'
}
