'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import tokensData from '@/design-tokens/tokens.json'

export default function TokensPreviewPage() {
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedToken(text)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const ColorSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Color Palette</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(tokensData.colors || {}).map(([name, token]: any) => (
            <Card key={name} className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className="w-16 h-16 rounded-lg border border-border flex-shrink-0"
                  style={{ backgroundColor: token.$value }}
                  title={token.$value}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate">{name}</h4>
                  <p className="text-xs text-muted-foreground mb-2 truncate">{token.$description}</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded flex-1 overflow-x-auto">
                      {token.$value}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(`var(--color-${name})`)}
                      className="h-7 w-7 p-0"
                    >
                      {copiedToken === `var(--color-${name})` ? (
                        <Check className="w-4 h-4 text-primary" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )

  const SpacingSection = () => (
    <div className="space-y-8">
      {/* Spacing Scale */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Spacing Scale</h3>
        <div className="space-y-4">
          {Object.entries(tokensData.space || {}).map(([name, token]: any) => (
            <div key={`space-${name}`} className="flex items-center gap-4">
              <div className="w-24 text-sm font-medium">{name}</div>
              <div className="flex items-center gap-2 flex-1">
                <div
                  className="bg-primary/20 border border-primary/50 rounded"
                  style={{ width: token.$value }}
                  title={token.$value}
                />
                <code className="text-xs bg-muted px-2 py-1 rounded">{token.$value}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(`var(--space-${name})`)}
                  className="h-7 w-7 p-0"
                >
                  {copiedToken === `var(--space-${name})` ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Padding */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Padding</h3>
        <div className="space-y-4">
          {Object.entries(tokensData.padding || {}).map(([name, token]: any) => (
            <div key={`padding-${name}`} className="flex items-center gap-4">
              <div className="w-24 text-sm font-medium">{name}</div>
              <div className="flex items-center gap-2 flex-1">
                <div
                  className="bg-primary/20 border border-primary/50 rounded"
                  style={{ width: token.$value }}
                />
                <code className="text-xs bg-muted px-2 py-1 rounded">{token.$value}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(`var(--padding-${name})`)}
                  className="h-7 w-7 p-0"
                >
                  {copiedToken === `var(--padding-${name})` ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gap */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Gap</h3>
        <div className="space-y-4">
          {Object.entries(tokensData.gap || {}).map(([name, token]: any) => (
            <div key={`gap-${name}`} className="flex items-center gap-4">
              <div className="w-24 text-sm font-medium">{name}</div>
              <div className="flex items-center gap-2 flex-1">
                <div
                  className="bg-primary/20 border border-primary/50 rounded"
                  style={{ width: token.$value }}
                />
                <code className="text-xs bg-muted px-2 py-1 rounded">{token.$value}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(`var(--gap-${name})`)}
                  className="h-7 w-7 p-0"
                >
                  {copiedToken === `var(--gap-${name})` ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const RadiusSection = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Border Radius</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(tokensData.radius || {}).map(([name, token]: any) => (
          <Card key={name} className="p-6">
            <div className="space-y-4">
              <div
                className="w-full h-32 bg-gradient-to-br from-primary to-secondary"
                style={{ borderRadius: token.$value }}
              />
              <div>
                <h4 className="font-semibold text-sm">{name}</h4>
                <div className="flex items-center gap-2 mt-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1">{token.$value}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(`var(--radius-${name})`)}
                    className="h-7 w-7 p-0"
                  >
                    {copiedToken === `var(--radius-${name})` ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )

  const TokensTableSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">All Tokens Reference</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold">Token Name</th>
                <th className="text-left py-3 px-4 font-semibold">Value</th>
                <th className="text-left py-3 px-4 font-semibold">Type</th>
                <th className="text-left py-3 px-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(tokensData).map(([category, tokens]: any) => {
                if (category.startsWith('$')) return null
                return Object.entries(tokens || {}).map(([name, token]: any, idx) => (
                  <tr key={`${category}-${name}`} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 font-mono text-xs">{`${category}.${name}`}</td>
                    <td className="py-3 px-4 text-xs">{token.$value}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{token.$type}</td>
                    <td className="py-3 px-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(`var(--${category}-${name})`)}
                        className="h-7 w-7 p-0"
                      >
                        {copiedToken === `var(--${category}-${name})` ? (
                          <Check className="w-4 h-4 text-primary" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </td>
                  </tr>
                ))
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Design Tokens</h1>
          <p className="text-muted-foreground">
            Live preview of all design tokens from your Figma design system. Click any value to copy it.
          </p>
        </div>

        <Tabs defaultValue="colors" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="spacing">Spacing</TabsTrigger>
            <TabsTrigger value="radius">Radius</TabsTrigger>
            <TabsTrigger value="all">All Tokens</TabsTrigger>
          </TabsList>

          <TabsContent value="colors" className="space-y-6">
            <ColorSection />
          </TabsContent>

          <TabsContent value="spacing" className="space-y-6">
            <SpacingSection />
          </TabsContent>

          <TabsContent value="radius" className="space-y-6">
            <RadiusSection />
          </TabsContent>

          <TabsContent value="all" className="space-y-6">
            <TokensTableSection />
          </TabsContent>
        </Tabs>

        <Card className="mt-12 p-6 bg-muted/50">
          <h3 className="font-semibold mb-2">How to use tokens in your code:</h3>
          <div className="bg-background p-4 rounded font-mono text-sm overflow-x-auto">
            <p className="text-muted-foreground mb-2">CSS:</p>
            <code className="text-foreground">color: var(--color-primary);</code>
            <p className="text-muted-foreground mt-4 mb-2">Tailwind:</p>
            <code className="text-foreground">className="text-primary bg-secondary"</code>
          </div>
        </Card>
      </div>
    </main>
  )
}
