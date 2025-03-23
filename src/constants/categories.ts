// 定義類別和對應的顏色
export const categoryColors: Record<string, {bg: string, text: string, icon: string}> = {
  '工作': {bg: 'bg-blue-100', text: 'text-blue-600', icon: 'fas fa-briefcase'},
  '學習': {bg: 'bg-yellow-100', text: 'text-yellow-600', icon: 'fas fa-book'},
  '生活': {bg: 'bg-green-100', text: 'text-green-600', icon: 'fas fa-home'},
  '健康': {bg: 'bg-red-100', text: 'text-red-600', icon: 'fas fa-heartbeat'},
  '娛樂': {bg: 'bg-purple-100', text: 'text-purple-600', icon: 'fas fa-gamepad'},
  '約會': {bg: 'bg-pink-100', text: 'text-pink-600', icon: 'fas fa-heart'},
  '開會': {bg: 'bg-indigo-100', text: 'text-indigo-600', icon: 'fas fa-users'},
  '其他': {bg: 'bg-gray-100', text: 'text-gray-600', icon: 'fas fa-ellipsis-h'}
}; 