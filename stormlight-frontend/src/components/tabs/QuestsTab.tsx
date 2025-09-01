import { Scroll } from 'lucide-react'

interface TabProps {
  username: string;
  playerData: any;
  API_URL: string;
}

export const QuestsTab = ({ username: _username, playerData: _playerData, API_URL: _API_URL }: TabProps) => {
  return (
    <div className="text-center py-12">
      <Scroll className="w-16 h-16 text-slate-400 mx-auto mb-4" />
      <p className="text-slate-400 text-lg">Quest progress coming soon</p>
      <p className="text-slate-500 text-sm mt-2">Quest completion tracking and progress</p>
    </div>
  )
}
