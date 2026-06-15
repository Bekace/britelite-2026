'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, CheckCircle2, Copy, Download, Upload } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface TokensData {
  colors?: Record<string, any>
  spacing?: Record<string, any>
  radius?: Record<string, any>
  typography?: Record<string, any>
  [key: string]: any
}

interface TransformResult {
  css: string
  tailwind: Record<string, any>
  typescript: string
  success: boolean
  message: string
}

export default function TokensDemoPage() {
  const [tokensData, setTokensData] = useState<TokensData | null>(null)
  const [transformResult, setTransformResult] = useState<TransformResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null)

  // Load tokens on mount
  useEffect(() => {
    loadTokens()
  }, [])

  async function loadTokens() {
    try {
      setLoading(true)
      const response = await fetch('/api/tokens/load')
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to load tokens')
        return
      }

      setTokensData(data.tokens)
      setError(null)
    } catch (err) {
      setError('Failed to load tokens')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function transformTokens() {
    try {
      setLoading(true)
      const response = await fetch('/api/tokens/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokensData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to transform tokens')
        return
      }

      setTransformResult(data)
      setError(null)
    } catch (err) {
      setError('Failed to transform tokens')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function downloadTokens() {
    if (!tokensData) return

    const element = document.createElement('a')
    const file = new Blob([JSON.stringify(tokensData, null, 2)], { type: 'application/json' })
    element.href = URL.createObjectURL(file)
    element.download = 'tokens.json'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  function copyToClipboard(text: string, index: string) {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const tokenGroups = tokensData ? Object.entries(tokensData).filter(([key]) => !key.startsWith('$')) : []
  const totalTokens = tokenGroups.reduce((sum, [, group]) => {
    return sum + (typeof group === 'object' ? Object.keys(group).length : 0)
  }, 0)

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Design Tokens Demo</h1>
          <p className="text-muted-foreground">
            Test the self-managed design tokens workflow. Load, transform, and validate your tokens before going live.
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Tokens Loaded</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTokens}</div>
              <p className="text-xs text-muted-foreground mt-1">{tokenGroups.length} groups</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {tokensData ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium">Ready</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    <span className="text-sm font-medium">Loading</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Transformed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {transformResult?.success ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium">Complete</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-gray-400" />
                    <span className="text-sm font-medium">Pending</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <Tabs defaultValue="tokens" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tokens">Tokens</TabsTrigger>
            <TabsTrigger value="transform">Transform</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
          </TabsList>

          {/* Tokens Tab */}
          <TabsContent value="tokens">
            <Card>
              <CardHeader>
                <CardTitle>Design Tokens</CardTitle>
                <CardDescription>Your complete design token structure from tokens.json</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading tokens...</div>
                ) : tokenGroups.length > 0 ? (
                  <>
                    {tokenGroups.map(([groupName, groupTokens]) => (
                      <div key={groupName} className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-3 text-lg capitalize">{groupName}</h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {typeof groupTokens === 'object' &&
                            Object.entries(groupTokens).map(([tokenName, tokenValue]: [string, any]) => (
                              <div
                                key={`${groupName}-${tokenName}`}
                                className="flex items-center justify-between p-2 bg-muted rounded hover:bg-accent/50 transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="font-mono text-sm font-medium truncate">
                                    {`--${groupName}-${tokenName}`}
                                  </div>
                                  {typeof tokenValue === 'object' && tokenValue.$value ? (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Value: {String(tokenValue.$value).substring(0, 50)}
                                      {String(tokenValue.$value).length > 50 ? '...' : ''}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Value: {String(tokenValue).substring(0, 50)}
                                      {String(tokenValue).length > 50 ? '...' : ''}
                                    </div>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    copyToClipboard(
                                      `--${groupName}-${tokenName}`,
                                      `${groupName}-${tokenName}`
                                    )
                                  }
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}

                    <div className="flex gap-2">
                      <Button onClick={transformTokens} disabled={loading} className="flex-1">
                        Transform Tokens
                      </Button>
                      <Button onClick={downloadTokens} variant="outline" disabled={loading}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No tokens loaded</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transform Tab */}
          <TabsContent value="transform">
            <Card>
              <CardHeader>
                <CardTitle>Token Transformation</CardTitle>
                <CardDescription>See how tokens are converted to CSS, Tailwind, and TypeScript</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!transformResult ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Click "Transform Tokens" to generate outputs
                  </div>
                ) : transformResult.success ? (
                  <>
                    <Alert>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <AlertDescription>{transformResult.message}</AlertDescription>
                    </Alert>

                    {/* CSS Variables */}
                    <div>
                      <h3 className="font-semibold mb-2">CSS Variables (globals.css)</h3>
                      <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto">
                        <pre>{transformResult.css}</pre>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(transformResult.css, 'css')}
                        className="mt-2"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        {copiedIndex === 'css' ? 'Copied!' : 'Copy CSS'}
                      </Button>
                    </div>

                    {/* TypeScript Types */}
                    <div>
                      <h3 className="font-semibold mb-2">TypeScript Types (tokens.ts)</h3>
                      <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto">
                        <pre>{transformResult.typescript}</pre>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(transformResult.typescript, 'ts')}
                        className="mt-2"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        {copiedIndex === 'ts' ? 'Copied!' : 'Copy TypeScript'}
                      </Button>
                    </div>

                    {/* Tailwind Config Preview */}
                    <div>
                      <h3 className="font-semibold mb-2">Tailwind Config (tailwind-config.json)</h3>
                      <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto">
                        <pre>{JSON.stringify(transformResult.tailwind, null, 2)}</pre>
                      </div>
                    </div>
                  </>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{transformResult.message}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle>Token Preview</CardTitle>
                <CardDescription>Visual representation of your design tokens</CardDescription>
              </CardHeader>
              <CardContent>
                {tokensData?.colors && (
                  <div>
                    <h3 className="font-semibold mb-4">Color Palette</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {Object.entries(tokensData.colors).map(([name, value]: [string, any]) => {
                        const colorValue =
                          typeof value === 'object' ? value.$value : value
                        const isHex = typeof colorValue === 'string' && colorValue.startsWith('#')

                        return (
                          <div key={name} className="space-y-2">
                            {isHex && (
                              <div
                                className="w-full h-20 rounded-lg border"
                                style={{ backgroundColor: colorValue }}
                              />
                            )}
                            <div>
                              <p className="text-xs font-medium capitalize">{name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{colorValue}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Workflow Tab */}
          <TabsContent value="workflow">
            <Card>
              <CardHeader>
                <CardTitle>Self-Managed Tokens Workflow</CardTitle>
                <CardDescription>How to use this system in production</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-semibold mb-1">Step 1: Export from Figma</h3>
                    <p className="text-sm text-muted-foreground">
                      Export your design collections/variables from Figma as JSON format (copy your collection structure)
                    </p>
                  </div>

                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-semibold mb-1">Step 2: Update tokens.json</h3>
                    <p className="text-sm text-muted-foreground">
                      Replace the contents of <code className="bg-muted px-2 py-1 rounded">design-tokens/tokens.json</code>{' '}
                      with your exported tokens
                    </p>
                  </div>

                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-semibold mb-1">Step 3: Run Transform</h3>
                    <p className="text-sm text-muted-foreground">
                      Execute <code className="bg-muted px-2 py-1 rounded">npm run tokens:transform</code> to generate:
                    </p>
                    <ul className="text-sm text-muted-foreground mt-2 ml-4 space-y-1">
                      <li>✓ CSS variables in globals.css</li>
                      <li>✓ Tailwind config in tailwind-config.json</li>
                      <li>✓ TypeScript types in tokens.ts</li>
                    </ul>
                  </div>

                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-semibold mb-1">Step 4: Commit & Deploy</h3>
                    <p className="text-sm text-muted-foreground">
                      Commit <code className="bg-muted px-2 py-1 rounded">tokens.json</code> to Git. CI/CD automatically generates
                      outputs on every update.
                    </p>
                  </div>

                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-semibold mb-1">Step 5: Use in Components</h3>
                    <p className="text-sm text-muted-foreground">
                      Use CSS variables: <code className="bg-muted px-2 py-1 rounded">var(--color-primary)</code> or Tailwind:{' '}
                      <code className="bg-muted px-2 py-1 rounded">bg-primary</code>
                    </p>
                  </div>
                </div>

                <div className="bg-accent/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Benefits of Self-Managed Tokens:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>✓ No API limits or enterprise requirements</li>
                    <li>✓ Full version control via Git</li>
                    <li>✓ Easy team collaboration</li>
                    <li>✓ Works offline</li>
                    <li>✓ Fast transformation pipeline</li>
                    <li>✓ Ready for CI/CD automation</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
