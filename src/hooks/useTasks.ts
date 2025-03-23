import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  addTask as addTaskToFirestore, 
  getTasks, 
  updateTask as updateTaskInFirestore, 
  deleteTask as deleteTaskFromFirestore 
} from '../firebase';
import { Timestamp } from 'firebase/firestore';

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  startDate: string;
  dueDate: string;
  category: string;
}

export function useTasks() {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载任务
  useEffect(() => {
    const loadTasks = async () => {
      if (currentUser?.uid) {
        setIsLoading(true);
        try {
          const userTasks = await getTasks(currentUser.uid);
          const convertedTasks = userTasks.map(task => ({
            id: task.id || '',
            text: task.title || '',
            completed: task.completed || false,
            startDate: task.startDate ? new Date(task.startDate.toDate()).toISOString().split('T')[0] : '',
            dueDate: task.dueDate ? new Date(task.dueDate.toDate()).toISOString().split('T')[0] : '',
            category: task.category || '工作'
          }));
          setTasks(convertedTasks);
          setError(null);
        } catch (error: any) {
          console.error('加載任務失敗:', error);
          
          if (error.message && error.message.includes('permission')) {
            setError('權限錯誤：您沒有足夠的權限讀取任務。可能需要重新登錄或等待 Firestore 規則生效（大約 1 分鐘）。');
          } else if (error.code === 'permission-denied') {
            setError('權限錯誤：您沒有足夠的權限讀取任務。可能需要重新登錄或等待 Firestore 規則生效（大約 1 分鐘）。');
          } else {
            setError(`加載任務失敗: ${error.message || '未知錯誤'}`);
          }
        } finally {
          setIsLoading(false);
        }
      } else {
        setTasks([]);
      }
    };

    if (currentUser) {
      loadTasks();
    }
  }, [currentUser]);

  // 添加任务
  const addTask = async (taskText: string, startDate: string, dueDate: string, category: string): Promise<boolean> => {
    if (!taskText.trim() || !currentUser?.uid) return false;

    try {
      const taskData = {
        title: taskText,
        completed: false,
        userId: currentUser.uid,
        startDate: startDate ? Timestamp.fromDate(new Date(startDate)) : null,
        dueDate: dueDate ? Timestamp.fromDate(new Date(dueDate)) : null,
        category: category
      };

      const taskId = await addTaskToFirestore(taskData);
      
      const newTask: Task = {
        id: taskId,
        text: taskText,
        completed: false,
        startDate,
        dueDate,
        category
      };
      
      setTasks(prev => [newTask, ...prev]);
      return true;
    } catch (error) {
      console.error('添加任務失敗:', error);
      return false;
    }
  };

  // 更新任务状态
  const toggleTaskComplete = async (taskId: string): Promise<boolean> => {
    if (!currentUser?.uid) return false;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return false;

    const updatedTask = { ...task, completed: !task.completed };
    
    try {
      await updateTaskInFirestore(taskId, { completed: !task.completed });
      setTasks(tasks.map((t) => (t.id === taskId ? updatedTask : t)));
      return true;
    } catch (error) {
      console.error('更新任務失敗:', error);
      return false;
    }
  };

  // 删除任务
  const deleteTask = async (taskId: string): Promise<boolean> => {
    if (!currentUser?.uid) return false;

    try {
      await deleteTaskFromFirestore(taskId);
      setTasks(tasks.filter(task => task.id !== taskId));
      return true;
    } catch (error) {
      console.error('刪除任務失敗:', error);
      return false;
    }
  };

  return {
    tasks,
    isLoading,
    error,
    addTask,
    toggleTaskComplete,
    deleteTask,
    clearError: () => setError(null)
  };
} 