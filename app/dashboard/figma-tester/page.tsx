'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Download } from 'lucide-react'

export default function FigmaConnectionTester() {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [tokenCount, setTokenCount] = useState(0)
  const [collections, setCollections] = useState<string[]>([])
  const [rawData, setRawData] = useState<any>(null)
  const [error, setError] = useState('')

  const testConnection = async () => {
    setStatus('testing')
    setMessage('Testing Figma API connection...')
    setError('')
    
    try {
      // Call the API route to test connection
      const response = await fetch('/api/figma/test-connection', {
        method: 'GET',
      })

      const data = await response.json()

      if (!response.ok) {
        setStatus('error')
        setError(data.error || 'Failed to connect to Figma')
        setMessage(data.message || 'Check your token and file ID')
        return
      }

      setStatus('success')
      setMessage('✓ Successfully connected to Figma!')
      setTokenCount(data.tokenCount || 0)
      setCollections(data.collections || [])
      setRawData(data.variables || {})
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Unknown error')
      setMessage('Failed to test connection')
    }
  }

  const syncTokens = async () => {
    setStatus('testing')
    setMessage('Syncing tokens from Figma...')
    
    try {
      const response = await fetch('/api/figma/sync-tokens', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        setStatus('error')
        setError(data.error || 'Failed to sync tokens')
        return
      }

      setStatus('success')
      setMessage('✓ Tokens synced successfully!')
      setTokenCount(data.tokenCount || 0)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Figma Connection Tester</h1>
        <p className="text-muted-foreground">
          Test your Figma API connection and sync design tokens in real-time
        </p>
      </div>

      <div className="grid gap-4">
        {/* Status Card */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            {status === 'idle' && (
              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0" />
            )}
            {status === 'testing' && (
              <Loader2 className="h-6 w-6 text-primary animate-spin flex-shrink-0" />
            )}
            {status === 'success' && (
              <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
            )}
            {status === 'error' && (
              <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
            )}
            
            <div className="flex-1">
              <h2 className="font-semibold text-lg">{message}</h2>
              {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
              
              {status === 'success' && (
                <div className="mt-4 space-y-2 text-sm">
                  <p className="text-foreground">
                    <strong>Found {tokenCount} variables</strong>
                  </p>
                  {collections.length > 0 && (
                    <div>
                      <p className="text-muted-foreground">Collections:</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {collections.map((col) => (
                          <span
                            key={col}
                            className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium"
                          >
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={testConnection} disabled={status === 'testing'} className="gap-2">
            {status === 'testing' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Test Connection
              </>
            )}
          </Button>
          
          <Button
            onClick={syncTokens}
            disabled={status === 'testing' || status !== 'success'}
            variant="secondary"
            className="gap-2"
          >
            {status === 'testing' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Sync Tokens Now
              </>
            )}
          </Button>
        </div>

        {/* Raw Data Display */}
        {rawData && Object.keys(rawData).length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Variables from Figma</h3>
            <div className="bg-muted p-4 rounded-lg overflow-auto max-h-96">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                {JSON.stringify(rawData, null, 2)}
              </pre>
            </div>
          </Card>
        )}

        {/* Instructions */}
        <Card className="p-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold mb-3 text-blue-900 dark:text-blue-100">How to use:</h3>
          <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-200 list-decimal list-inside">
            <li>Click "Test Connection" to verify your Figma token works</li>
            <li>Check that your variables are detected correctly</li>
            <li>Click "Sync Tokens Now" to download tokens to your project</li>
            <li>Check `/design-tokens/tokens.json` for synced tokens</li>
            <li>Visit `/dashboard/design-tokens` to see the preview</li>
          </ol>
        </Card>
      </div>
    </div>
  )
}
