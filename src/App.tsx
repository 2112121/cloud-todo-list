// The exported code uses Tailwind CSS. Install Tailwind CSS in your dev environment to ensure all styles work.
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as echarts from 'echarts';
import { User } from 'firebase/auth';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Auth from './components/Auth';
import UserProfile from './components/UserProfile';
import { addTask as addTaskToFirestore, getTasks, updateTask as updateTaskInFirestore, deleteTask as deleteTaskFromFirestore } from './firebase';
import { Timestamp } from 'firebase/firestore';
import { useTasks } from './hooks/useTasks';
import { TaskCalendar } from './components/TaskCalendar';
import { formatDate, isUpcoming, isOverdue } from './utils/dateUtils';
import { Task } from './hooks/useTasks';
import { categoryColors } from './constants/categories';

// 日曆日期生成函數
interface CalendarDay {
    date: string | null;
    isCurrentMonth: boolean;
    isToday: boolean;
}

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

// 將任務項抽離為獨立組件
const TaskItem: React.FC<{
    task: Task;
    toggleComplete: (id: string) => Promise<void>;
    handleDeleteTask: (id: string) => Promise<void>;
}> = ({ task, toggleComplete, handleDeleteTask }) => {
    return (
        <div
            className={`bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between transition-all border border-slate-200 hover:shadow-md ${
                task.completed ? 'opacity-60 bg-slate-50' : ''
            }`}
        >
            <div className="flex items-start sm:items-center w-full sm:w-auto mb-3 sm:mb-0">
                <div className="relative mr-4">
                    <button
                        className={`w-7 h-7 rounded-full border-2 flex-shrink-0 flex items-center justify-center cursor-pointer select-none btn-check ${
                            task.completed
                                ? 'bg-green-500 border-green-500'
                                : 'border-gray-400 hover:border-indigo-500 hover:shadow-md'
                        }`}
                        onClick={() => toggleComplete(task.id)}
                    >
                        {task.completed && <i className="fas fa-check text-white text-sm"></i>}
                    </button>
                    {!task.completed && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                        </span>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`text-gray-800 break-words ${task.completed ? 'line-through' : ''}`}>
                        {task.text}
                    </p>
                    <div className="flex flex-wrap items-center mt-1 gap-2">
                        <span
                            className={`text-sm ${
                                task.completed
                                    ? 'text-gray-500'
                                    : isOverdue(task.dueDate)
                                    ? 'text-red-500 font-medium'
                                    : isUpcoming(task.dueDate)
                                    ? 'text-orange-500 font-medium'
                                    : 'text-gray-500'
                            }`}
                        >
                            <i
                                className={`${
                                    isOverdue(task.dueDate) && !task.completed
                                        ? 'fas fa-exclamation-circle mr-1'
                                        : 'far fa-calendar-alt mr-1'
                                }`}
                            ></i>
                            {formatDate(task.dueDate)}
                            {isUpcoming(task.dueDate) && !task.completed && (
                                <span className="ml-1 text-xs font-medium bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
                                    即將到期
                                </span>
                            )}
                            {isOverdue(task.dueDate) && !task.completed && (
                                <span className="ml-1 text-xs font-medium bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                                    已過期
                                </span>
                            )}
                        </span>
                        <span
                            className={`text-sm px-2 py-1 rounded-full flex items-center ${
                                categoryColors[task.category]?.bg || 'bg-gray-100'
                            } ${categoryColors[task.category]?.text || 'text-gray-600'}`}
                        >
                            <i className={`${categoryColors[task.category]?.icon || 'fas fa-tag'} mr-1`}></i>
                            {task.category}
                        </span>
                    </div>
                </div>
            </div>
            <button
                className="text-gray-400 hover:text-red-500 cursor-pointer p-2 rounded-full self-end sm:self-center select-none btn-delete"
                onClick={() => handleDeleteTask(task.id)}
            >
                <i className="fas fa-trash-alt"></i>
            </button>
        </div>
    );
};

// 將任務添加模態框抽離為獨立組件
const AddTaskModal: React.FC<{
    showAddModal: boolean;
    setShowAddModal: (show: boolean) => void;
    newTask: string;
    setNewTask: (value: string) => void;
    startDate: string;
    setStartDate: (value: string) => void;
    dueDate: string;
    setDueDate: (value: string) => void;
    selectedCategory: string;
    setSelectedCategory: (value: string) => void;
    handleAddTask: () => Promise<void>;
}> = ({
    showAddModal,
    setShowAddModal,
    newTask,
    setNewTask,
    startDate,
    setStartDate,
    dueDate,
    setDueDate,
    selectedCategory,
    setSelectedCategory,
    handleAddTask,
}) => {
    if (!showAddModal) return null;
    
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 w-full max-w-md shadow-xl border border-slate-200">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-3 sm:mb-4">新增任務</h2>
                <input
                    type="text"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    placeholder="需要完成什麼事項？"
                    className="w-full px-3 sm:px-4 py-2 rounded-lg border border-slate-300 mb-3 sm:mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400"
                />
                <div className="mb-4 sm:mb-5">
                    <label className="block text-gray-700 mb-2">開始日期</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 rounded-lg border border-slate-300 mb-3 sm:mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                    />
                </div>
                <div className="mb-4 sm:mb-5">
                    <label className="block text-gray-700 mb-2">截止日期</label>
                    <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 rounded-lg border border-slate-300 mb-3 sm:mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                    />
                </div>
                <div className="mb-4 sm:mb-5">
                    <label className="block text-gray-700 mb-2">類別</label>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                    >
                        {Object.keys(categoryColors).map((category) => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-wrap gap-2 justify-end">
                    <button
                        className="px-3 sm:px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer whitespace-nowrap border border-slate-200 select-none btn-white"
                        onClick={() => setShowAddModal(false)}
                    >
                        取消
                    </button>
                    <button
                        className="px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer whitespace-nowrap shadow-md select-none btn-primary"
                        onClick={handleAddTask}
                    >
                        新增任務
                    </button>
                </div>
            </div>
        </div>
    );
};

// 主應用程序組件
const AppContent: React.FC = () => {
    const { currentUser, isLoading, authError } = useAuth();
    const {
        tasks,
        isLoading: isTasksLoading,
        error: taskError,
        addTask,
        toggleTaskComplete,
        deleteTask,
        clearError
    } = useTasks();
    
    const [newTask, setNewTask] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('工作');
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [showCalendarView, setShowCalendarView] = useState(false);
    const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
    const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth());

    // 處理身份驗證錯誤
    useEffect(() => {
        if (authError) {
            setErrorMessage(`身份驗證錯誤: ${authError}`);
            console.error("認證錯誤:", authError);
            
            // 如果是配置錯誤，添加更具體的幫助信息
            if (authError.includes("配置錯誤") || authError.includes("API 密鑰無效")) {
                setErrorMessage(`${authError}。請檢查 Firebase 配置。`);
            }
        } else if (taskError) {
            setErrorMessage(taskError);
        } else {
            setErrorMessage(null);
        }
    }, [authError, taskError]);

    // 使用useMemo緩存過濾後的任務
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            if (activeFilter === 'completed') return task.completed;
            if (activeFilter === 'active') return !task.completed;
            return true;
        });
    }, [tasks, activeFilter]);

    // 使用useCallback緩存函數
    const handleAddTaskWrapper = useCallback(async () => {
        if (await addTask(newTask, startDate, dueDate, selectedCategory)) {
            setNewTask('');
            setShowAddModal(false);
        }
    }, [addTask, newTask, startDate, dueDate, selectedCategory]);

    // 處理登出
    const handleLogout = useCallback(() => {
        setErrorMessage(null);
        setShowProfileMenu(false);
    }, []);

    // 處理登錄成功
    const handleLoginSuccess = useCallback(() => {
        setErrorMessage(null);
    }, []);

    // 關閉錯誤消息
    const handleCloseError = useCallback(() => {
        setErrorMessage(null);
        clearError();
    }, [clearError]);

    // 將toggleTaskComplete和deleteTask包裝成返回void的函數
    const toggleComplete = useCallback(async (taskId: string): Promise<void> => {
        await toggleTaskComplete(taskId);
        // 不返回任何值，確保返回類型為Promise<void>
    }, [toggleTaskComplete]);

    const handleDeleteTask = useCallback(async (taskId: string): Promise<void> => {
        await deleteTask(taskId);
        // 不返回任何值，確保返回類型為Promise<void>
    }, [deleteTask]);

    // 當用戶未驗證時顯示登錄頁面
    if (!currentUser && !isLoading) {
        return <Auth 
            onLoginSuccess={handleLoginSuccess} 
            onError={(error) => setErrorMessage(error?.message || "認證錯誤")} 
        />;
    }

    // 顯示加載指示器
    if (isLoading) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-slate-100 to-white">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                    <p className="mt-4 text-lg text-gray-600">載入中...</p>
                </div>
            </div>
        );
    }

    // 主應用界面
    return (
        <div className="min-h-screen w-full bg-gradient-to-b from-slate-100 to-white">
            {errorMessage && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded fixed top-4 right-4 left-4 z-50 flex justify-between items-center">
                    <span className="block sm:inline">{errorMessage}</span>
                    <button 
                        className="ml-4 px-3 py-1 text-red-700 hover:bg-red-200 rounded-lg" 
                        onClick={handleCloseError}
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            )}
            
            <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
                {/* 頂部導航欄 */}
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                    <div className="flex items-center">
                        <h1 className="text-3xl font-bold text-gray-800">待辦事項</h1>
                    </div>
                    <UserProfile 
                        user={currentUser} 
                        onLogout={handleLogout}
                        showMenu={showProfileMenu}
                        toggleMenu={() => setShowProfileMenu(!showProfileMenu)}
                    />
                </div>

                {/* 進度圖表 */}
                <div className="mb-6 sm:mb-8 bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-slate-200">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-3 sm:mb-4">任務進度</h2>
                    <div id="taskProgressChart" style={{ height: '180px' }}></div>
                </div>

                {/* 篩選按鈕 */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {[
                        { key: 'all', label: '全部' },
                        { key: 'active', label: '進行中' },
                        { key: 'completed', label: '已完成' }
                    ].map(({ key, label }) => (
                        <button
                            key={key}
                            className={`px-4 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap select-none ${
                                activeFilter === key
                                    ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 btn-primary'
                                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 btn-white'
                            }`}
                            onClick={() => setActiveFilter(key)}
                        >
                            {label}
                        </button>
                    ))}
                    <button
                        className={`px-4 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap select-none ${
                            showCalendarView
                                ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 btn-primary'
                                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 btn-white'
                        }`}
                        onClick={() => setShowCalendarView(!showCalendarView)}
                    >
                        <i className="fas fa-calendar-alt mr-1"></i>
                        {showCalendarView ? '列表視圖' : '日曆視圖'}
                    </button>
                </div>

                {/* 添加任務按鈕 */}
                <button
                    className="mb-6 px-6 py-3 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors flex items-center cursor-pointer whitespace-nowrap select-none btn-primary"
                    onClick={() => setShowAddModal(true)}
                >
                    <i className="fas fa-plus mr-2"></i>
                    新增任務
                </button>

                {/* 任務列表或日曆視圖 */}
                {showCalendarView ? (
                    <TaskCalendar
                        tasks={tasks}
                        calendarYear={calendarYear}
                        calendarMonth={calendarMonth}
                        setCalendarMonth={setCalendarMonth}
                        setCalendarYear={setCalendarYear}
                    />
                ) : (
                    <div className="space-y-3 sm:space-y-4">
                        {isTasksLoading ? (
                            <div className="text-center py-8">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
                                <p className="mt-2 text-gray-600">加載任務中...</p>
                            </div>
                        ) : filteredTasks.length > 0 ? (
                            filteredTasks.map(task => (
                                <TaskItem 
                                    key={task.id} 
                                    task={task}
                                    toggleComplete={toggleComplete}
                                    handleDeleteTask={handleDeleteTask}
                                />
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4">
                                    <i className="fas fa-check-circle text-blue-200"></i>
                                </div>
                                <h3 className="text-xl font-medium text-gray-600 mb-2">目前沒有待辦事項</h3>
                                <p className="text-gray-500">新增您的第一個任務開始使用</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 添加任務模態框 */}
            <AddTaskModal 
                showAddModal={showAddModal}
                setShowAddModal={setShowAddModal}
                newTask={newTask}
                setNewTask={setNewTask}
                startDate={startDate}
                setStartDate={setStartDate}
                dueDate={dueDate}
                setDueDate={setDueDate}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                handleAddTask={handleAddTaskWrapper}
            />
        </div>
    );
};

// 包裝App組件使用AuthProvider
const App: React.FC = () => {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
};

export default App;
