import React from 'react';
import { Task } from '../hooks/useTasks';

interface CalendarDay {
  date: string | null;
  isCurrentMonth: boolean;
  isToday: boolean;
}

interface TaskCalendarProps {
  tasks: Task[];
  calendarYear: number;
  calendarMonth: number;
  setCalendarMonth: (month: number) => void;
  setCalendarYear: (year: number) => void;
}

export const TaskCalendar: React.FC<TaskCalendarProps> = ({
  tasks,
  calendarYear,
  calendarMonth,
  setCalendarMonth,
  setCalendarYear
}) => {
  // 日曆日期生成函數
  const generateCalendarDays = (year: number, month: number): CalendarDay[] => {
    const today = new Date();
    
    // 獲取指定月份的第一天
    const firstDayOfMonth = new Date(year, month, 1);
    // 獲取指定月份的最後一天
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // 確定日曆開始日期（當月第一天所在的週的週日）
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    // 確定日曆結束日期（當月最後一天所在的週的週六）
    const endDate = new Date(lastDayOfMonth);
    const daysToAdd = 6 - endDate.getDay();
    endDate.setDate(endDate.getDate() + daysToAdd);
    
    const days: CalendarDay[] = [];
    const currentDate = new Date(startDate);
    
    // 創建從startDate到endDate的所有日期
    while (currentDate <= endDate) {
      const isCurrentMonth = currentDate.getMonth() === month;
      const isToday = 
        currentDate.getDate() === today.getDate() && 
        currentDate.getMonth() === today.getMonth() && 
        currentDate.getFullYear() === today.getFullYear();
      
      days.push({
        date: currentDate.toISOString().split('T')[0],
        isCurrentMonth,
        isToday
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">任務規劃日曆</h3>
        <div className="flex items-center space-x-4">
          <button 
            className="p-2 rounded-full hover:bg-gray-100" 
            onClick={() => {
              const newMonth = calendarMonth - 1;
              if (newMonth < 0) {
                setCalendarMonth(11);
                setCalendarYear(calendarYear - 1);
              } else {
                setCalendarMonth(newMonth);
              }
            }}
          >
            <i className="fas fa-chevron-left"></i>
          </button>
          <div className="text-lg font-medium">
            {`${calendarYear}年${calendarMonth + 1}月`}
          </div>
          <button 
            className="p-2 rounded-full hover:bg-gray-100" 
            onClick={() => {
              const newMonth = calendarMonth + 1;
              if (newMonth > 11) {
                setCalendarMonth(0);
                setCalendarYear(calendarYear + 1);
              } else {
                setCalendarMonth(newMonth);
              }
            }}
          >
            <i className="fas fa-chevron-right"></i>
          </button>
          <button 
            className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200"
            onClick={() => {
              const today = new Date();
              setCalendarMonth(today.getMonth());
              setCalendarYear(today.getFullYear());
            }}
          >
            今天
          </button>
        </div>
      </div>
      <div className="calendar-container">
        <div className="calendar-header grid grid-cols-7 gap-1 mb-2">
          {['週日', '週一', '週二', '週三', '週四', '週五', '週六'].map(day => (
            <div key={day} className="text-center font-medium py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="calendar-body grid grid-cols-7 gap-1">
          {generateCalendarDays(calendarYear, calendarMonth).map((day, index) => {
            // 修改任務篩選邏輯，顯示開始日期和結束日期之間的所有任務
            const tasksForDay = day.date ? tasks.filter(task => {
              // 如果開始日期或結束日期為空，則跳過該任務
              if (!task.startDate || !task.dueDate || task.startDate === '' || task.dueDate === '') {
                return false;
              }
              
              // 確保day.date不為null
              if (!day.date) return false;
              
              const currentDate = new Date(day.date);
              const startDate = new Date(task.startDate);
              const dueDate = new Date(task.dueDate);
              
              // 將時間設為零以便只比較日期部分
              currentDate.setHours(0, 0, 0, 0);
              startDate.setHours(0, 0, 0, 0);
              dueDate.setHours(0, 0, 0, 0);
              
              // 檢查當前日期是否在開始日期和結束日期之間（包含兩端）
              return currentDate >= startDate && currentDate <= dueDate;
            }) : [];
            
            return (
              <div 
                key={index} 
                className={`min-h-20 p-1 border ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'} ${day.isToday ? 'border-indigo-500' : 'border-gray-200'}`}
              >
                {day.date && (
                  <>
                    <div className={`text-right ${day.isToday ? 'font-bold text-indigo-600' : ''}`}>
                      {new Date(day.date).getDate()}
                    </div>
                    <div className="task-list">
                      {tasksForDay.map(task => (
                        <div 
                          key={task.id} 
                          className={`text-xs p-1 my-1 rounded truncate ${task.completed ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}
                          title={task.text}
                        >
                          {task.text}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}; 