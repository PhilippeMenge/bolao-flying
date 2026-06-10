// Faixa de bandeirinhas verde-amarelo-azul-branco, como rua enfeitada pra Copa.
export function Bandeirinhas() {
  return (
    <svg aria-hidden className="block h-3 w-full" preserveAspectRatio="none">
      <defs>
        <pattern id="bandeirinhas" width="72" height="12" patternUnits="userSpaceOnUse">
          <polygon points="0,0 18,0 9,12" fill="#009739" />
          <polygon points="18,0 36,0 27,12" fill="#ffc400" />
          <polygon points="36,0 54,0 45,12" fill="#04257c" />
          <polygon points="54,0 72,0 63,12" fill="#fffdf4" />
        </pattern>
      </defs>
      <rect width="100%" height="12" fill="url(#bandeirinhas)" />
    </svg>
  );
}
