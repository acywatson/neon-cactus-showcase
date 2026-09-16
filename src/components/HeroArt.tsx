export function HeroArt() {
  return (
    <figure className="hero-art" aria-labelledby="hero-art-caption">
      <svg viewBox="0 0 760 720" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="sky-top" />
            <stop offset="1" className="sky-bottom" />
          </linearGradient>
          <linearGradient id="sun" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" className="sun-start" />
            <stop offset="1" className="sun-end" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect width="760" height="720" rx="20" fill="url(#sky)" />
        <circle cx="570" cy="170" r="104" fill="url(#sun)" filter="url(#glow)" />
        <path className="sky-scan" d="M466 145h208M468 172h204M480 200h180M500 228h140" />
        <path className="far-city" d="M0 350h72v-84h42v84h52V218h74v132h42V290h80v60h40V250h72v100h68v-126h68v126h56v-62h56v62h80v370H0z" />
        <path className="near-city" d="M0 455h112V338h62v117h58v-71h94v71h72V322h78v133h86V376h70v79h128v265H0z" />
        <path className="road" d="M0 720 242 455h252L760 720z" />
        <path className="road-line" d="m350 720 18-265M475 720 418 455" />
        <path className="cactus cactus-one" d="M84 544v-94c0-24 34-24 34 0v28h22v-20c0-20 30-20 30 0v48c0 20-16 36-36 36h-16v76H84z" />
        <path className="cactus cactus-two" d="M650 484v-70c0-18 26-18 26 0v18h18v-14c0-16 24-16 24 0v38c0 16-13 28-29 28h-13v58h-26z" />
        <path className="runner-coat" d="m312 538-68 138h244l-82-138-12-92-66 2z" />
        <circle className="runner-head" cx="361" cy="405" r="50" />
        <path className="runner-hat" d="M282 397h166l-25-28-124 2zM323 371l14-72h58l25 72z" />
        <path className="runner-arm" d="m326 492-104 59 20 35 111-44zM397 492l92 20-6 43-102-13z" />
        <path className="runner-gun" d="m478 503 132-10 10 28-132 25z" />
        <path className="runner-cyan" d="M351 449h20v92h-20zM303 549h122l12 23H291z" filter="url(#glow)" />
        <path className="neon-sign" d="M82 112h220v108H82z" />
        <text x="192" y="154" textAnchor="middle" className="neon-copy">NEON</text>
        <text x="192" y="193" textAnchor="middle" className="neon-copy neon-copy-alt">CACTUS</text>
        <path className="rain" d="m82 24-38 72m178-72-38 72m178-72-38 72m178-72-38 72m178-72-38 72M120 248l-38 72m178-72-38 72m358-72-38 72M92 460l-38 72m590-72-38 72" />
      </svg>
      <figcaption id="hero-art-caption" className="visually-hidden">
        Stylized neon city key art supplied as a replaceable template placeholder.
      </figcaption>
    </figure>
  );
}
