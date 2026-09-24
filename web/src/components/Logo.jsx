import logo from "../assets/logo.png";

/**
 * Renders the MotoSecure mark. `withWordmark` also shows a crisp text
 * lockup (used where the raster wordmark inside the PNG is too small,
 * e.g. the collapsed sidebar or dark nav bars).
 */
export default function Logo({ size = 40, withWordmark = false, className = "" }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={logo}
        alt="MotoSecure"
        width={size}
        height={size}
        className="rounded-xl object-contain shrink-0"
        style={{ width: size, height: size }}
      />
      {withWordmark && (
        <span className="font-display font-extrabold text-lg leading-none tracking-tight">
          <span className="text-navy-800 dark:text-white">Moto</span>
          <span className="text-gold-500">Secure</span>
        </span>
      )}
    </div>
  );
}
