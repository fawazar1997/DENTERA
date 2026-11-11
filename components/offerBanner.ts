// Kept under components/ so Tailwind sees these classes.

/** The offer banner's size: the home page carousel and each offer's page match. */
export function offerBannerSizeClass(hasPhoneImage: boolean): string {
  // Phone versions are 4:5 (1080 × 1350): give them their full shape.
  return `sm:h-[26rem] lg:h-[30rem] ${hasPhoneImage ? "aspect-[4/5] sm:aspect-auto" : "h-[22rem]"}`;
}
