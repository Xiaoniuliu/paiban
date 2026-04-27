import React, { useState } from 'react';
import { Plane, Users, AlertCircle, TrendingUp, X } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';

export default function Dashboard() {
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [todos, setTodos] = useState([
    { task: 'CGO21 待确认机组', done: false, deadline: '今天' },
    { task: '合规告警待处理', done: false, deadline: '明天' },
    { task: '下周排班待发布', done: false, deadline: '2026-04-21' },
    { task: '体检预警待处理', done: true, deadline: '已完成' }
  ]);

  const stats = [
    {
      label: '今日航班数',
      value: '20',
      icon: Plane,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      label: '机组人员数',
      value: '28',
      icon: Users,
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    {
      label: '合规率',
      value: '98%',
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    {
      label: '待处理告警',
      value: '5',
      icon: AlertCircle,
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    }
  ];

  const todayFlights = [
    { id: 'CGO01', route: '澳门→台北', time: '09:00-19:00', status: '已排班', crew: 'C1+FO1' },
    { id: 'CGO02', route: '台北→澳门', time: '21:00-07:00', status: '已排班', crew: 'C3+FO3' },
    { id: 'CGO03', route: '澳门→台北', time: '09:00-19:00', status: '已排班', crew: 'C1+FO1' },
    { id: 'CGO04', route: '澳门→首尔', time: '09:00-19:00', status: '已排班', crew: 'C2+FO2' },
    { id: 'CGO05', route: '首尔→澳门', time: '21:00-07:00', status: '计划中', crew: '-' }
  ];

  const alerts = [
    { level: 'danger', crew: 'C1', message: '连续执勤7天', time: '2026-04-16' },
    { level: 'danger', crew: 'FO3', message: '执照15天到期', time: '2026-05-01' },
    { level: 'warning', crew: 'FO2', message: '本周执勤54h', time: '2026-04-19' }
  ];

  const handleTodoToggle = (idx: number) => {
    const newTodos = [...todos];
    newTodos[idx].done = !newTodos[idx].done;
    setTodos(newTodos);
  };

  return (
    <div className="space-y-6">
      {/* 核心指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <Card key={idx} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <h3 className="text-3xl font-semibold">{stat.value}</h3>
              </div>
              <div className={`${stat.bgColor} ${stat.color} p-3 rounded-xl`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">航班执行率</h3>
          <div className="flex items-center justify-center h-48">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#e5e5ea"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#0071e3"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray="351.86"
                  strokeDashoffset="35.19"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-semibold">90%</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-4 text-sm">
            <div><span className="text-primary">●</span> 已完成 18</div>
            <div><span className="text-muted-foreground">●</span> 计划中 2</div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">本周航班统计</h3>
          <div className="flex items-end justify-between h-48 gap-2">
            {[12, 15, 10, 18, 14, 16, 13].map((height, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-primary rounded-t-lg" style={{ height: `${height * 8}px` }}></div>
                <span className="text-xs text-muted-foreground">
                  {['一', '二', '三', '四', '五', '六', '日'][idx]}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">机组状态分布</h3>
          <div className="flex items-center justify-center h-48">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#34c759"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray="351.86"
                  strokeDashoffset="88"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#ff9500"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray="351.86"
                  strokeDashoffset="230"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-semibold">28</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-4 text-sm">
            <div><span className="text-success">●</span> 执勤 14</div>
            <div><span className="text-warning">●</span> 待命 5</div>
            <div><span className="text-muted-foreground">●</span> 休息 9</div>
          </div>
        </Card>
      </div>

      {/* 今日航班预览 */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">今日航班预览</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">航班号</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">航线</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">时间</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">执飞机组</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">状态</th>
              </tr>
            </thead>
            <tbody>
              {todayFlights.map((flight) => (
                <tr key={flight.id} className="border-b border-border last:border-0">
                  <td className="py-3 px-4 font-medium">{flight.id}</td>
                  <td className="py-3 px-4">{flight.route}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{flight.time}</td>
                  <td className="py-3 px-4 text-sm">{flight.crew}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      flight.status === '已排班'
                        ? 'bg-success/10 text-success'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {flight.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 实时告警和待办事项 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">实时告警</h3>
          <div className="space-y-3">
            {alerts.map((alert, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-background rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-1.5 ${
                  alert.level === 'danger' ? 'bg-destructive' : 'bg-warning'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{alert.crew} {alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                </div>
                <button
                  onClick={() => setSelectedAlert(alert)}
                  className="text-xs text-primary hover:underline"
                >
                  查看详情
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">待办事项</h3>
          <div className="space-y-3">
            {todos.map((todo, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-background rounded-lg">
                <input
                  type="checkbox"
                  checked={todo.done}
                  onChange={() => handleTodoToggle(idx)}
                  className="w-4 h-4 rounded border-border cursor-pointer"
                />
                <div className="flex-1">
                  <p className={`text-sm ${todo.done ? 'line-through text-muted-foreground' : ''}`}>
                    {todo.task}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{todo.deadline}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 告警详情对话框 */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedAlert(null)}></div>
          <div className="relative bg-card rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">告警详情</h2>
              <button
                onClick={() => setSelectedAlert(null)}
                className="p-1 hover:bg-accent rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">机组编号</p>
                <p className="text-lg font-medium mt-1">{selectedAlert.crew}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">告警内容</p>
                <p className="text-lg font-medium mt-1">{selectedAlert.message}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">触发时间</p>
                <p className="text-lg font-medium mt-1">{selectedAlert.time}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">告警级别</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                  selectedAlert.level === 'danger'
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-warning/10 text-warning'
                }`}>
                  {selectedAlert.level === 'danger' ? '严重告警' : '警告'}
                </span>
              </div>
              <div className="pt-4 flex gap-2">
                <Button className="flex-1" onClick={() => setSelectedAlert(null)}>立即处理</Button>
                <Button variant="outline" className="flex-1" onClick={() => setSelectedAlert(null)}>关闭</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
