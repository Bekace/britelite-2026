"use client"

import { useState, useEffect } from "react"
import { Receipt, Download, ExternalLink, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getInvoices } from "@/lib/actions/stripe"
import { useToast } from "@/hooks/use-toast"

interface Invoice {
  id: string
  number: string | null
  status: string | null
  amount: number
  currency: string
  created: number
  pdfUrl: string | null
  hostedUrl: string | null
  description?: string | null
}

export function InvoicesList() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    setLoading(true)
    const result = await getInvoices()
    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    } else if (result.invoices) {
      setInvoices(result.invoices)
    }
    setLoading(false)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount)
  }

  const getStatusBadge = (status: string | null) => {
    const statusColors = {
      paid: "bg-green-500/10 text-green-500",
      open: "bg-blue-500/10 text-blue-500",
      void: "bg-gray-500/10 text-gray-500",
      uncollectible: "bg-red-500/10 text-red-500",
    }

    const color = statusColors[status as keyof typeof statusColors] || statusColors.open

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
        {status || "open"}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-8">
        <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">No invoices found</p>
        <p className="text-xs text-muted-foreground mt-2">Your invoices will appear here after your first payment</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {invoices.map((invoice) => (
        <Card key={invoice.id} className="p-3 lg:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-muted/50 rounded-lg flex-shrink-0">
                <Receipt className="w-4 h-4 lg:w-5 lg:h-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm lg:text-base truncate">{invoice.number || invoice.description || "Payment"}</span>
                  {getStatusBadge(invoice.status)}
                </div>
                <p className="text-xs lg:text-sm text-muted-foreground">{formatDate(invoice.created)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pl-11 sm:pl-0">
              <span className="font-semibold text-sm lg:text-base">{formatAmount(invoice.amount, invoice.currency)}</span>
              <div className="flex items-center gap-2">
                {invoice.pdfUrl && (
                  <Button size="sm" variant="outline" className="h-8 text-xs lg:text-sm" asChild>
                    <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="w-3.5 h-3.5 lg:w-4 lg:h-4 mr-1.5" />
                      PDF
                    </a>
                  </Button>
                )}
                {invoice.hostedUrl && (
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild>
                    <a href={invoice.hostedUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
