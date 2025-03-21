// The exported code uses Tailwind CSS. Install Tailwind CSS in your dev environment to ensure all styles work.
import React, { useState, useEffect } from 'react';
import * as echarts from 'echarts';
import { User } from 'firebase/auth';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Auth from './components/Auth';
import UserProfile from './components/UserProfile';
import { addTaskToFirestore, getUserTasks, updateTaskInFirestore, deleteTaskFromFirestore } from './firebase';

// 添加日期格式化功能
const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '無日期';
    const date = new Date(dateString);
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
};

// 檢查任務是否即將到期 (3天内)
const isUpcoming = (dateString: string | undefined): boolean => {
    if (!dateString) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateString);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    return diffDays >= 0 && diffDays <= 3;
};

// 檢查任務是否已過期
const isOverdue = (dateString: string | undefined): boolean => {
    if (!dateString) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateString);
    dueDate.setHours(0, 0, 0, 0);
    
    return dueDate < today;
};

interface Task {
    id: string;
    text: string;
    completed: boolean;
    dueDate: string;
    category: string;
}

// 定義類別和對應的顏色
const categoryColors: Record<string, {bg: string, text: string, icon: string}> = {
    '工作': {bg: 'bg-blue-100', text: 'text-blue-600', icon: 'fas fa-briefcase'},
    '學習': {bg: 'bg-yellow-100', text: 'text-yellow-600', icon: 'fas fa-book'},
    '生活': {bg: 'bg-green-100', text: 'text-green-600', icon: 'fas fa-home'},
    '健康': {bg: 'bg-red-100', text: 'text-red-600', icon: 'fas fa-heartbeat'},
    '娛樂': {bg: 'bg-purple-100', text: 'text-purple-600', icon: 'fas fa-gamepad'},
    '約會': {bg: 'bg-pink-100', text: 'text-pink-600', icon: 'fas fa-heart'},
    '開會': {bg: 'bg-indigo-100', text: 'text-indigo-600', icon: 'fas fa-users'},
    '其他': {bg: 'bg-gray-100', text: 'text-gray-600', icon: 'fas fa-ellipsis-h'}
};

// 主應用程序組件
const AppContent: React.FC = () => {
    const { currentUser, isLoading, authError } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTask, setNewTask] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('工作');
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [dueDate, setDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isTasksLoading, setIsTasksLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // 處理身份驗證錯誤
    useEffect(() => {
        if (authError) {
            setErrorMessage(`身份驗證錯誤: ${authError}`);
            console.error("認證錯誤:", authError);
            
            // 如果是配置錯誤，添加更具體的幫助信息
            if (authError.includes("配置錯誤") || authError.includes("API 密鑰無效")) {
                setErrorMessage(`${authError}。請檢查 Firebase 配置。`);
            }
        } else {
            setErrorMessage(null);
        }
    }, [authError]);

    // 載入用戶任務
    useEffect(() => {
        const loadTasks = async () => {
            if (currentUser?.uid) {
                setIsTasksLoading(true);
                try {
                    const userTasks = await getUserTasks(currentUser.uid);
                    setTasks(userTasks as Task[]);
                    setErrorMessage(null);
                } catch (error: any) {
                    console.error('加載任務失敗:', error);
                    
                    // 提供更具體的錯誤信息
                    if (error.message && error.message.includes('permission')) {
                        setErrorMessage('權限錯誤：您沒有足夠的權限讀取任務。可能需要重新登錄或等待 Firestore 規則生效（大約 1 分鐘）。');
                    } else if (error.code === 'permission-denied') {
                        setErrorMessage('權限錯誤：您沒有足夠的權限讀取任務。可能需要重新登錄或等待 Firestore 規則生效（大約 1 分鐘）。');
                    } else {
                        setErrorMessage(`加載任務失敗: ${error.message || '未知錯誤'}`);
                    }
                } finally {
                    setIsTasksLoading(false);
                }
            }
        };

        if (currentUser) {
            loadTasks();
        } else {
            // 如果沒有當前用戶，清空任務列表
            setTasks([]);
        }
    }, [currentUser]);

    // 初始化圖表
    useEffect(() => {
        const chartDom = document.getElementById('taskProgressChart');
        if (chartDom) {
            const myChart = echarts.init(chartDom);
            const completedTasks = tasks.filter(task => task.completed).length;
            const totalTasks = tasks.length;
            const option = {
                animation: false,
                series: [
                    {
                        type: 'gauge',
                        startAngle: 90,
                        endAngle: -270,
                        pointer: { show: false },
                        progress: {
                            show: true,
                            overlap: false,
                            roundCap: true,
                            clip: false,
                            itemStyle: {
                                color: '#4F46E5'
                            },
                        },
                        axisLine: {
                            lineStyle: {
                                width: 18,
                                color: [[1, '#E2E8F0']],
                            },
                        },
                        splitLine: { show: false },
                        axisTick: { show: false },
                        axisLabel: { show: false },
                        detail: {
                            valueAnimation: true,
                            formatter: '{value}%',
                            color: '#4F46E5',
                            fontSize: 24,
                            fontWeight: 'bold',
                        },
                        data: [
                            {
                                value: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
                            },
                        ],
                    },
                ],
            };
            myChart.setOption(option);

            // 清理函數
            return () => {
                myChart.dispose();
            };
        }
    }, [tasks]);

    // 添加任務
    const addTask = async () => {
        if (newTask.trim() && currentUser?.uid) {
            const taskData = {
                text: newTask,
                completed: false,
                dueDate: dueDate,
                category: selectedCategory,
                createdAt: new Date()
            };

            try {
                const addedTask = await addTaskToFirestore(currentUser.uid, taskData);
                setTasks([addedTask as Task, ...tasks]);
                setNewTask('');
                setShowAddModal(false);
            } catch (error) {
                console.error('添加任務失敗:', error);
            }
        }
    };

    // 切換任務完成狀態
    const toggleComplete = async (taskId: string) => {
        if (!currentUser?.uid) return;

        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const updatedTask = { ...task, completed: !task.completed };
        
        try {
            await updateTaskInFirestore(taskId, { completed: !task.completed });
            setTasks(
                tasks.map((t) => (t.id === taskId ? updatedTask : t))
            );
        } catch (error) {
            console.error('更新任務失敗:', error);
        }
    };

    // 刪除任務
    const deleteTask = async (taskId: string) => {
        if (!currentUser?.uid) return;

        try {
            await deleteTaskFromFirestore(taskId);
            setTasks(tasks.filter(task => task.id !== taskId));
        } catch (error) {
            console.error('刪除任務失敗:', error);
        }
    };

    // 過濾任務
    const filteredTasks = tasks.filter(task => {
        if (activeFilter === 'completed') return task.completed;
        if (activeFilter === 'active') return !task.completed;
        return true;
    });

    // 處理登出
    const handleLogout = () => {
        setTasks([]);
        setErrorMessage(null);
        setShowProfileMenu(false);
    };

    // 處理登錄成功
    const handleLoginSuccess = () => {
        setErrorMessage(null);
    };

    // 關閉錯誤消息
    const handleCloseError = () => {
        setErrorMessage(null);
    };

    // 當用戶未驗證時顯示登錄頁面
    if (!currentUser && !isLoading) {
        return <Auth onLogin={handleLoginSuccess} />;
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
                </div>

                {/* 添加任務按鈕 */}
                <button
                    className="mb-6 px-6 py-3 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors flex items-center cursor-pointer whitespace-nowrap select-none btn-primary"
                    onClick={() => setShowAddModal(true)}
                >
                    <i className="fas fa-plus mr-2"></i>
                    新增任務
                </button>

                {/* 任務列表 */}
                <div className="space-y-3 sm:space-y-4">
                    {isTasksLoading ? (
                        <div className="text-center py-8">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
                            <p className="mt-2 text-gray-600">加載任務中...</p>
                        </div>
                    ) : filteredTasks.length > 0 ? (
                        filteredTasks.map(task => (
                            <div
                                key={task.id}
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
                                            {task.completed && (
                                                <i className="fas fa-check text-white text-sm"></i>
                                            )}
                                        </button>
                                        {!task.completed && (
                                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p 
                                            className={`text-gray-800 break-words ${task.completed ? 'line-through' : ''}`}
                                        >
                                            {task.text}
                                        </p>
                                        <div className="flex flex-wrap items-center mt-1 gap-2">
                                            <span className={`text-sm ${
                                                task.completed ? 'text-gray-500' :
                                                isOverdue(task.dueDate) ? 'text-red-500 font-medium' :
                                                isUpcoming(task.dueDate) ? 'text-orange-500 font-medium' :
                                                'text-gray-500'
                                            }`}>
                                                <i className={`${
                                                    isOverdue(task.dueDate) && !task.completed ? 'fas fa-exclamation-circle mr-1' :
                                                    'far fa-calendar-alt mr-1'
                                                }`}></i>
                                                {formatDate(task.dueDate)}
                                                {isUpcoming(task.dueDate) && !task.completed && 
                                                    <span className="ml-1 text-xs font-medium bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">即將到期</span>
                                                }
                                                {isOverdue(task.dueDate) && !task.completed && 
                                                    <span className="ml-1 text-xs font-medium bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">已過期</span>
                                                }
                                            </span>
                                            <span
                                                className={`text-sm px-2 py-1 rounded-full flex items-center ${
                                                    categoryColors[task.category]?.bg || 'bg-gray-100'
                                                } ${
                                                    categoryColors[task.category]?.text || 'text-gray-600'
                                                }`}
                                            >
                                                <i className={`${categoryColors[task.category]?.icon || 'fas fa-tag'} mr-1`}></i>
                                                {task.category}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    className="text-gray-400 hover:text-red-500 cursor-pointer p-2 rounded-full self-end sm:self-center select-none btn-delete"
                                    onClick={() => deleteTask(task.id)}
                                >
                                    <i className="fas fa-trash-alt"></i>
                                </button>
                            </div>
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
            </div>

            {/* 添加任務模態框 */}
            {showAddModal && (
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
                            <div className="flex flex-wrap gap-2">
                                {Object.keys(categoryColors).map((category) => (
                                    <button
                                        key={category}
                                        className={`px-3 sm:px-4 py-2 rounded-lg cursor-pointer whitespace-nowrap select-none flex items-center ${
                                            selectedCategory === category
                                                ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 btn-primary'
                                                : `${categoryColors[category].bg} ${categoryColors[category].text} hover:opacity-80 btn-white`
                                        }`}
                                        onClick={() => setSelectedCategory(category)}
                                    >
                                        <i className={`${categoryColors[category].icon} mr-1`}></i>
                                        {category}
                                    </button>
                                ))}
                            </div>
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
                                onClick={addTask}
                            >
                                新增任務
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
