"use client"

import { useEffect, useRef } from "react"
import type { LayoutConfig } from "@/lib/restaurant-menus/types"

// Sample data for preview
const SAMPLE_RESTAURANT = {
  name: "La Bella Casa",
  tagline: "Authentic Italian Cuisine",
  logo: null,
}

const SAMPLE_SECTIONS = [
  {
    name: "Starters",
    items: [
      { name: "Bruschetta al Pomodoro", description: "Grilled bread with fresh tomatoes & basil", price: "$8.99", featured: true, image: null },
      { name: "Calamari Fritti", description: "Crispy fried squid with marinara sauce", price: "$12.99", featured: false, image: null },
      { name: "Caprese Salad", description: "Fresh mozzarella, tomato & basil", price: "$10.99", featured: false, image: null },
    ],
  },
  {
    name: "Main Course",
    items: [
      { name: "Spaghetti Carbonara", description: "Pancetta, egg, pecorino romano & black pepper", price: "$18.99", featured: true, image: null },
      { name: "Risotto ai Funghi", description: "Arborio rice with wild mushrooms & truffle oil", price: "$22.99", featured: false, image: null },
      { name: "Grilled Branzino", description: "Mediterranean sea bass with lemon & herbs", price: "$28.99", featured: false, image: null },
      { name: "Osso Buco Milanese", description: "Braised veal shank with gremolata & saffron risotto", price: "$34.99", featured: false, image: null },
    ],
  },
  {
    name: "Desserts",
    items: [
      { name: "Tiramisu", description: "Classic Italian dessert with mascarpone & espresso", price: "$9.99", featured: false, image: null },
      { name: "Panna Cotta", description: "Vanilla cream with fresh berry compote", price: "$8.99", featured: false, image: null },
    ],
  },
]

interface TemplatePreviewProps {
  config: LayoutConfig
  scale?: number
  logoUrl?: string
}

export function TemplatePreview({ config, scale = 0.4, logoUrl }: TemplatePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const { background, typography, layout, promo_area, animations, accent_color, orientation } = config

  // Build background style
  const bgStyle: React.CSSProperties = {}
  if (background.type === "solid") {
    bgStyle.backgroundColor = background.color || "#1a1a1a"
  } else if (background.type === "gradient") {
    const dir = background.gradient_direction === "to-right"
      ? "to right"
      : background.gradient_direction === "to-bottom-right"
      ? "to bottom right"
      : "to bottom"
    bgStyle.background = `linear-gradient(${dir}, ${background.gradient_from || "#1a1a1a"}, ${background.gradient_to || "#2d2d2d"})`
  } else if (background.type === "image" && background.image_url) {
    bgStyle.backgroundImage = `url("${background.image_url}")`
    bgStyle.backgroundSize = "cover"
    bgStyle.backgroundPosition = background.image_position === "top" ? "top center"
      : background.image_position === "bottom" ? "bottom center"
      : "center center"
    bgStyle.backgroundRepeat = "no-repeat"
    bgStyle.backgroundColor = "#111111"
  } else if (background.type === "image") {
    bgStyle.backgroundColor = "#111111"
  }

  const canvasWidth = orientation === "landscape" ? 1920 : 1080
  const canvasHeight = orientation === "landscape" ? 1080 : 1920

  const fontSizeMap = {
    small: { title: 56, sectionLabel: 28, itemName: 22, itemDesc: 16, price: 26 },
    medium: { title: 72, sectionLabel: 36, itemName: 28, itemDesc: 18, price: 32 },
    large: { title: 88, sectionLabel: 44, itemName: 34, itemDesc: 20, price: 38 },
    xl: { title: 104, sectionLabel: 52, itemName: 40, itemDesc: 24, price: 44 },
  }

  const sizes = fontSizeMap[typography.size_scale] || fontSizeMap.medium

  const borderRadiusMap = {
    sharp: "0px",
    soft: "8px",
    pill: "999px",
  }
  const radius = borderRadiusMap[layout.border_radius]

  const visibleSections = layout.columns === 1
    ? SAMPLE_SECTIONS.slice(0, 2)
    : layout.columns === 2
    ? SAMPLE_SECTIONS
    : SAMPLE_SECTIONS

  const itemsPerSection = layout.item_style === "minimal" ? 5 : layout.item_style === "standard" ? 4 : 3

  return (
    <div
      style={{
        width: canvasWidth * scale,
        height: canvasHeight * scale,
        overflow: "hidden",
        borderRadius: 8,
        flexShrink: 0,
        position: "relative",
      }}
    >
      {/* Canvas at native size, scaled down */}
      <div
        ref={containerRef}
        style={{
          width: canvasWidth,
          height: canvasHeight,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "relative",
          fontFamily: `"${typography.font_body}", sans-serif`,
          color: typography.text_color,
          ...bgStyle,
        }}
      >
        {/* Background overlay — z-index 1, sits on CSS background-image */}
        {background.type === "image" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: background.overlay_color || "#000000",
              opacity: background.overlay_opacity ?? 0.5,
              zIndex: 1,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Promo area — top */}
        {promo_area.position === "top" && (
          <div
            style={{
              position: "relative",
              zIndex: 2,
              backgroundColor: accent_color,
              color: "#000",
              textAlign: "center",
              padding: "16px 32px",
              fontSize: sizes.itemDesc,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            TODAY&apos;S SPECIAL — HAPPY HOUR 4PM-7PM — 20% OFF ALL DRINKS
          </div>
        )}

        {/* Main content */}
        <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column" }}>
          {/* Header */}
          {layout.header_style !== "none" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: layout.header_style === "logo-center" ? "center" : "space-between",
                padding: "40px 64px 24px",
                borderBottom: `2px solid ${accent_color}22`,
                gap: 24,
              }}
            >
              {layout.header_style === "logo-left" && (
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: radius,
                    backgroundColor: accent_color + "33",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 32,
                    color: accent_color,
                    fontWeight: 700,
                    flexShrink: 0,
                    overflow: "hidden",
                  }}
                >
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    SAMPLE_RESTAURANT.name.charAt(0)
                  )}
                </div>
              )}
              <div style={{ textAlign: layout.header_style === "logo-center" ? "center" : "left" }}>
                <div
                  style={{
                    fontFamily: `"${typography.font_heading}", serif`,
                    fontSize: sizes.title,
                    fontWeight: 700,
                    color: typography.text_color,
                    lineHeight: 1.1,
                    letterSpacing: -1,
                  }}
                >
                  {SAMPLE_RESTAURANT.name}
                </div>
                <div style={{ fontSize: sizes.itemDesc, color: accent_color, marginTop: 8, letterSpacing: 3, textTransform: "uppercase" }}>
                  {SAMPLE_RESTAURANT.tagline}
                </div>
              </div>
              {layout.header_style === "logo-left" && (
                <div style={{ textAlign: "right", fontSize: sizes.itemDesc * 0.85, color: typography.text_color + "88" }}>
                  <div>Open Daily</div>
                  <div style={{ color: accent_color }}>11:00 AM – 10:00 PM</div>
                </div>
              )}
            </div>
          )}

          {/* Menu grid */}
          <div
            style={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
              gap: 0,
              padding: "32px 64px",
              overflow: "hidden",
            }}
          >
            {visibleSections.map((section, si) => (
              <div key={si} style={{ paddingRight: si < layout.columns - 1 ? 48 : 0 }}>
                {/* Section label */}
                {layout.section_style !== "none" && (
                  <div
                    style={{
                      marginBottom: 24,
                      paddingBottom: 12,
                      borderBottom: layout.section_style === "bold-label"
                        ? `3px solid ${accent_color}`
                        : `1px solid ${typography.text_color}22`,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: `"${typography.font_heading}", serif`,
                        fontSize: sizes.sectionLabel,
                        fontWeight: 700,
                        color: layout.section_style === "bold-label" ? accent_color : typography.text_color,
                        letterSpacing: 1,
                        textTransform: "uppercase",
                      }}
                    >
                      {section.name}
                    </div>
                  </div>
                )}

                {/* Items */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {section.items.slice(0, itemsPerSection).map((item, ii) => (
                    <div
                      key={ii}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 16,
                        padding: layout.item_style === "minimal" ? "8px 0" : "12px 16px",
                        backgroundColor: layout.item_style !== "minimal"
                          ? (item.featured ? accent_color + "18" : typography.text_color + "08")
                          : "transparent",
                        borderRadius: layout.item_style !== "minimal" ? radius : 0,
                        border: item.featured ? `1px solid ${accent_color}44` : "none",
                      }}
                    >
                      {/* Item image placeholder */}
                      {layout.item_style === "rich" && layout.show_item_image && (
                        <div
                          style={{
                            width: 80,
                            height: 80,
                            borderRadius: radius,
                            backgroundColor: accent_color + "22",
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 24,
                            color: accent_color + "66",
                          }}
                        >
                          ▣
                        </div>
                      )}

                      {/* Item content */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                          <div
                            style={{
                              fontFamily: layout.item_style !== "minimal" ? `"${typography.font_heading}", serif` : "inherit",
                              fontSize: sizes.itemName,
                              fontWeight: layout.item_style !== "minimal" ? 600 : 500,
                              color: typography.text_color,
                              flex: 1,
                            }}
                          >
                            {item.name}
                            {item.featured && (
                              <span
                                style={{
                                  marginLeft: 12,
                                  fontSize: sizes.itemDesc * 0.8,
                                  backgroundColor: accent_color,
                                  color: "#000",
                                  padding: "2px 10px",
                                  borderRadius: "999px",
                                  fontWeight: 700,
                                  letterSpacing: 1,
                                  textTransform: "uppercase",
                                  verticalAlign: "middle",
                                }}
                              >
                                Chef&apos;s Pick
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: sizes.price,
                              fontWeight: 700,
                              color: typography.price_color,
                              flexShrink: 0,
                              fontFamily: `"${typography.font_heading}", serif`,
                            }}
                          >
                            {item.price}
                          </div>
                        </div>
                        {layout.item_style !== "minimal" && (
                          <div
                            style={{
                              fontSize: sizes.itemDesc,
                              color: typography.text_color + "88",
                              marginTop: 6,
                              lineHeight: 1.5,
                            }}
                          >
                            {item.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Promo area — bottom */}
          {promo_area.position === "bottom" && (
            <div
              style={{
                position: "relative",
                zIndex: 2,
                backgroundColor: promo_area.style === "full-bleed" ? accent_color : "transparent",
                borderTop: promo_area.style !== "full-bleed" ? `2px solid ${accent_color}44` : "none",
                margin: promo_area.style === "card" ? "0 64px 32px" : 0,
                borderRadius: promo_area.style === "card" ? radius : 0,
                padding: "20px 64px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 48,
              }}
            >
              <div
                style={{
                  fontSize: sizes.itemName,
                  fontWeight: 700,
                  color: promo_area.style === "full-bleed" ? "#000" : accent_color,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                }}
              >
                Happy Hour
              </div>
              <div style={{ width: 2, height: 32, backgroundColor: promo_area.style === "full-bleed" ? "#00000033" : accent_color + "44" }} />
              <div style={{ fontSize: sizes.itemDesc, color: promo_area.style === "full-bleed" ? "#000" : typography.text_color + "cc" }}>
                Mon–Fri 4PM–7PM · 20% Off All Drinks
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
