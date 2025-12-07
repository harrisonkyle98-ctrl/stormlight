import './AnimatedHeader.css'

const AnimatedHeader = () => {
  // Generate falling star elements
  const fallingStars = Array.from({ length: 20 }, (_, i) => (
    <div key={i} className="falling-star"></div>
  ))

  return (
    <div className="hero-header">
      {/* Starfall animation layer - sits behind clouds */}
      <div className="starfall">
        {fallingStars}
      </div>
      {/* Cloud animation layer - sits above starfall */}
      <div className="clouds">
        <div className="clouds-1"></div>
        <div className="clouds-2"></div>
        <div className="clouds-3"></div>
      </div>
      {/* Logo floats visually above clouds but inside the hero block */}
      <h1 
        className="stormlight-logo"
      >
        StormLight
      </h1>
    </div>
  )
}

export default AnimatedHeader
