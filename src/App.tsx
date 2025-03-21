// The exported code uses Tailwind CSS. Install Tailwind CSS in your dev environment to ensure all styles work.
import React, { useState, useEffect } from 'react';
import * as echarts from 'echarts';
interface Task {
    id: string;
    text: string;
    completed: boolean;
    dueDate?: string;
    priority: 'low' | 'medium' | 'high';
    category: string;
}
const App: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTask, setNewTask] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedPriority, setSelectedPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [selectedCategory, setSelectedCategory] = useState('personal');
    const [showProfileMenu, setShowProfileMenu] = useState(false);
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
        }
    }, [tasks]);
    const addTask = () => {
        if (newTask.trim()) {
            const task: Task = {
                id: Date.now().toString(),
                text: newTask,
                completed: false,
                dueDate: new Date().toISOString().split('T')[0],
                priority: selectedPriority,
                category: selectedCategory,
            };
            setTasks([...tasks, task]);
            setNewTask('');
            setShowAddModal(false);
        }
    };
    const toggleComplete = (taskId: string) => {
        setTasks(
            tasks.map((task)=>
                task.id === taskId ? { ...task, completed: !task.completed } : task,
            ),
        );
    };
    const deleteTask = (taskId: string) => {
        setTasks(tasks.filter(task => task.id !== taskId));
    };
    const filteredTasks = tasks.filter(task => {
        if (activeFilter === 'completed') return task.completed;
        if (activeFilter === 'active') return !task.completed;
        return true;
    });
    return (
        <div className="min-h-screen w-full bg-gradient-to-b from-slate-100 to-white">
            <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-center justify-between mb-6 sm:mb-8">
                    <div className="flex items-center">
                        <h1 className="text-3xl font-bold text-gray-800">待辦事項</h1>
                    </div>
                    <div className="relative mt-2 sm:mt-0">
                        <button
                            className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center cursor-pointer btn-white"
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                        >
                            <i className="fas fa-user text-gray-600"></i>
                        </button>
                        {showProfileMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-10">
                                <a href="https://readdy.ai/home/1d6ca75c-d40b-4dbb-b5c6-d766ce17cf42/857a552b-6350-4be6-95f7-26c9800972fe" data-readdy="true" className="block px-4 py-2 text-gray-700 hover:bg-blue-50">個人資料</a>
                                <a href="#" className="block px-4 py-2 text-gray-700 hover:bg-blue-50">登出</a>
                            </div>
                        )}
                    </div>
                </div>
                {/* Progress Chart */}
                <div className="mb-6 sm:mb-8 bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-slate-200">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-3 sm:mb-4">任務進度</h2>
                    <div id="taskProgressChart" style={{ height: '180px' }}></div>
                </div>
                {/* Task Filters */}
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
                {/* Add Task Button */}
                <button
                    className="mb-6 px-6 py-3 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors flex items-center cursor-pointer whitespace-nowrap select-none btn-primary"
                    onClick={() => setShowAddModal(true)}
                >
                    <i className="fas fa-plus mr-2"></i>
                    新增任務
                </button>
                {/* Task List */}
                <div className="space-y-3 sm:space-y-4">
                    {filteredTasks.length > 0 ? (
                        filteredTasks.map(task => (
                            <div
                                key={task.id}
                                className={`bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between transition-all border border-slate-200 hover:shadow-md ${
                                    task.completed ? 'opacity-60 bg-slate-50' : ''
                                }`}
                            >
                                <div className="flex items-start sm:items-center w-full sm:w-auto mb-3 sm:mb-0">
                                    <button
                                        className={`w-6 h-6 rounded-full border-2 mr-4 flex-shrink-0 flex items-center justify-center cursor-pointer select-none btn-check ${
                                            task.completed
                                                ? 'bg-green-500 border-green-500'
                                                : 'border-gray-300'
                                        }`}
                                        onClick={() => toggleComplete(task.id)}
                                    >
                                        {task.completed && (
                                            <i className="fas fa-check text-white text-sm"></i>
                                        )}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <p 
                                            className={`text-gray-800 break-words ${task.completed ? 'line-through' : ''}`}
                                        >
                                            {task.text}
                                        </p>
                                        <div className="flex flex-wrap items-center mt-1 gap-2">
                                            <span className="text-sm text-gray-500">
                                                <i className="far fa-calendar-alt mr-1"></i>
                                                {task.dueDate}
                                            </span>
                                            <span
                                                className={`text-sm px-2 py-1 rounded-full ${
                                                    task.priority === 'high'
                                                        ? 'bg-red-100 text-red-600'
                                                        : task.priority === 'medium'
                                                            ? 'bg-yellow-100 text-yellow-600'
                                                            : 'bg-green-100 text-green-600'
                                                }`}
                                            >
                                                {task.priority}
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
            {/* Add Task Modal */}
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
                            <label className="block text-gray-700 mb-2">優先級別</label>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { key: 'low', label: '低' },
                                    { key: 'medium', label: '中' },
                                    { key: 'high', label: '高' }
                                ].map(({ key, label }) => (
                                    <button
                                        key={key}
                                        className={`px-3 sm:px-4 py-2 rounded-lg cursor-pointer whitespace-nowrap select-none ${
                                            selectedPriority === key
                                                ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 btn-primary'
                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 btn-white'
                                        }`}
                                        onClick={() => 
                                            setSelectedPriority(key as 'low' | 'medium' | 'high')
                                        }
                                    >
                                        {label}
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
export default App
