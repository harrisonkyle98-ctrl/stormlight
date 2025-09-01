import { Package } from 'lucide-react'

interface TabProps {
  username: string;
  playerData: any;
  API_URL: string;
}

export const DropsTab = ({ username: _username, playerData: _playerData, API_URL: _API_URL }: TabProps) => {
  return (
    <div className="text-center py-12">
      <Package className="w-16 h-16 text-slate-400 mx-auto mb-4" />
      <p className="text-slate-400 text-lg">Drops tracking coming soon</p>
      <p className="text-slate-500 text-sm mt-2">Rare drops and loot tracking</p>
    </div>
  )
}
