const logoAvifSrcSet = [
  "/images/optimized/site-church-logo-64.avif 64w",
  "/images/optimized/site-church-logo-96.avif 96w",
  "/images/optimized/site-church-logo-128.avif 128w",
].join(", ");

const logoWebpSrcSet = [
  "/images/optimized/site-church-logo-64.webp 64w",
  "/images/optimized/site-church-logo-96.webp 96w",
  "/images/optimized/site-church-logo-128.webp 128w",
].join(", ");

export default function ChurchLogoImage({
  alt = "Goodwill Presbyterian Church Logo",
  className = "",
  pictureClassName = "",
  sizes = "64px",
  width = 64,
  height = 64,
}) {
  return (
    <picture className={pictureClassName}>
      <source type="image/avif" srcSet={logoAvifSrcSet} sizes={sizes} />
      <source type="image/webp" srcSet={logoWebpSrcSet} sizes={sizes} />
      <img
        src="/images/optimized/site-church-logo-128.webp"
        alt={alt}
        className={className}
        width={width}
        height={height}
        decoding="async"
      />
    </picture>
  );
}
