import React, { useState } from 'react';
import { Search, Plus, Download, Upload, RefreshCw, Edit, Trash2, Eye, CheckCircle, X } from 'lucide-react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';

export default function CrewTraining() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<any>(null);
  const [formData, setFormData] = useState({
    crew: '',
    trainingType: '初始培训',
    trainingSubject: '',
    startDate: '',
    endDate: '',
    duration: '',
    instructor: '',
    location: '',
    score: '',
    status: '进行中',
    remarks: ''
  });

  const trainingData = [
    {
      id: 1,
      crew: 'C001',
      name: '张三',
      trainingType: '复训',
      trainingSubject: 'B747机型复训',
      startDate: '2026-04-01',
      endDate: '2026-04-15',
      duration: '120h',
      instructor: '王教员',
      location: '民航飞行学院',
      score: '95',
      status: '已完成',
      statusColor: 'success'
    },
    {
      id: 2,
      crew: 'FO1',
      name: '王五',
      trainingType: '模拟机训练',
      trainingSubject: 'B777应急程序',
      startDate: '2026-04-10',
      endDate: '2026-04-12',
      duration: '24h',
      instructor: '李教员',
      location: 'CAE模拟机中心',
      score: '88',
      status: '已完成',
      statusColor: 'success'
    },
    {
      id: 3,
      crew: 'C002',
      name: '李四',
      trainingType: '地面培训',
      trainingSubject: '航空安全管理',
      startDate: '2026-04-18',
      endDate: '2026-04-20',
      duration: '18h',
      instructor: '张教员',
      location: '公司培训室',
      score: '-',
      status: '进行中',
      statusColor: 'warning'
    },
    {
      id: 4,
      crew: 'FO2',
      name: '赵六',
      trainingType: '初始培训',
      trainingSubject: 'B747机型改装',
      startDate: '2026-05-01',
      endDate: '2026-06-30',
      duration: '200h',
      instructor: '陈教员',
      location: '民航飞行学院',
      score: '-',
      status: '计划中',
      statusColor: 'muted'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">培训记录管理</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.alert('导出成功')}>
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.alert('批量导入功能')}>
            <Upload className="w-4 h-4 mr-2" />
            批量导入
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新增培训
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">总培训记录</p>
          <p className="text-2xl font-semibold mt-1">86</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">已完成</p>
          <p className="text-2xl font-semibold mt-1 text-success">72</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">进行中</p>
          <p className="text-2xl font-semibold mt-1 text-warning">9</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">计划中</p>
          <p className="text-2xl font-semibold mt-1 text-muted-foreground">5</p>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="搜索工号、姓名或培训科目..."
              className="w-full"
            />
          </div>
          <select className="px-3 py-2 rounded-lg border border-border bg-background">
            <option>全部类型</option>
            <option>初始培训</option>
            <option>复训</option>
            <option>模拟机训练</option>
            <option>地面培训</option>
          </select>
          <select className="px-3 py-2 rounded-lg border border-border bg-background">
            <option>全部状态</option>
            <option>计划中</option>
            <option>进行中</option>
            <option>已完成</option>
          </select>
          <Button variant="outline" onClick={() => window.alert('搜索功能')}>
            <Search className="w-4 h-4 mr-2" />
            搜索
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            重置
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  <input type="checkbox" className="w-4 h-4 rounded border-border" />
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">序号</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">工号</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">姓名</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">培训类型</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">培训科目</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">开始日期</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">结束日期</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">时长</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">成绩</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">状态</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {trainingData.map((training, idx) => (
                <tr key={training.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                  <td className="py-3 px-4">
                    <input type="checkbox" className="w-4 h-4 rounded border-border" />
                  </td>
                  <td className="py-3 px-4 text-sm">{idx + 1}</td>
                  <td className="py-3 px-4 font-medium">{training.crew}</td>
                  <td className="py-3 px-4">{training.name}</td>
                  <td className="py-3 px-4 text-sm">{training.trainingType}</td>
                  <td className="py-3 px-4">{training.trainingSubject}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{training.startDate}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{training.endDate}</td>
                  <td className="py-3 px-4 text-sm">{training.duration}</td>
                  <td className="py-3 px-4 text-sm">
                    {training.score === '-' ? (
                      <span className="text-muted-foreground">-</span>
                    ) : (
                      <span className={parseInt(training.score) >= 90 ? 'text-success font-medium' : ''}>
                        {training.score}分
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      training.statusColor === 'success'
                        ? 'bg-success/10 text-success'
                        : training.statusColor === 'warning'
                        ? 'bg-warning/10 text-warning'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {training.statusColor === 'success' && <CheckCircle className="w-3 h-3" />}
                      {training.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        className="p-1 hover:bg-accent rounded"
                        onClick={() => {
                          setSelectedTraining(training);
                          setShowViewDialog(true);
                        }}
                      >
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        className="p-1 hover:bg-accent rounded"
                        onClick={() => {
                          setSelectedTraining(training);
                          setFormData({
                            crew: training.crew,
                            trainingType: training.trainingType,
                            trainingSubject: training.trainingSubject,
                            startDate: training.startDate,
                            endDate: training.endDate,
                            duration: training.duration,
                            instructor: training.instructor,
                            location: training.location,
                            score: training.score === '-' ? '' : training.score,
                            status: training.status,
                            remarks: ''
                          });
                          setShowEditDialog(true);
                        }}
                      >
                        <Edit className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button className="p-1 hover:bg-accent rounded" onClick={() => window.confirm('确认删除该培训记录？') && window.alert('删除成功')}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-muted-foreground">
            共 86 条记录
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.alert('已是第一页')}>上一页</Button>
            <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">1</Button>
            <Button variant="outline" size="sm" onClick={() => window.alert('切换到第2页')}>2</Button>
            <Button variant="outline" size="sm" onClick={() => window.alert('切换到下一页')}>下一页</Button>
          </div>
        </div>
      </Card>

      {/* 新增培训对话框 */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowAddDialog(false)}></div>
          <div className="relative bg-card rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">新增培训记录</h2>
              <button onClick={() => setShowAddDialog(false)} className="p-1 hover:bg-accent rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">机组工号 <span className="text-destructive">*</span></label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    value={formData.crew}
                    onChange={(e) => setFormData({ ...formData, crew: e.target.value })}
                  >
                    <option value="">请选择机组</option>
                    <option>C001 - 张三</option>
                    <option>C002 - 李四</option>
                    <option>FO1 - 王五</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">培训类型 <span className="text-destructive">*</span></label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    value={formData.trainingType}
                    onChange={(e) => setFormData({ ...formData, trainingType: e.target.value })}
                  >
                    <option>初始培训</option>
                    <option>复训</option>
                    <option>模拟机训练</option>
                    <option>地面培训</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">培训科目 <span className="text-destructive">*</span></label>
                  <Input
                    value={formData.trainingSubject}
                    onChange={(e) => setFormData({ ...formData, trainingSubject: e.target.value })}
                    placeholder="例如: B747机型改装"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">开始日期 <span className="text-destructive">*</span></label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">结束日期 <span className="text-destructive">*</span></label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">培训时长</label>
                  <Input
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="例如: 120h"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">教员</label>
                  <Input
                    value={formData.instructor}
                    onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                    placeholder="例如: 王教员"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">培训地点</label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="例如: 民航飞行学院"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">成绩</label>
                  <Input
                    type="number"
                    value={formData.score}
                    onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                    placeholder="0-100"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">状态</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option>计划中</option>
                    <option>进行中</option>
                    <option>已完成</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">备注</label>
                  <textarea
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background resize-none"
                    rows={3}
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="其他说明信息"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button className="flex-1" onClick={() => setShowAddDialog(false)}>保存</Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowAddDialog(false)}>取消</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 查看培训详情对话框 */}
      {showViewDialog && selectedTraining && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowViewDialog(false)}></div>
          <div className="relative bg-card rounded-lg shadow-lg max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">培训详情</h2>
              <button onClick={() => setShowViewDialog(false)} className="p-1 hover:bg-accent rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">机组工号</p>
                  <p className="text-lg font-medium">{selectedTraining.crew}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">姓名</p>
                  <p className="text-lg font-medium">{selectedTraining.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">培训类型</p>
                  <p className="text-lg font-medium">{selectedTraining.trainingType}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground mb-1">培训科目</p>
                  <p className="text-lg font-medium">{selectedTraining.trainingSubject}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">开始日期</p>
                  <p className="text-lg font-medium">{selectedTraining.startDate}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">结束日期</p>
                  <p className="text-lg font-medium">{selectedTraining.endDate}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">培训时长</p>
                  <p className="text-lg font-medium">{selectedTraining.duration}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">教员</p>
                  <p className="text-lg font-medium">{selectedTraining.instructor}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground mb-1">培训地点</p>
                  <p className="text-lg font-medium">{selectedTraining.location}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">成绩</p>
                  <p className="text-lg font-medium">
                    {selectedTraining.score === '-' ? '-' : `${selectedTraining.score}分`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">状态</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedTraining.statusColor === 'success'
                      ? 'bg-success/10 text-success'
                      : selectedTraining.statusColor === 'warning'
                      ? 'bg-warning/10 text-warning'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {selectedTraining.status}
                  </span>
                </div>
              </div>
              <div className="pt-4 border-t border-border">
                <Button variant="outline" className="w-full" onClick={() => setShowViewDialog(false)}>关闭</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 编辑培训对话框 */}
      {showEditDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowEditDialog(false)}></div>
          <div className="relative bg-card rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">编辑培训记录</h2>
              <button onClick={() => setShowEditDialog(false)} className="p-1 hover:bg-accent rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">机组工号</label>
                  <Input value={formData.crew} disabled className="bg-muted" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">培训类型</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    value={formData.trainingType}
                    onChange={(e) => setFormData({ ...formData, trainingType: e.target.value })}
                  >
                    <option>初始培训</option>
                    <option>复训</option>
                    <option>模拟机训练</option>
                    <option>地面培训</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">培训科目</label>
                  <Input
                    value={formData.trainingSubject}
                    onChange={(e) => setFormData({ ...formData, trainingSubject: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">开始日期</label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">结束日期</label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">培训时长</label>
                  <Input
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">教员</label>
                  <Input
                    value={formData.instructor}
                    onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">培训地点</label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">成绩</label>
                  <Input
                    type="number"
                    value={formData.score}
                    onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">状态</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option>计划中</option>
                    <option>进行中</option>
                    <option>已完成</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button className="flex-1" onClick={() => setShowEditDialog(false)}>保存修改</Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowEditDialog(false)}>取消</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
