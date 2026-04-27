import React, { useState } from 'react';
import { Calendar, Download, Upload, RefreshCw, Check, AlertTriangle, X } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';

export default function ScheduleGantt() {
  const [viewDays, setViewDays] = useState(7);
  const [viewType, setViewType] = useState('both');
  const [showAutoScheduleDialog, setShowAutoScheduleDialog] = useState(false);
  const [autoScheduleSettings, setAutoScheduleSettings] = useState({
    startDate: '2026-04-21',
    endDate: '2026-04-27',
    priority: 'balance',
    restMinHours: '11'
  });

  const days = ['周一14', '周二15', '周三16', '周四17', '周五18', '周六19', '周日20'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const aircraftTasks = [
    {
      aircraft: 'AC1',
      tasks: [
        { start: 9, duration: 10, label: 'CGO01', type: 'assigned' },
        { start: 21, duration: 10, label: 'CGO02', type: 'assigned' }
      ]
    },
    {
      aircraft: 'AC2',
      tasks: [
        { start: 9, duration: 10, label: 'CGO04', type: 'assigned' },
        { start: 21, duration: 10, label: 'CGO05', type: 'planned' }
      ]
    }
  ];

  const crewTasks = [
    {
      crew: 'C1',
      tasks: [
        { start: 0, duration: 9, label: '休息', type: 'rest' },
        { start: 9, duration: 10, label: 'CGO01 飞行', type: 'flight' },
        { start: 19, duration: 5, label: '休息', type: 'rest' }
      ]
    },
    {
      crew: 'FO1',
      tasks: [
        { start: 0, duration: 9, label: '休息', type: 'rest' },
        { start: 9, duration: 10, label: 'CGO01 飞行', type: 'flight' },
        { start: 19, duration: 5, label: '休息', type: 'rest' }
      ]
    },
    {
      crew: 'FO5',
      tasks: [
        { start: 0, duration: 24, label: 'Standby待命', type: 'standby' }
      ]
    }
  ];

  const getTaskColor = (type: string) => {
    switch (type) {
      case 'assigned': return 'bg-primary';
      case 'planned': return 'bg-muted';
      case 'flight': return 'bg-primary';
      case 'rest': return 'bg-success';
      case 'standby': return 'bg-warning';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">排班甘特图</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.alert('导入功能')}>
            <Upload className="w-4 h-4 mr-2" />
            导入
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.alert('导出图片功能')}>
            <Download className="w-4 h-4 mr-2" />
            导出图片
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
          <Button
            size="sm"
            className="bg-warning text-warning-foreground hover:bg-warning/90"
            onClick={() => setShowAutoScheduleDialog(true)}
          >
            一键排班
          </Button>
          <Button size="sm" onClick={() => window.alert('合规检查通过')}>
            <Check className="w-4 h-4 mr-2" />
            合规检查
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex gap-2">
            <Button
              variant={viewDays === 7 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewDays(7)}
            >
              7天
            </Button>
            <Button
              variant={viewDays === 28 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewDays(28)}
            >
              28天
            </Button>
            <Button
              variant={viewDays === 35 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewDays(35)}
            >
              35天
            </Button>
          </div>
          <div className="border-l border-border pl-4">
            <select
              className="px-3 py-2 rounded-lg border border-border bg-background"
              value={viewType}
              onChange={(e) => setViewType(e.target.value)}
            >
              <option value="both">飞机+机组</option>
              <option value="aircraft">仅飞机</option>
              <option value="crew">仅机组</option>
            </select>
          </div>
          <select className="px-3 py-2 rounded-lg border border-border bg-background">
            <option>全部机号(AC1/AC2)</option>
            <option>AC1</option>
            <option>AC2</option>
          </select>
          <select className="px-3 py-2 rounded-lg border border-border bg-background">
            <option>全部状态</option>
            <option>已排班</option>
            <option>计划中</option>
          </select>
        </div>

        {/* 飞机排班视图 */}
        {(viewType === 'both' || viewType === 'aircraft') && (
          <div className="mb-8">
            <h3 className="font-semibold mb-4">飞机排班</h3>
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* 时间轴 */}
                <div className="flex border-b border-border">
                  <div className="w-24 flex-shrink-0 py-2 px-4 font-medium bg-muted">飞机</div>
                  <div className="flex-1 flex">
                    {days.map((day, idx) => (
                      <div key={idx} className="flex-1 text-center py-2 border-l border-border text-sm font-medium">
                        {day}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 甘特图行 */}
                {aircraftTasks.map((item, idx) => (
                  <div key={idx} className="flex border-b border-border hover:bg-accent/30">
                    <div className="w-24 flex-shrink-0 py-4 px-4 font-medium">{item.aircraft}</div>
                    <div className="flex-1 relative h-16">
                      <div className="absolute inset-0 grid grid-cols-7">
                        {days.map((_, dayIdx) => (
                          <div key={dayIdx} className="border-l border-border"></div>
                        ))}
                      </div>
                      {item.tasks.map((task, taskIdx) => (
                        <div
                          key={taskIdx}
                          className={`absolute ${getTaskColor(task.type)} text-white rounded px-2 py-1 text-xs font-medium top-2 h-12 flex items-center justify-center`}
                          style={{
                            left: `${(task.start / 24) * (100 / 7)}%`,
                            width: `${(task.duration / 24) * (100 / 7)}%`
                          }}
                        >
                          {task.label}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 机组排班视图 */}
        {(viewType === 'both' || viewType === 'crew') && (
          <div>
            <h3 className="font-semibold mb-4">机组排班</h3>
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* 时间轴 */}
                <div className="flex border-b border-border">
                  <div className="w-24 flex-shrink-0 py-2 px-4 font-medium bg-muted">机组</div>
                  <div className="flex-1 flex">
                    {days.map((day, idx) => (
                      <div key={idx} className="flex-1 text-center py-2 border-l border-border text-sm font-medium">
                        {day}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 甘特图行 */}
                {crewTasks.map((item, idx) => (
                  <div key={idx} className="flex border-b border-border hover:bg-accent/30">
                    <div className="w-24 flex-shrink-0 py-4 px-4 font-medium">{item.crew}</div>
                    <div className="flex-1 relative h-16">
                      <div className="absolute inset-0 grid grid-cols-7">
                        {days.map((_, dayIdx) => (
                          <div key={dayIdx} className="border-l border-border"></div>
                        ))}
                      </div>
                      {item.tasks.map((task, taskIdx) => (
                        <div
                          key={taskIdx}
                          className={`absolute ${getTaskColor(task.type)} text-white rounded px-2 py-1 text-xs font-medium top-2 h-12 flex items-center justify-center`}
                          style={{
                            left: `${(task.start / 24) * (100 / 7)}%`,
                            width: `${(task.duration / 24) * (100 / 7)}%`
                          }}
                        >
                          {task.label}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 图例 */}
        <div className="flex items-center gap-6 mt-6 pt-6 border-t border-border text-sm">
          <span className="font-medium">图例：</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary rounded"></div>
            <span>已排班</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-muted rounded"></div>
            <span>计划中</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-success rounded"></div>
            <span>正常休息</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-warning rounded"></div>
            <span>Standby</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-destructive rounded"></div>
            <span>不合规</span>
          </div>
        </div>

        {/* 底部提示 */}
        <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
          <span>当前周期合规率：100%</span>
          <span>连续执勤≤6天</span>
          <span>休息≥11h</span>
        </div>
      </Card>

      {/* 一键排班对话框 */}
      {showAutoScheduleDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowAutoScheduleDialog(false)}></div>
          <div className="relative bg-card rounded-lg shadow-lg max-w-lg w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">一键智能排班</h2>
              <button onClick={() => setShowAutoScheduleDialog(false)} className="p-1 hover:bg-accent rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">排班周期 <span className="text-destructive">*</span></label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="date"
                      value={autoScheduleSettings.startDate}
                      onChange={(e) => setAutoScheduleSettings({ ...autoScheduleSettings, startDate: e.target.value })}
                      className="flex-1"
                    />
                    <span>至</span>
                    <Input
                      type="date"
                      value={autoScheduleSettings.endDate}
                      onChange={(e) => setAutoScheduleSettings({ ...autoScheduleSettings, endDate: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">排班策略</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    value={autoScheduleSettings.priority}
                    onChange={(e) => setAutoScheduleSettings({ ...autoScheduleSettings, priority: e.target.value })}
                  >
                    <option value="balance">平衡模式（均衡分配飞行时长）</option>
                    <option value="efficiency">效率优先（最少机组完成任务）</option>
                    <option value="rest">休息优先（最大化休息时间）</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">最小休息时长（小时）</label>
                  <Input
                    type="number"
                    value={autoScheduleSettings.restMinHours}
                    onChange={(e) => setAutoScheduleSettings({ ...autoScheduleSettings, restMinHours: e.target.value })}
                    placeholder="11"
                  />
                </div>
                <div className="bg-accent/30 p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">智能排班将自动：</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• 匹配机组资质与航班需求</li>
                    <li>• 自动校验民航局合规规则</li>
                    <li>• 均衡分配飞行时长和休息时间</li>
                    <li>• 优先安排待命机组（Standby）</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button className="flex-1" onClick={() => setShowAutoScheduleDialog(false)}>
                  开始排班
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowAutoScheduleDialog(false)}>
                  取消
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
