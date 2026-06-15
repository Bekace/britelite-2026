'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, Copy, Check, AlertCircle } from 'lucide-react'

export default function AdminTokensUploadPage() {
  const [jsonInput, setJsonInput] = useState('')
  const [uploadedTokens, setUploadedTokens] = useState(null)
  const [transformedOutput, setTransformedOutput] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result)
        setJsonInput(JSON.stringify(json, null, 2))
        setError('')
      } catch (err) {
        setError('Invalid JSON file. Please upload a valid JSON file.')
      }
    }
    reader.readAsText(file)
  }

  const handlePasteJson = () => {
    navigator.clipboard.readText().then((text) => {
      try {
        const json = JSON.parse(text)
        setJsonInput(JSON.stringify(json, null, 2))
        setError('')
      } catch (err) {
        setError('Clipboard content is not valid JSON.')
      }
    })
  }

  const validateJson = () => {
    try {
      const parsed = JSON.parse(jsonInput)
      setUploadedTokens(parsed)
      setError('')
      return true
    } catch (err) {
      setError('Invalid JSON format. Please check your input.')
      return false
    }
  }

  const handleTransform = async () => {
    if (!validateJson()) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/tokens/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: uploadedTokens }),
      })

      if (!response.ok) {
        throw new Error('Failed to transform tokens')
      }

      const data = await response.json()
      setTransformedOutput(data)
      setSuccess('Tokens transformed successfully!')
    } catch (err) {
      setError(err.message || 'Error transforming tokens')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Design Tokens Management</h1>
          <p className="text-muted-foreground mt-2">
            Upload your Figma design tokens JSON and automatically generate CSS variables, Tailwind config, and TypeScript types.
          </p>
        </div>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Upload JSON</TabsTrigger>
            <TabsTrigger value="transform">Transform</TabsTrigger>
            <TabsTrigger value="output">Output</TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>Upload Design Tokens</CardTitle>
                <CardDescription>
                  Paste or upload your Figma design tokens JSON file
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Upload Methods */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="font-medium">Upload JSON File</p>
                    <p className="text-sm text-muted-foreground">Click to select or drag and drop</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  <Button onClick={handlePasteJson} variant="outline" className="h-full">
                    <Copy className="w-4 h-4 mr-2" />
                    Paste from Clipboard
                  </Button>
                </div>

                {/* JSON Textarea */}
                <div>
                  <label className="block text-sm font-medium mb-2">JSON Input</label>
                  <textarea
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder='Paste your Figma tokens JSON here... e.g., {"colors": {"primary": "#007AFF"}, ...}'
                    className="w-full h-64 p-4 border rounded-lg font-mono text-sm bg-muted/30 resize-none"
                  />
                </div>

                {/* Alerts */}
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Buttons */}
                <Button onClick={validateJson} className="w-full">
                  Validate JSON
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transform Tab */}
          <TabsContent value="transform">
            <Card>
              <CardHeader>
                <CardTitle>Transform Tokens</CardTitle>
                <CardDescription>
                  Generate CSS variables, Tailwind config, and TypeScript types
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {uploadedTokens ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <p className="text-sm font-medium text-green-900 dark:text-green-100">
                        ✓ Valid JSON loaded - {JSON.stringify(uploadedTokens).length} bytes
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium mb-2">Token Groups Found:</h3>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                          {Object.keys(uploadedTokens).map((key) => (
                            <li key={key} className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-primary" />
                              {key}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-medium mb-2">Total Tokens:</h3>
                        <p className="text-2xl font-bold text-primary">
                          {Object.values(uploadedTokens).reduce((sum, group) => {
                            if (typeof group === 'object' && !('$value' in group)) {
                              return sum + Object.keys(group).length
                            }
                            return sum
                          }, 0)}
                        </p>
                      </div>
                    </div>

                    <Button onClick={handleTransform} disabled={loading} className="w-full">
                      {loading ? 'Transforming...' : 'Transform Tokens'}
                    </Button>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Upload and validate JSON first</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Output Tab */}
          <TabsContent value="output">
            <Card>
              <CardHeader>
                <CardTitle>Generated Output</CardTitle>
                <CardDescription>
                  CSS variables, Tailwind config, and TypeScript types
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {transformedOutput ? (
                  <div className="space-y-6">
                    {/* CSS Variables */}
                    {transformedOutput.css && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">CSS Variables</h3>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(transformedOutput.css, 'css')}
                          >
                            {copiedId === 'css' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                        <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                          {transformedOutput.css}
                        </pre>
                      </div>
                    )}

                    {/* Tailwind Config */}
                    {transformedOutput.tailwind && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">Tailwind Config</h3>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(transformedOutput.tailwind, 'tailwind')}
                          >
                            {copiedId === 'tailwind' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                        <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                          {transformedOutput.tailwind}
                        </pre>
                      </div>
                    )}

                    {/* TypeScript Types */}
                    {transformedOutput.typescript && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">TypeScript Types</h3>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(transformedOutput.typescript, 'ts')}
                          >
                            {copiedId === 'ts' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                        <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                          {transformedOutput.typescript}
                        </pre>
                      </div>
                    )}

                    {success && (
                      <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                        <AlertDescription className="text-green-900 dark:text-green-100">
                          {success}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Transform tokens first to see output</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How to Export Tokens from Figma</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>In your Figma file, go to Assets → Variables</li>
              <li>Right-click on your variable collections</li>
              <li>Export as JSON</li>
              <li>Copy the JSON or upload the file here</li>
              <li>Click Transform to generate CSS/Tailwind/TypeScript</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
