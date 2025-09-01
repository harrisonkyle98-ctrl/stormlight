import { FileText } from 'lucide-react'

interface TabProps {
  username: string;
  playerData: any;
  API_URL: string;
}

export const LogTab = ({ username: _username, playerData: _playerData, API_URL: _API_URL }: TabProps) => {
  return (
    <div className="text-center py-12">
      <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
      <p className="text-slate-400 text-lg">Activity log coming soon</p>
      <p className="text-slate-500 text-sm mt-2">Detailed activity and event history</p>
    </div>
  )
}
