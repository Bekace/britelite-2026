import { ArrowRight, BarChart3, Monitor, Cpu } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

export function AIMediaPlayerSection() {
  return (
    <section className="px-6 py-16 md:py-24">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left side - Product showcase */}
        <div className="relative">
          <div className="relative bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 rounded-3xl p-8 lg:p-12 overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-300/20 to-transparent"></div>
            <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-2xl transform rotate-12"></div>
            <div className="absolute bottom-8 left-8 w-24 h-24 bg-white/5 rounded-xl transform -rotate-6"></div>

            {/* Product images */}
            <div className="relative z-10">
              <div className="mb-8">
                <Image
                  src="/modern-digital-signage-media-player-device-with-po.png"
                  alt="AI Media Player Device"
                  width={300}
                  height={200}
                  className="rounded-xl shadow-2xl"
                />
              </div>
              <div className="flex justify-end">
                <Image
                  src="/tablet-or-screen-display-showing-digital-signage-i.png"
                  alt="Digital Display Screen"
                  width={200}
                  height={150}
                  className="rounded-lg shadow-xl transform rotate-3"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Content */}
        <div className="space-y-8">
          <div className="space-y-6">
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground text-balance">
              AI Media Player
              <br />
              for Easy Start
            </h2>

            {/* Pricing badge */}
            <div className="inline-block">
              <div className="bg-yellow-300 text-black px-4 py-2 rounded-lg font-semibold">$756/year *</div>
            </div>

            {/* Features */}
            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span>AI-powered analytics</span>
              </div>
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                <span>Software</span>
              </div>
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                <span>Hardware</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-muted-foreground text-lg leading-relaxed">
              Place the DISPL Fast Start Kit in your store (exit zone/checkout zone/etc.) and start seeing real data
              about your visitors immediately!
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              View more
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" size="lg">
              Contact us
            </Button>
          </div>

          {/* Disclaimer */}
          <div className="text-xs text-muted-foreground space-y-2">
            <p>* Let us know if you have your own equipment. You can purchase software subscription separately.</p>
            <p>
              Prices do not include shipping, customs duties, and taxes. For pricing information in your region, please
              contact your local representative.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
