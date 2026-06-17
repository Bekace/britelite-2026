'use client'

import { useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Upload, Copy, Check, AlertCircle, FileJson, Wand2,
  Eye, Layers, Sun, Moon, RotateCcw, ShieldCheck,
  ChevronDown, ChevronRight, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────────

type TokenMode = 'light' | 'dark'

type TransformedOutput = {
  css: { light: string; dark: string; combined: string }
  tokenMap: Record<string, Record<string, { light: string; dark: string }>>
  collections: string[]
  totalTokens: number
}

type PreviewToken = {
  name: string
  cssVar: string
  lightValue: string
  darkValue: string
  type: 'color' | 'spacing' | 'radius' | 'other'
}

type ApplyStatus = 'idle' | 'saving_draft' | 'draft_saved' | 'applying' | 'applied' | 'error'

// ── Helpers ────────────────────────────────────────────────────────────────────

function classifyType(name: string, value: string): PreviewToken['type'] {
  if (/^#|^hsl|^rgb/.test(value)) return 'color'
  if (/radius/i.test(name)) return 'radius'
  if (/rem$|px$|em$/.test(value)) return 'spacing'
  return 'other'
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ColorSwatch({ label, value, cssVar }: { label: string; value: string; cssVar: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className="group flex flex-col gap-1.5 text-left w-full"
      onClick={() => {
        navigator.clipboard.writeText(`var(${cssVar})`)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      <div
        className="w-full h-12 rounded-lg border border-border/40 shadow-sm transition-transform group-hover:scale-[1.03]"
        style={{ background: value }}
      />
      <p className="text-[11px] font-medium truncate">{label}</p>
      <p className="text-[10px] text-muted-foreground truncate font-mono">
        {copied ? 'Copied!' : value}
      </p>
    </button>
  )
}

function SpacingBar({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <div className="h-4 bg-primary/25 rounded shrink-0" style={{ width: value, minWidth: '4px' }} />
      <span className="text-xs font-mono text-foreground">{value}</span>
    </div>
  )
}

function CollapsibleCode({ title, badge, code, defaultOpen = false }: {
  title: string; badge: string; code: string; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [copied, setCopied] = useState(false)
  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
          <span className="text-sm font-medium">{title}</span>
          <Badge variant="outline" className="text-[10px]">{badge}</Badge>
        </div>
        <Button
          size="sm" variant="ghost" className="h-7 px-2"
          onClick={e => {
            e.stopPropagation()
            navigator.clipboard.writeText(code)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          <span className="ml-1 text-xs">{copied ? 'Copied' : 'Copy'}</span>
        </Button>
      </div>
      {open && (
        <pre className="p-4 text-xs overflow-x-auto bg-muted/10 max-h-72 text-foreground leading-relaxed">
          {code}
        </pre>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AdminTokensUploadPage() {
  // Upload state
  const [jsonInput, setJsonInput] = useState('')
  const [uploadedTokens, setUploadedTokens] = useState<any>(null)
  const [parseError, setParseError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Transform state
  const [transformed, setTransformed] = useState<TransformedOutput | null>(null)
  const [transforming, setTransforming] = useState(false)
  const [transformError, setTransformError] = useState('')

  // Preview state
  const [previewMode, setPreviewMode] = useState<TokenMode>('dark')
  const [previewTokens, setPreviewTokens] = useState<PreviewToken[]>([])

  // Apply state
  const [applyStatus, setApplyStatus] = useState<ApplyStatus>('idle')
  const [applyError, setApplyError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)

  // ── Parse ──────────────────────────────────────────────────────────────────

  const parseJson = useCallback((raw: string) => {
    setTransformed(null)
    setDraftSaved(false)
    setApplyStatus('idle')
    setApplyError('')
    try {
      const parsed = JSON.parse(raw)
      setUploadedTokens(parsed)
      setParseError('')
    } catch {
      setUploadedTokens(null)
      if (raw.trim()) setParseError('Invalid JSON — please check the format.')
      else setParseError('')
    }
  }, [])

  const loadFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const raw = e.target?.result as string
      setJsonInput(raw)
      parseJson(raw)
    }
    reader.readAsText(file)
  }

  // ── Transform ──────────────────────────────────────────────────────────────

  const handleTransform = async () => {
    if (!uploadedTokens) return
    setTransforming(true)
    setTransformError('')
    setTransformed(null)
    setDraftSaved(false)
    try {
      const res = await fetch('/api/tokens/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: uploadedTokens }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Transform failed')
      }
      const data: TransformedOutput = await res.json()
      setTransformed(data)

      // Build preview tokens
      const tokens: PreviewToken[] = []
      Object.entries(data.tokenMap).forEach(([collection, vars]) => {
        Object.entries(vars).forEach(([name, values]) => {
          tokens.push({
            name,
            cssVar: `--${collection}-${name}`,
            lightValue: values.light,
            darkValue: values.dark,
            type: classifyType(name, values.light),
          })
        })
      })
      setPreviewTokens(tokens)
    } catch (err: any) {
      setTransformError(err.message)
    } finally {
      setTransforming(false)
    }
  }

  // ── Draft ──────────────────────────────────────────────────────────────────

  const handleSaveDraft = async () => {
    if (!transformed) return
    setApplyStatus('saving_draft')
    try {
      const res = await fetch('/api/tokens/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ css: transformed.css.combined }),
      })
      if (!res.ok) throw new Error('Failed to save draft')
      setApplyStatus('draft_saved')
      setDraftSaved(true)
    } catch (err: any) {
      setApplyError(err.message)
      setApplyStatus('error')
    }
  }

  // ── Apply ──────────────────────────────────────────────────────────────────

  const handleApply = async () => {
    setShowConfirm(false)
    setApplyStatus('applying')
    try {
      const res = await fetch('/api/tokens/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ css: transformed?.css.combined }),
      })
      if (!res.ok) throw new Error('Failed to apply tokens')
      setApplyStatus('applied')
    } catch (err: any) {
      setApplyError(err.message)
      setApplyStatus('error')
    }
  }

  // ── Rollback ───────────────────────────────────────────────────────────────

  const handleRollback = async () => {
    try {
      const res = await fetch('/api/tokens/rollback', { method: 'POST' })
      if (!res.ok) throw new Error('Rollback failed')
      setApplyStatus('idle')
      setApplyError('')
      alert('Rollback successful. Reload the app to see the previous styles.')
    } catch (err: any) {
      setApplyError(err.message)
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const collectionKeys = uploadedTokens ? Object.keys(uploadedTokens) : []
  const colorTokens = previewTokens.filter(t => t.type === 'color')
  const spacingTokens = previewTokens.filter(t => t.type === 'spacing')
  const radiusTokens = previewTokens.filter(t => t.type === 'radius')
  const otherTokens = previewTokens.filter(t => t.type === 'other')
  const val = (t: PreviewToken) => previewMode === 'light' ? t.lightValue : t.darkValue

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold tracking-tight">Design Token Manager</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Upload your Figma Variables JSON, preview, then apply to the live app.
            </p>
          </div>
          <Badge variant="outline" className="text-xs shrink-0 mt-1">Admin only</Badge>
        </div>

        {/* ── Step 1: Upload ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">1</div>
              <CardTitle className="text-sm font-semibold">Upload Tokens JSON</CardTitle>
              {uploadedTokens && !parseError && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {collectionKeys.length} collections
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Drop zone */}
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                isDragging ? 'border-primary bg-primary/5' : 'hover:bg-muted/40',
                uploadedTokens && !parseError ? 'border-primary/50' : 'border-border',
              )}
              onClick={() => fileInputRef.current?.click()}
              onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) loadFile(f) }}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
            >
              {uploadedTokens && !parseError ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm font-medium">JSON loaded</p>
                  <p className="text-xs text-muted-foreground">Click to replace</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <FileJson className="w-9 h-9 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">Drag & drop your Figma tokens JSON</p>
                  <p className="text-xs text-muted-foreground">or click to browse</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept=".json" className="hidden"
                onChange={e => { if (e.target.files?.[0]) loadFile(e.target.files[0]) }} />
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or paste JSON</span>
              </div>
            </div>

            <textarea
              value={jsonInput}
              onChange={e => { setJsonInput(e.target.value); parseJson(e.target.value) }}
              placeholder={'{\n  "colors": {\n    "Light": { "primary": "#78fcd6" },\n    "Dark":  { "primary": "#5be8c0" }\n  },\n  "radius": { "sm": "4px", "md": "8px" }\n}'}
              className="w-full h-44 p-3 border rounded-lg font-mono text-xs bg-muted/20 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />

            {parseError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{parseError}</AlertDescription>
              </Alert>
            )}

            {uploadedTokens && !parseError && (
              <div className="flex flex-wrap gap-2">
                {collectionKeys.map(k => (
                  <Badge key={k} variant="secondary" className="text-xs">{k}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Step 2: Transform ──────────────────────────────────────────── */}
        <Card className={cn(!uploadedTokens && 'opacity-50 pointer-events-none')}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                uploadedTokens ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>2</div>
              <CardTitle className="text-sm font-semibold">Transform</CardTitle>
              {transformed && (
                <Badge className="ml-auto text-xs bg-green-500/10 text-green-500 border-green-500/20">
                  {transformed.totalTokens} tokens ready
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs pl-9">
              Converts Figma Variables JSON into CSS variables with separate light and dark mode blocks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleTransform} disabled={!uploadedTokens || transforming} className="w-full" size="lg">
              <Wand2 className="w-4 h-4 mr-2" />
              {transforming ? 'Transforming...' : 'Transform Tokens'}
            </Button>
            {transformError && (
              <Alert variant="destructive" className="mt-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{transformError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* ── Step 3: Preview ────────────────────────────────────────────── */}
        {transformed && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">3</div>
                <CardTitle className="text-sm font-semibold">Preview</CardTitle>
                {/* Mode toggle */}
                <div className="ml-auto flex items-center gap-0.5 border rounded-md p-0.5">
                  {(['light', 'dark'] as TokenMode[]).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setPreviewMode(mode)}
                      className={cn(
                        'flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors',
                        previewMode === mode
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {mode === 'light' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <CardDescription className="text-xs pl-9">
                Review your tokens before applying. Toggle between light and dark to check both modes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Colors */}
              {colorTokens.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                    Colors ({colorTokens.length})
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-3">
                    {colorTokens.map(t => (
                      <ColorSwatch key={t.cssVar} label={t.name} value={val(t)} cssVar={t.cssVar} />
                    ))}
                  </div>
                </div>
              )}

              {/* Spacing */}
              {spacingTokens.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                      Spacing ({spacingTokens.length})
                    </p>
                    <div className="space-y-0.5">
                      {spacingTokens.map(t => (
                        <SpacingBar key={t.cssVar} label={t.name} value={val(t)} />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Radius */}
              {radiusTokens.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                      Border Radius ({radiusTokens.length})
                    </p>
                    <div className="flex flex-wrap gap-5">
                      {radiusTokens.map(t => (
                        <div key={t.cssVar} className="flex flex-col items-center gap-1.5">
                          <div
                            className="w-12 h-12 bg-primary/15 border border-primary/30"
                            style={{ borderRadius: val(t) }}
                          />
                          <span className="text-[10px] text-muted-foreground">{t.name}</span>
                          <span className="text-[10px] font-mono">{val(t)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Other */}
              {otherTokens.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                      Other ({otherTokens.length})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {otherTokens.map(t => (
                        <div key={t.cssVar} className="flex justify-between items-center border rounded-md px-3 py-2 gap-2">
                          <span className="text-xs text-muted-foreground truncate">{t.name}</span>
                          <span className="text-xs font-mono shrink-0">{val(t)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Generated code */}
              <Separator />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                  Generated CSS
                </p>
                <div className="space-y-2">
                  <CollapsibleCode title="Combined (light + dark)" badge="globals.css" code={transformed.css.combined} defaultOpen />
                  <CollapsibleCode title="Light mode" badge=":root {}" code={transformed.css.light} />
                  <CollapsibleCode title="Dark mode" badge=".dark {}" code={transformed.css.dark} />
                </div>
              </div>

            </CardContent>
          </Card>
        )}

        {/* ── Step 4: Apply ──────────────────────────────────────────────── */}
        {transformed && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">4</div>
                <CardTitle className="text-sm font-semibold">Apply to App</CardTitle>
                {applyStatus === 'applied' && (
                  <Badge className="ml-auto text-xs bg-green-500/10 text-green-500 border-green-500/20">Live</Badge>
                )}
              </div>
              <CardDescription className="text-xs pl-9">
                Save a draft first to inspect, then apply to replace CSS variables in globals.css. A backup is created automatically before any change.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">

              {applyStatus === 'applied' ? (
                <Alert className="border-green-500/20 bg-green-500/5">
                  <ShieldCheck className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-sm text-green-600">
                    Tokens applied. The app is now using your new design tokens.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline" className="flex-1"
                    onClick={handleSaveDraft}
                    disabled={applyStatus === 'saving_draft' || applyStatus === 'applying'}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {applyStatus === 'saving_draft' ? 'Saving...' : draftSaved ? 'Draft Saved' : 'Save as Draft'}
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => setShowConfirm(true)}
                    disabled={applyStatus === 'applying'}
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    {applyStatus === 'applying' ? 'Applying...' : 'Apply to App'}
                  </Button>
                </div>
              )}

              <Button
                variant="ghost" size="sm"
                className="w-full text-muted-foreground hover:text-destructive"
                onClick={handleRollback}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-2" />
                Rollback to previous version
              </Button>

              {applyError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{applyError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

      </div>

      {/* ── Confirm modal ───────────────────────────────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Apply Design Tokens</CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowConfirm(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <CardDescription className="text-sm">
                This will replace the CSS variable block in{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">globals.css</code> with your new tokens.
                The current state is backed up automatically before applying.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleApply}>Confirm & Apply</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
