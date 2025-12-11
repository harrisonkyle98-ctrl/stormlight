import { Link } from 'react-router-dom'
import { Tooltip } from './ui/tooltip'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  const trackerResetTooltipContent = (
    <div className="text-left space-y-2">
      <div>
        <span className="text-slate-300 font-medium">Daily Reset:</span>
        <span className="text-slate-400 ml-1">00:00 UTC</span>
      </div>
      <div>
        <span className="text-slate-300 font-medium">Monthly Reset:</span>
        <span className="text-slate-400 ml-1">1st day at 00:00 UTC</span>
      </div>
      <div>
        <span className="text-slate-300 font-medium">Yearly Reset:</span>
        <span className="text-slate-400 ml-1">January 1st at 00:00 UTC</span>
      </div>
      <div>
        <span className="text-slate-300 font-medium">Competition Reset:</span>
        <span className="text-slate-400 ml-1">Based on competition end date</span>
      </div>
    </div>
  )

  return (
    <footer className="w-full py-6 mt-8">
      <div className="text-center text-sm text-slate-500">
        <span>Stormlight &copy; {currentYear}</span>
        <span className="mx-2">|</span>
        <Link 
          to="/terms" 
          className="hover:text-slate-300 transition-colors"
        >
          Terms &amp; Conditions
        </Link>
        <span className="mx-2">|</span>
        <Tooltip
          title="Tracker Reset Times"
          description={trackerResetTooltipContent}
          placement="top"
        >
          <span className="cursor-help hover:text-slate-300 transition-colors">
            Tracker Reset
          </span>
        </Tooltip>
      </div>
    </footer>
  )
}

export default Footer
