export const dbQuery = async (text: string, values?: any[]) => {
  const response = await fetch('/api/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, values }),
  })
  
  if (!response.ok) {
    throw new Error(`Database query failed with status ${response.status}`)
  }
  
  const data = await response.json()
  
  if (data && data.error) {
    throw new Error(data.error)
  }
  
  return data
}
