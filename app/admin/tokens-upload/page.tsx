'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Upload, Copy, Check, AlertCircle, FileJson, Wand2, ChevronDown, ChevronRight } from 'lucide-react'

type TransformedOutput = {
  css: string
  tailwind: string
  typescript: string
}

export default function AdminTokensUploadPage() {
  const [jsonInput, setJsonInput] = useState('')
  const [uploadedTokens, setUploadedTokens] = useState<any>(null)
  const [transformedOutput, setTransformedOutput] = useState<TransformedOutput | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    css: true,
    tailwind: false,
    typescript: false,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        setJsonInput(JSON.stringify(json, null, 2))
        setUploadedTokens(json)
        setError('')
        setTransformedOutput(null)
      } catch {
        setError('Invalid JSON file. Please upload a valid JSON file.')
      }
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        setJsonInput(JSON.stringify(json, null, 2))
        setUploadedTokens(json)
        setError('')
        setTransformedOutput(null)
      } catch {
        setError('Invalid JSON file. Please upload a valid JSON file.')
      }
    }
    reader.readAsText(file)
  }

  const handleJsonChange = (value: string) => {
    setJsonInput(value)
    setTransformedOutput(null)
    try {
      const parsed = JSON.parse(value)
      setUploadedTokens(parsed)
      setError('')
    } catch {
      setUploadedTokens(null)
      if (value.trim()) setError('Invalid JSON format.')
      else setError('')
    }
  }

  const handleTransform = async () => {
    if (!uploadedTokens) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/tokens/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: uploadedTokens }),
      })
      if (!response.ok) throw new Error('Failed to transform tokens')
      const data = await response.json()
      setTransformedOutput(data)
    } catch (err: any) {
      setError(err.message || 'Error transforming tokens')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const tokenGroupCount = uploadedTokens ? Object.keys(uploadedTokens).length : 0
  const tokenCount = uploadedTokens
    ? Object.values(uploadedTokens).reduce((sum: number, group: any) => {
        if (typeof group === 'object' && group !== null) {
          return sum + Object.keys(group).length
        }
        return sum
      }, 0)
    : 0

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="border-b pb-6">
          <h1 className="text-2xl font-bold tracking-tight">Design Tokens</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Upload your Figma design tokens JSON to generate CSS variables, Tailwind config, and TypeScript types.
          </p>
        </div>

        {/* Step 1: Upload */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">1</div>
              <CardTitle className="text-base">Upload Tokens JSON</CardTitle>
              {uploadedTokens && (
                <Badge variant="secondary" className="ml-auto">
                  {tokenGroupCount} groups · {tokenCount} tokens
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drop zone */}
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <FileJson className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium text-sm">Drag & drop your tokens.json or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">Supports any Figma-exported JSON format</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Or paste */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or paste JSON</span>
              </div>
            </div>

            <textarea
              value={jsonInput}
              onChange={(e) => handleJsonChange(e.target.value)}
              placeholder={'{\n  "colors": {\n    "primary": "#007AFF",\n    "secondary": "#5856D6"\n  },\n  "spacing": {\n    "sm": "8px",\n    "md": "16px"\n  }\n}'}
              className="w-full h-48 p-3 border rounded-lg font-mono text-xs bg-muted/30 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Transform */}
        <Card className={!uploadedTokens ? 'opacity-50 pointer-events-none' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${uploadedTokens ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>2</div>
              <CardTitle className="text-base">Transform</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {uploadedTokens && (
              <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.keys(uploadedTokens).map((group) => (
                  <div key={group} className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{group}</p>
                    <p className="text-lg font-bold mt-1">
                      {typeof uploadedTokens[group] === 'object' ? Object.keys(uploadedTokens[group]).length : 1}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <Button
              onClick={handleTransform}
              disabled={!uploadedTokens || loading}
              className="w-full"
              size="lg"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              {loading ? 'Transforming...' : 'Transform Tokens'}
            </Button>
          </CardContent>
        </Card>

        {/* Step 3: Output */}
        {transformedOutput && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">3</div>
                <CardTitle className="text-base">Generated Output</CardTitle>
                <Badge className="ml-auto bg-green-500/10 text-green-600 border-green-500/20">Ready</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* CSS Variables */}
              <div className="border rounded-lg overflow-hidden">
                <div
                  className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleSection('css')}
                >
                  <div className="flex items-center gap-2">
                    {expandedSections.css ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <span className="text-sm font-medium">CSS Variables</span>
                    <Badge variant="outline" className="text-xs">globals.css</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); copyToClipboard(transformedOutput.css, 'css') }}
                  >
                    {copiedId === 'css' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span className="ml-1 text-xs">{copiedId === 'css' ? 'Copied!' : 'Copy'}</span>
                  </Button>
                </div>
                {expandedSections.css && (
                  <pre className="p-4 text-xs overflow-x-auto bg-muted/10 max-h-64">{transformedOutput.css}</pre>
                )}
              </div>

              {/* Tailwind */}
              <div className="border rounded-lg overflow-hidden">
                <div
                  className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleSection('tailwind')}
                >
                  <div className="flex items-center gap-2">
                    {expandedSections.tailwind ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <span className="text-sm font-medium">Tailwind Config</span>
                    <Badge variant="outline" className="text-xs">tailwind.config</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); copyToClipboard(transformedOutput.tailwind, 'tailwind') }}
                  >
                    {copiedId === 'tailwind' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span className="ml-1 text-xs">{copiedId === 'tailwind' ? 'Copied!' : 'Copy'}</span>
                  </Button>
                </div>
                {expandedSections.tailwind && (
                  <pre className="p-4 text-xs overflow-x-auto bg-muted/10 max-h-64">{transformedOutput.tailwind}</pre>
                )}
              </div>

              {/* TypeScript */}
              <div className="border rounded-lg overflow-hidden">
                <div
                  className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleSection('typescript')}
                >
                  <div className="flex items-center gap-2">
                    {expandedSections.typescript ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <span className="text-sm font-medium">TypeScript Types</span>
                    <Badge variant="outline" className="text-xs">tokens.ts</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); copyToClipboard(transformedOutput.typescript, 'ts') }}
                  >
                    {copiedId === 'ts' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span className="ml-1 text-xs">{copiedId === 'ts' ? 'Copied!' : 'Copy'}</span>
                  </Button>
                </div>
                {expandedSections.typescript && (
                  <pre className="p-4 text-xs overflow-x-auto bg-muted/10 max-h-64">{transformedOutput.typescript}</pre>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
