export function DashboardPreview() {
  return (
    <div className="w-[calc(100vw-32px)] md:w-[1400px]">
      <div className="bg-primary-light/50 rounded-2xl p-2 shadow-2xl text-white bg-teal-300">
        <video
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/DISPL-compress-2Evaetaq5I8rlQQzrQ6qMF3vdgoPnw.mp4"
          width={1160}
          height={700}
          className="w-full h-full object-cover rounded-xl shadow-lg"
          autoPlay
          muted
          loop
          playsInline
        />
      </div>
    </div>
  )
}
