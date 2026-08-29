import Image from "next/image";

export function HomeBanner({ bannerUrl }: { bannerUrl?: string }) {
  if (!bannerUrl) return null;

  return (
    <div className="relative h-56 w-full overflow-hidden sm:h-72 lg:h-96">
      <Image
        src={bannerUrl}
        alt=""
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
    </div>
  );
}
