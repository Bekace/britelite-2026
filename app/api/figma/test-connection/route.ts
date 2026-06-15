import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const token = process.env.FIGMA_TOKEN
    const fileId = process.env.FIGMA_FILE_ID

    if (!token || !fileId) {
      return NextResponse.json(
        { error: 'Missing FIGMA_TOKEN or FIGMA_FILE_ID in environment variables' },
        { status: 400 }
      )
    }

    // Test basic file access
    const fileResponse = await fetch(
      `https://api.figma.com/v1/files/${fileId}`,
      {
        headers: {
          'X-Figma-Token': token,
        },
      }
    )

    if (!fileResponse.ok) {
      if (fileResponse.status === 403) {
        return NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'Token does not have permission. Make sure the token has "file_variables:read" scope.',
          },
          { status: 403 }
        )
      }
      return NextResponse.json(
        { error: `Figma API error: ${fileResponse.status}` },
        { status: fileResponse.status }
      )
    }

    // Fetch variables
    const variablesResponse = await fetch(
      `https://api.figma.com/v1/files/${fileId}/variables/local`,
      {
        headers: {
          'X-Figma-Token': token,
        },
      }
    )

    if (!variablesResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch variables: ${variablesResponse.status}` },
        { status: variablesResponse.status }
      )
    }

    const variablesData = await variablesResponse.json()
    const variables = variablesData.variables || {}

    // Count tokens and collect collections
    const collections = new Set<string>()
    let tokenCount = 0

    Object.values(variables).forEach((variable: any) => {
      if (variable.name) {
        const parts = variable.name.split('/')
        if (parts[0]) {
          collections.add(parts[0])
        }
        tokenCount++
      }
    })

    return NextResponse.json({
      status: 'connected',
      tokenCount,
      collections: Array.from(collections),
      variables,
      message: 'Successfully connected to Figma API',
    })
  } catch (error) {
    console.error('Figma connection error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to Figma API', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
