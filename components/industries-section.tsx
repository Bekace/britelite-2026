import Image from "next/image"
import { ArrowUpRight } from "lucide-react"

export function IndustriesSection() {
  const industries = [
    {
      title: "Media Owners",
      description: "Built for Media Owners. Includes everything for direct and programmatic DooH Ad Sales",
      image: "/media-owner-advertising-billboard.png",
    },
    {
      title: "Malls",
      description: "Maximize Ad revenue and increase customer retention by 10% in Malls",
      image: "/shopping-mall-retail-customers.png",
    },
    {
      title: "Consumer Electronics",
      description: "More sales in Consumer Electronics and Telco with AI Digital Signage & Analytics",
      image: "/consumer-electronics-store-technology.png",
    },
    {
      title: "Restaurants & Cafes",
      description: "Sales performance platform for QSR and casual restaurants",
      image: "/restaurant-chef-kitchen-food-service.png",
    },
    {
      title: "Hotels & Resorts",
      description: "Everything you need for Hotels & Resorts offline marketing in one platform",
      image: "/hotel-resort-hospitality-service.png",
    },
    {
      title: "Food Retail",
      description: "Maximize Ad revenue and increase sales up to 30% in Food Retail",
      image: "/food-retail-grocery-store-shopping.png",
    },
  ]

  return (
    <section className="py-16 px-6">
      <div className="text-center mb-12">
        <h2 className="text-4xl text-white mb-6 text-balance md:text-6xl font-semibold">
          AI-Powered Digital Signage
          <br />
          for Every Industry
        </h2>
        <p className="text-gray-300 text-lg max-w-2xl mx-auto text-balance">
          From food retail to hospitality, Xkreen empowers businesses with AI-powered signage to connect with customers,
          optimize campaigns, and scale effortlessly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {industries.map((industry, index) => (
          <div
            key={index}
            className="relative group overflow-hidden rounded-2xl bg-gray-900 aspect-[4/3] cursor-pointer transition-transform duration-300 hover:scale-105"
          >
            <Image
              src={industry.image || "/placeholder.svg"}
              alt={industry.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

            <div className="absolute top-4 right-4">
              <ArrowUpRight className="w-6 h-6 text-white opacity-70 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h3 className="text-white text-xl font-semibold mb-2">{industry.title}</h3>
              <p className="text-gray-200 text-sm leading-relaxed">{industry.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
