"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence, useAnimation } from "framer-motion"
import type { LayoutConfig, RestaurantMenu, MenuSection, MenuItem } from "@/lib/restaurant-menus/types"
import { Flame, Leaf, WheatOff, Sparkles } from "lucide-react"

const TAG_ICONS: Record<string, React.ElementType> = {
  spicy: Flame,
  vegan: Leaf,
  gluten_free: WheatOff,
  new: Sparkles,
}

const TAG_COLORS: Record<string, string> = {
  spicy: "#ef4444",
  vegan: "#22c55e",
  gluten_free: "#f59e0b",
  new: "#3b82f6",
}

// ─── Entrance animation variants ─────────────────────────────────────────────

const entranceVariants = {
  "stagger-fade": {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" },
    }),
  },
  "slide-up": {
    hidden: { opacity: 0, y: 48 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    }),
  },
  "zoom-in": {
    hidden: { opacity: 0, scale: 0.88 },
    visible: (i: number) => ({
      opacity: 1,
      scale: 1,
      transition: { delay: i * 0.05, duration: 0.4, ease: "easeOut" },
    }),
  },
  none: {
    hidden: { opacity: 1 },
    visible: { opacity: 1 },
  },
}

// ─── Ken Burns image component ────────────────────────────────────────────────

function KenBurnsImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="w-full h-full overflow-hidden">
      <motion.img
        src={src}
        alt={alt}
        crossOrigin="anonymous"
        className="w-full h-full object-cover"
        animate={{
          scale: [1, 1.08],
          x: [0, -12],
          y: [0, -8],
        }}
        transition={{
          duration: 12,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
    </div>
  )
}

// ─── Glow pulse wrapper ───────────────────────────────────────────────────────

function GlowPulse({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <motion.div
      animate={{
        boxShadow: [
          `0 0 0px ${color}00`,
          `0 0 20px ${color}55`,
          `0 0 0px ${color}00`,
        ],
      }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      style={{ borderRadius: "inherit" }}
    >
      {children}
    </motion.div>
  )
}

// ─── Shimmer overlay ──────────────────────────────────────────────────────────

function ShimmerOverlay() {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]"
      initial={{ x: "-100%" }}
      animate={{ x: "200%" }}
      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
      style={{
        background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)",
      }}
    />
  )
}

// ─── Vignette pulse background effect ────────────────────────────────────────

function VignettePulse() {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      style={{
        background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)",
      }}
    />
  )
}

// ─── Main Renderer ────────────────────────────────────────────────────────────

interface MenuBoardRendererProps {
  menu: RestaurantMenu & { menu_sections?: MenuSection[] }
  config: LayoutConfig
  /** Width in pixels of the rendering canvas. Defaults to viewport width. */
  width?: number
  /** Height in pixels. Defaults to aspect-ratio-based height. */
  height?: number
  /** Scale factor for embedding in a preview context */
  scale?: number
}

export function MenuBoardRenderer({ menu, config, width, height, scale = 1 }: MenuBoardRendererProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const { background, typography, layout, promo_area, animations, accent_color, orientation } = config

  const canvasWidth = width || (orientation === "landscape" ? 1920 : 1080)
  const canvasHeight = height || (orientation === "landscape" ? 1080 : 1920)

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
    // Use CSS background-image — most reliable approach inside a scaled container
    bgStyle.backgroundImage = `url("${background.image_url}")`
    bgStyle.backgroundSize = "cover"
    bgStyle.backgroundPosition = background.image_position === "top"
      ? "top center"
      : background.image_position === "bottom"
      ? "bottom center"
      : "center center"
    bgStyle.backgroundRepeat = "no-repeat"
    bgStyle.backgroundColor = "#111111"
  } else if (background.type === "image") {
    bgStyle.backgroundColor = "#111111"
  }

  const borderRadiusMap = { sharp: "0px", soft: "8px", pill: "999px" }
  const radius = borderRadiusMap[layout.border_radius]

  const fontSizeMap = {
    small: { title: 56, sectionLabel: 28, itemName: 22, itemDesc: 16, price: 26 },
    medium: { title: 72, sectionLabel: 36, itemName: 28, itemDesc: 18, price: 32 },
    large: { title: 88, sectionLabel: 44, itemName: 34, itemDesc: 20, price: 38 },
    xl: { title: 104, sectionLabel: 52, itemName: 40, itemDesc: 24, price: 44 },
  }
  const sizes = fontSizeMap[typography.size_scale] || fontSizeMap.medium

  const sections = (menu.menu_sections || [])
    .filter((s) => s.is_visible !== false)
    .sort((a, b) => a.position - b.position)

  const entranceKey = animations.entrance in entranceVariants ? animations.entrance : "stagger-fade"
  const itemVariants = entranceVariants[entranceKey as keyof typeof entranceVariants]

  // Flatten all visible items for stagger indexing
  let globalIndex = 0

  const brandLogoUrl = menu.brand_settings?.logo_url
  const restaurantName = menu.name

  if (!mounted) return null

  return (
    <div
      style={{
        width: canvasWidth * scale,
        height: canvasHeight * scale,
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {/* Canvas at native resolution, scaled down */}
      <div
        style={{
          width: canvasWidth,
          height: canvasHeight,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "relative",
          fontFamily: `"${typography.font_body}", sans-serif`,
          color: typography.text_color,
          overflow: "hidden",
          ...bgStyle,
        }}
      >
        {/* Ken Burns parallax effect — only when explicitly set */}
        {background.type === "image" && background.image_url && animations.background_effect === "parallax" && (
          <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
            <KenBurnsImage src={background.image_url} alt="" />
          </div>
        )}

        {/* Background overlay — sits on top of CSS background-image */}
        {background.type === "image" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              backgroundColor: background.overlay_color || "#000000",
              opacity: background.overlay_opacity ?? 0.5,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Vignette pulse effect */}
        {animations.background_effect === "vignette-pulse" && <VignettePulse />}

        {/* Top promo area */}
        {promo_area.position === "top" && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
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
          </motion.div>
        )}

        {/* Main content area — z-index 2 to sit above image (0) and overlay (1) */}
        <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column" }}>

          {/* Header */}
          {layout.header_style !== "none" && (
            <motion.div
              initial={{ opacity: 0, y: -24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: layout.header_style === "logo-center" ? "center" : "space-between",
                padding: "40px 64px 24px",
                borderBottom: `2px solid ${accent_color}33`,
                gap: 24,
              }}
            >
              {(layout.header_style === "logo-left") && (
                brandLogoUrl ? (
                  <img
                    src={brandLogoUrl}
                    alt={restaurantName}
                    crossOrigin="anonymous"
                    style={{ width: 80, height: 80, objectFit: "contain", borderRadius: radius, flexShrink: 0 }}
                  />
                ) : (
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: radius,
                      backgroundColor: accent_color + "33",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 36,
                      color: accent_color,
                      fontWeight: 700,
                      flexShrink: 0,
                      fontFamily: `"${typography.font_heading}", serif`,
                    }}
                  >
                    {restaurantName.charAt(0)}
                  </div>
                )
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
                  {restaurantName}
                </div>
              </div>

            </motion.div>
          )}

          {/* Sections grid */}
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
            {sections.map((section, si) => (
              <div key={section.id} style={{ paddingRight: si < layout.columns - 1 ? 48 : 0 }}>
                {/* Section header — always visible, style controls visual treatment */}
                <motion.div
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: si * 0.15 }}
                  style={{
                    marginBottom: 24,
                    paddingBottom: 12,
                    borderBottom: layout.section_style === "bold-label"
                      ? `3px solid ${accent_color}`
                      : layout.section_style === "subtle-divider"
                      ? `1px solid ${typography.text_color}22`
                      : `1px solid ${accent_color}33`,
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
                  {section.description && (
                    <div style={{ fontSize: sizes.itemDesc, color: typography.text_color + "66", marginTop: 4 }}>
                      {section.description}
                    </div>
                  )}
                </motion.div>

                {/* Items */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {(section.menu_items || [])
                    .filter((item) => item.is_available)
                    .sort((a, b) => a.position - b.position)
                    .map((item) => {
                      const itemIndex = globalIndex++
                      const isFeatured = item.is_featured
                      const showFeaturedEffect = isFeatured && animations.featured_item !== "none"

                      const itemContent = (
                        <motion.div
                          key={item.id}
                          custom={itemIndex}
                          variants={itemVariants as any}
                          initial="hidden"
                          animate="visible"
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 16,
                            padding: layout.item_style === "minimal" ? "8px 0" : "14px 18px",
                            backgroundColor: layout.item_style !== "minimal"
                              ? (isFeatured ? accent_color + "1a" : typography.text_color + "08")
                              : "transparent",
                            borderRadius: layout.item_style !== "minimal" ? radius : 0,
                            border: isFeatured ? `1px solid ${accent_color}44` : "1px solid transparent",
                            position: "relative",
                            overflow: "hidden",
                          }}
                        >
                          {/* Shimmer effect on featured items */}
                          {showFeaturedEffect && animations.featured_item === "shimmer" && (
                            <ShimmerOverlay />
                          )}

                          {/* Item image */}
                          {layout.item_style === "rich" && layout.show_item_image && item.image_url && (
                            <div
                              style={{
                                width: 88,
                                height: 88,
                                borderRadius: radius,
                                overflow: "hidden",
                                flexShrink: 0,
                              }}
                            >
                              {isFeatured && animations.featured_item === "ken-burns" ? (
                                <KenBurnsImage src={item.image_url} alt={item.name} />
                              ) : (
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  crossOrigin="anonymous"
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              )}
                            </div>
                          )}

                          {/* Item content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                  <span
                                    style={{
                                      fontFamily: layout.item_style !== "minimal" ? `"${typography.font_heading}", serif` : "inherit",
                                      fontSize: sizes.itemName,
                                      fontWeight: 600,
                                      color: typography.text_color,
                                    }}
                                  >
                                    {item.name}
                                  </span>
                                  {/* Tags */}
                                  {item.tags?.map((tag) => {
                                    const Icon = TAG_ICONS[tag]
                                    const color = TAG_COLORS[tag]
                                    if (!Icon) return null
                                    return (
                                      <Icon
                                        key={tag}
                                        size={sizes.itemDesc * 1.1}
                                        style={{ color, flexShrink: 0 }}
                                      />
                                    )
                                  })}
                                  {isFeatured && (
                                    <span
                                      style={{
                                        fontSize: sizes.itemDesc * 0.75,
                                        backgroundColor: accent_color,
                                        color: "#000",
                                        padding: "2px 10px",
                                        borderRadius: "999px",
                                        fontWeight: 700,
                                        letterSpacing: 0.5,
                                        flexShrink: 0,
                                      }}
                                    >
                                      Chef&apos;s Pick
                                    </span>
                                  )}
                                </div>
                                {layout.item_style !== "minimal" && item.description && (
                                  <div
                                    style={{
                                      fontSize: sizes.itemDesc,
                                      color: typography.text_color + "88",
                                      marginTop: 5,
                                      lineHeight: 1.5,
                                    }}
                                  >
                                    {item.description}
                                  </div>
                                )}
                                {/* Variation prices */}
                                {layout.item_style !== "minimal" && Object.keys(item.variation_prices || {}).length > 0 && (
                                  <div style={{ marginTop: 6, display: "flex", gap: 12, flexWrap: "wrap" }}>
                                    {Object.entries(item.variation_prices).map(([k, v]) => (
                                      <span
                                        key={k}
                                        style={{
                                          fontSize: sizes.itemDesc * 0.85,
                                          color: typography.text_color + "aa",
                                        }}
                                      >
                                        {k}: <strong style={{ color: typography.price_color }}>{v}</strong>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {item.price && (
                                <div
                                  style={{
                                    fontSize: sizes.price,
                                    fontWeight: 700,
                                    color: typography.price_color,
                                    flexShrink: 0,
                                    fontFamily: `"${typography.font_heading}", serif`,
                                    lineHeight: 1,
                                  }}
                                >
                                  {item.price}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )

                      // Wrap featured items in glow pulse
                      if (showFeaturedEffect && animations.featured_item === "glow-pulse") {
                        return (
                          <GlowPulse key={item.id} color={accent_color}>
                            {itemContent}
                          </GlowPulse>
                        )
                      }

                      return itemContent
                    })}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom promo area */}
          {promo_area.position === "bottom" && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.8 }}
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
              <div
                style={{
                  width: 2,
                  height: 32,
                  backgroundColor: promo_area.style === "full-bleed" ? "#00000033" : accent_color + "44",
                }}
              />
              <div
                style={{
                  fontSize: sizes.itemDesc,
                  color: promo_area.style === "full-bleed" ? "#000" : typography.text_color + "cc",
                }}
              >
                Mon–Fri 4PM–7PM · 20% Off All Drinks
              </div>
            </motion.div>
          )}
        </div>

        {/* Google Fonts loader */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(typography.font_heading)}:wght@400;600;700&family=${encodeURIComponent(typography.font_body)}:wght@400;500;600&display=swap');
        `}</style>
      </div>
    </div>
  )
}
