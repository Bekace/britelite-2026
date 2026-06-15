'use client'

import { useState } from 'react'
import { Upload, CheckCircle2, AlertCircle, Copy, Loader } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export default function TokensUploadPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedTokens, setUploadedTokens] = useState<Record<string, any> | null>(null)
  const [transformedCss, setTransformedCss] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [rawJsonInput, setRawJsonInput] = useState<string>('')

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsLoading(true)
      setError('')
      const text = await file.text()
      const tokens = JSON.parse(text)
      setUploadedTokens(tokens)
      setRawJsonInput(text)
      await transformTokens(tokens)
      setSuccess('✓ Tokens uploaded and transformed successfully!')
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Failed to parse JSON'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleJsonPaste = async () => {
    try {
      setIsLoading(true)
      setError('')
      const tokens = JSON.parse(rawJsonInput)
      setUploadedTokens(tokens)
      await transformTokens(tokens)
      setSuccess('✓ Tokens pasted and transformed successfully!')
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Failed to parse JSON'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const transformTokens = async (tokens: Record<string, any>) => {
    try {
      const response = await fetch('/api/tokens/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokens),
      })

      if (!response.ok) {
        throw new Error(`Transform failed: ${response.statusText}`)
      }

      const data = await response.json()
      setTransformedCss(data.cssVariables || '')
    } catch (err) {
      setError(`Transform error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Design Tokens Upload</h1>
          <p className="text-muted-foreground">Export your Figma design tokens as JSON and upload them here</p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Error</p>
              <p className="text-sm text-destructive/80">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="flex gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* Upload Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* File Upload Card */}
          <Card className="p-6 border-2 border-dashed hover:border-primary/50 transition-colors">
            <div className="space-y-4">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">Upload JSON File</h3>
                <p className="text-sm text-muted-foreground">Upload your exported Figma tokens JSON file</p>
              </div>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                disabled={isLoading}
                className="w-full px-3 py-2 border rounded-lg cursor-pointer hover:bg-muted disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">Maximum file size: 5MB</p>
            </div>
          </Card>

          {/* Paste JSON Card */}
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-1">Paste JSON</h3>
                <p className="text-sm text-muted-foreground">Paste your Figma tokens JSON directly</p>
              </div>
              <textarea
                value={rawJsonInput}
                onChange={(e) => setRawJsonInput(e.target.value)}
                placeholder="Paste your JSON here..."
                className="w-full h-32 p-3 border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <Button
                onClick={handleJsonPaste}
                disabled={!rawJsonInput || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Transform Tokens'
                )}
              </Button>
            </div>
          </Card>
        </div>

        {/* Results */}
        {uploadedTokens && (
          <div className="space-y-6">
            {/* Tokens Summary */}
            <Card className="p-6">
              <h3 className="font-semibold text-foreground mb-4">Uploaded Tokens Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(uploadedTokens).map(([key, value]) => {
                  if (key.startsWith('$')) return null
                  const tokenCount = typeof value === 'object' ? Object.keys(value).length : 0
                  return (
                    <div key={key} className="p-3 rounded-lg bg-muted">
                      <p className="text-sm font-medium text-foreground capitalize">{key}</p>
                      <p className="text-lg font-bold text-primary">{tokenCount}</p>
                      <p className="text-xs text-muted-foreground">tokens</p>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* CSS Variables Preview */}
            {transformedCss && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Generated CSS Variables</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(transformedCss)}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
                <div className="bg-muted p-4 rounded-lg overflow-auto max-h-80">
                  <pre className="font-mono text-xs text-foreground whitespace-pre-wrap break-words">
                    {transformedCss.substring(0, 1000)}
                    {transformedCss.length > 1000 && '...\n[Showing first 1000 characters]'}
                  </pre>
                </div>
              </Card>
            )}

            {/* Next Steps */}
            <Card className="p-6 bg-primary/5 border-primary/20">
              <h3 className="font-semibold text-foreground mb-3">Next Steps</h3>
              <ol className="space-y-2 text-sm text-foreground">
                <li>✓ <span className="font-medium">Tokens uploaded and transformed</span></li>
                <li>→ Check your <code className="bg-muted px-2 py-1 rounded text-xs">design-tokens/tokens.json</code></li>
                <li>→ Check your <code className="bg-muted px-2 py-1 rounded text-xs">app/globals.css</code> for new variables</li>
                <li>→ Start using tokens in your components!</li>
              </ol>
            </Card>
          </div>
        )}

        {/* Instructions */}
        {!uploadedTokens && (
          <Card className="p-6 border-l-4 border-l-primary">
            <h3 className="font-semibold text-foreground mb-3">How to Export from Figma</h3>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">1. In Figma Design System file:</span>
                <p>Go to Assets → Collections → Select your collection</p>
              </li>
              <li>
                <span className="font-medium text-foreground">2. Export as JSON:</span>
                <p>Right-click collection → Export → Choose JSON format</p>
              </li>
              <li>
                <span className="font-medium text-foreground">3. Upload or Paste:</span>
                <p>Either upload the file or paste the JSON content above</p>
              </li>
              <li>
                <span className="font-medium text-foreground">4. Automatic Transformation:</span>
                <p>CSS variables, Tailwind config, and TypeScript types are generated automatically!</p>
              </li>
            </ol>
          </Card>
        )}
      </div>
    </div>
  )
}
