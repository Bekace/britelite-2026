// ─── Layout Config Schema ─────────────────────────────────────────────────────

export interface TemplateBackground {
  type: "solid" | "gradient" | "image"
  color?: string
  gradient_from?: string
  gradient_to?: string
  gradient_direction?: "to-bottom" | "to-right" | "to-bottom-right"
  image_url?: string
  image_position?: "center" | "top" | "bottom" | "fill"
  overlay_color?: string
  overlay_opacity?: number // 0–1
}

export interface TemplateTypography {
  font_heading: string
  font_body: string
  size_scale: "small" | "medium" | "large" | "xl"
  text_color: string
  price_color: string
}

export interface TemplateLayout {
  columns: 1 | 2 | 3
  header_style: "logo-left" | "logo-center" | "title-only" | "none"
  item_style: "minimal" | "standard" | "rich"
  show_item_image: boolean
  section_style: "bold-label" | "subtle-divider" | "none"
  border_radius: "sharp" | "soft" | "pill"
}

export interface TemplatePromoArea {
  position: "none" | "top" | "bottom" | "side"
  style: "banner" | "card" | "full-bleed"
}

export interface TemplateAnimations {
  entrance: "stagger-fade" | "slide-up" | "zoom-in" | "none"
  featured_item: "glow-pulse" | "shimmer" | "ken-burns" | "none"
  background_effect: "parallax" | "vignette-pulse" | "none"
}

export interface LayoutConfig {
  background: TemplateBackground
  typography: TemplateTypography
  layout: TemplateLayout
  promo_area: TemplatePromoArea
  animations: TemplateAnimations
  accent_color: string
  orientation: "landscape" | "portrait"
}

// ─── Database Row Types ────────────────────────────────────────────────────────

export interface MenuTemplate {
  id: string
  name: string
  description?: string
  thumbnail_url?: string
  layout_config: LayoutConfig
  orientation: "landscape" | "portrait"
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RestaurantMenu {
  id: string
  user_id: string
  name: string
  description?: string
  template_id?: string
  brand_settings: {
    logo_url?: string
    primary_color?: string
  }
  status: "draft" | "published"
  created_at: string
  updated_at: string
  menu_template?: MenuTemplate
}

export interface MenuSection {
  id: string
  menu_id: string
  name: string
  description?: string
  position: number
  is_visible: boolean
  created_at: string
  menu_items?: MenuItem[]
}

export interface MenuItem {
  id: string
  section_id: string
  name: string
  description?: string
  price?: string
  image_url?: string
  is_available: boolean
  is_featured: boolean
  tags: string[]
  variation_prices: Record<string, string>
  position: number
  created_at: string
}

export interface MenuScene {
  id: string
  menu_id: string
  user_id: string
  name: string
  orientation: "landscape" | "portrait"
  status: "draft" | "published"
  created_at: string
  updated_at: string
}

// ─── Default Layout Config ────────────────────────────────────────────────────

export const defaultLayoutConfig: LayoutConfig = {
  background: {
    type: "solid",
    color: "#1a1a1a",
    overlay_color: "#000000",
    overlay_opacity: 0.5,
    image_position: "fill",
  },
  typography: {
    font_heading: "Playfair Display",
    font_body: "Inter",
    size_scale: "medium",
    text_color: "#ffffff",
    price_color: "#e8b86d",
  },
  layout: {
    columns: 2,
    header_style: "logo-left",
    item_style: "standard",
    show_item_image: false,
    section_style: "bold-label",
    border_radius: "soft",
  },
  promo_area: {
    position: "none",
    style: "banner",
  },
  animations: {
    entrance: "stagger-fade",
    featured_item: "glow-pulse",
    background_effect: "none",
  },
  accent_color: "#e8b86d",
  orientation: "landscape",
}

// ─── Google Fonts List ────────────────────────────────────────────────────────

export const GOOGLE_FONTS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Raleway",
  "Poppins",
  "Nunito",
  "Source Sans 3",
  "Playfair Display",
  "Merriweather",
  "Lora",
  "Crimson Text",
  "Cormorant Garamond",
  "EB Garamond",
  "DM Serif Display",
  "Libre Baskerville",
  "Josefin Sans",
  "Oswald",
  "Bebas Neue",
  "Anton",
  "Barlow",
  "Exo 2",
  "Quicksand",
  "Ubuntu",
  "Rubik",
  "Work Sans",
  "Karla",
  "DM Sans",
  "Space Grotesk",
]
