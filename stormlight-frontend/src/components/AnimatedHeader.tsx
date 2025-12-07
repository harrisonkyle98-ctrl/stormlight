import './AnimatedHeader.css'

const AnimatedHeader = () => {
  return (
    <div className="hero-header">
      {/* Cloud animation background */}
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
