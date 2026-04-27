import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Download, Search, RefreshCw, Eye, X, Clock } from 'lucide-react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';

export default function ComplianceViolations() {
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showFixDialog, setShowFixDialog] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<any>(null);
  const [fixSolution, setFixSolution] = useState('solution1');

  const violationStats = [
    { label: '待处理', value: '8', icon: Clock, color: 'text-warning', bgColor: 'bg-warning/10' },
    { label: '处理中', value: '3', icon: AlertTriangle, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: '已解决', value: '15', icon: CheckCircle, color: 'text-success', bgColor: 'bg-success/10' },
    { label: '已忽略', value: '2', icon: AlertCircle, color: 'text-muted-foreground', bgColor: 'bg-muted' }
  ];

  const violationData = [
    {
      id: 1,
      level: 'danger',
      type: '连续执勤超限',
      crew: 'C1 - 张三',
      rule: '连续执勤天数≤6天',
      currentValue: '7天',
      limitValue: '6天',
      triggerTime: '2026-04-17 18:00',
      affectedFlights: ['CGO01', 'CGO02', 'CGO03'],
      status: '待处理',
      statusColor: 'warning',
      priority: '高',
      autoFixAvailable: true
    },
    {
      id: 2,
      level: 'warning',
      type: '7天飞行时长预警',
      crew: 'FO1 - 王五',
      rule: '7天飞行时长≤55小时',
      currentValue: '54h',
      limitValue: '55h',
      triggerTime: '2026-04-17 20:30',
      affectedFlights: ['CGO01'],
      status: '待处理',
      statusColor: 'warning',
      priority: '中',
      autoFixAvailable: true
    },
    {
      id: 3,
      level: 'warning',
      type: '休息时长不足',
      crew: 'C2 - 李四',
      rule: '飞行后休息≥11小时',
      currentValue: '10.5h',
      limitValue: '11h',
      triggerTime: '2026-04-18 08:00',
      affectedFlights: ['CGO04'],
      status: '处理中',
      statusColor: 'primary',
      priority: '高',
      autoFixAvailable: true
    },
    {
      id: 4,
      level: 'info',
      type: '体检证即将过期',
      crew: 'FO2 - 赵六',
      rule: '体检证在有效期内',
      currentValue: '15天后过期',
      limitValue: '有效期内',
      triggerTime: '2026-04-16 09:00',
      affectedFlights: [],
      status: '已解决',
      statusColor: 'success',
      priority: '中',
      autoFixAvailable: false
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">违规处理中心</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.alert('导出成功')}>
            <Download className="w-4 h-4 mr-2" />
            导出记录
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
          <Button size="sm" onClick={() => window.alert('批量处理功能')}>
            批量处理
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {violationStats.map((stat, idx) => (
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

      <Card className="p-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="搜索机组、违规类型..."
              className="w-full"
            />
          </div>
          <select className="px-3 py-2 rounded-lg border border-border bg-background">
            <option>全部级别</option>
            <option>严重违规</option>
            <option>警告</option>
            <option>提醒</option>
          </select>
          <select className="px-3 py-2 rounded-lg border border-border bg-background">
            <option>全部状态</option>
            <option>待处理</option>
            <option>处理中</option>
            <option>已解决</option>
            <option>已忽略</option>
          </select>
          <select className="px-3 py-2 rounded-lg border border-border bg-background">
            <option>全部优先级</option>
            <option>高</option>
            <option>中</option>
            <option>低</option>
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

        <div className="space-y-4">
          {violationData.map((violation) => (
            <div key={violation.id} className="p-5 bg-background rounded-lg border border-border hover:border-primary/50 transition-colors">
              <div className="flex items-start gap-4">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  violation.level === 'danger' ? 'bg-destructive' :
                  violation.level === 'warning' ? 'bg-warning' : 'bg-primary'
                }`}></div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-lg">{violation.type}</h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          violation.priority === '高'
                            ? 'bg-destructive/10 text-destructive'
                            : violation.priority === '中'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {violation.priority}优先级
                        </span>
                        {violation.autoFixAvailable && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                            支持自动修复
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        机组：{violation.crew} | 触发规则：{violation.rule}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <span>当前值：<span className="font-medium text-destructive">{violation.currentValue}</span></span>
                        <span>限制值：<span className="font-medium">{violation.limitValue}</span></span>
                        <span className="text-muted-foreground">触发时间：{violation.triggerTime}</span>
                      </div>
                      {violation.affectedFlights.length > 0 && (
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">影响航班：</span>
                          {violation.affectedFlights.map((flight, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-accent rounded text-xs font-medium">
                              {flight}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        violation.statusColor === 'success'
                          ? 'bg-success/10 text-success'
                          : violation.statusColor === 'warning'
                          ? 'bg-warning/10 text-warning'
                          : violation.statusColor === 'primary'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {violation.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedViolation(violation);
                        setShowDetailDialog(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      查看详情
                    </Button>
                    {violation.status === '待处理' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedViolation(violation);
                            setShowFixDialog(true);
                          }}
                        >
                          立即处理
                        </Button>
                        {violation.autoFixAvailable && (
                          <Button variant="outline" size="sm" className="text-primary" onClick={() => window.alert('自动修复已应用')}>
                            自动修复
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="text-muted-foreground" onClick={() => window.confirm('确认忽略此违规？') && window.alert('已忽略')}>
                          忽略
                        </Button>
                      </>
                    )}
                    {violation.status === '处理中' && (
                      <Button size="sm" onClick={() => { setSelectedViolation(violation); setShowFixDialog(true); }}>
                        继续处理
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-muted-foreground">
            共 28 条违规记录
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.alert('已是第一页')}>上一页</Button>
            <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">1</Button>
            <Button variant="outline" size="sm" onClick={() => window.alert('切换到第2页')}>2</Button>
            <Button variant="outline" size="sm" onClick={() => window.alert('切换到下一页')}>下一页</Button>
          </div>
        </div>
      </Card>

      {/* 违规详情对话框 */}
      {showDetailDialog && selectedViolation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDetailDialog(false)}></div>
          <div className="relative bg-card rounded-lg shadow-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">违规详情</h2>
              <button onClick={() => setShowDetailDialog(false)} className="p-1 hover:bg-accent rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* 基本信息 */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    selectedViolation.level === 'danger' ? 'bg-destructive' : 'bg-warning'
                  }`}></div>
                  基本信息
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-accent/30 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">违规编号</p>
                    <p className="font-medium">VIO-2026-{String(selectedViolation.id).padStart(4, '0')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">违规类型</p>
                    <p className="font-medium">{selectedViolation.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">机组</p>
                    <p className="font-medium">{selectedViolation.crew}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">触发规则</p>
                    <p className="font-medium">{selectedViolation.rule}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">当前数值</p>
                    <p className="font-medium text-destructive">{selectedViolation.currentValue}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">限制数值</p>
                    <p className="font-medium">{selectedViolation.limitValue}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">触发时间</p>
                    <p className="font-medium">{selectedViolation.triggerTime}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">优先级</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      selectedViolation.priority === '高'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-warning/10 text-warning'
                    }`}>
                      {selectedViolation.priority}
                    </span>
                  </div>
                </div>
              </div>

              {/* 影响分析 */}
              <div>
                <h3 className="font-semibold mb-3">影响分析</h3>
                <div className="space-y-3">
                  <div className="p-4 bg-background rounded-lg border border-border">
                    <p className="text-sm font-medium mb-2">影响航班</p>
                    {selectedViolation.affectedFlights.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedViolation.affectedFlights.map((flight: string, idx: number) => (
                          <span key={idx} className="px-3 py-1 bg-accent rounded text-sm font-medium">
                            {flight}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">无直接影响航班</p>
                    )}
                  </div>
                  <div className="p-4 bg-background rounded-lg border border-border">
                    <p className="text-sm font-medium mb-2">风险评估</p>
                    <p className="text-sm text-muted-foreground">
                      若不及时处理，可能导致后续排班无法满足民航局合规要求，影响正常飞行任务执行。
                    </p>
                  </div>
                </div>
              </div>

              {/* 处理历史 */}
              <div>
                <h3 className="font-semibold mb-3">处理历史</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-background rounded-lg border border-border">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">系统自动检测</p>
                      <p className="text-xs text-muted-foreground mt-1">{selectedViolation.triggerTime}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-border">
                {selectedViolation.status === '待处理' && (
                  <>
                    <Button
                      className="flex-1"
                      onClick={() => {
                        setShowDetailDialog(false);
                        setShowFixDialog(true);
                      }}
                    >
                      立即处理
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => setShowDetailDialog(false)}>
                      关闭
                    </Button>
                  </>
                )}
                {selectedViolation.status !== '待处理' && (
                  <Button variant="outline" className="w-full" onClick={() => setShowDetailDialog(false)}>
                    关闭
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 处理方案对话框 */}
      {showFixDialog && selectedViolation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowFixDialog(false)}></div>
          <div className="relative bg-card rounded-lg shadow-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">选择处理方案</h2>
              <button onClick={() => setShowFixDialog(false)} className="p-1 hover:bg-accent rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* 违规概要 */}
              <div className="bg-accent/30 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">{selectedViolation.type}</h3>
                <p className="text-sm text-muted-foreground">
                  机组 {selectedViolation.crew} | {selectedViolation.currentValue} 超出限值 {selectedViolation.limitValue}
                </p>
              </div>

              {/* 处理方案 */}
              <div>
                <h3 className="font-semibold mb-4">推荐处理方案</h3>
                <div className="space-y-3">
                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      fixSolution === 'solution1'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setFixSolution('solution1')}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="solution"
                        className="mt-1"
                        checked={fixSolution === 'solution1'}
                        onChange={() => setFixSolution('solution1')}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-medium">方案1：调整后续航班安排</p>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success/10 text-success">
                            推荐
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          将该机组未来3天的航班任务调整给其他符合条件的机组，确保休息时间充足
                        </p>
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div className="bg-background p-2 rounded">
                            <p className="text-muted-foreground">影响航班</p>
                            <p className="font-medium mt-1">2个</p>
                          </div>
                          <div className="bg-background p-2 rounded">
                            <p className="text-muted-foreground">调整机组</p>
                            <p className="font-medium mt-1">1个</p>
                          </div>
                          <div className="bg-background p-2 rounded">
                            <p className="text-muted-foreground">合规性</p>
                            <p className="font-medium mt-1 text-success">100%</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      fixSolution === 'solution2'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setFixSolution('solution2')}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="solution"
                        className="mt-1"
                        checked={fixSolution === 'solution2'}
                        onChange={() => setFixSolution('solution2')}
                      />
                      <div className="flex-1">
                        <p className="font-medium mb-2">方案2：强制休息调整</p>
                        <p className="text-sm text-muted-foreground mb-3">
                          为该机组安排连续2天强制休息（DDO），由待命机组（Standby）顶替执行航班任务
                        </p>
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div className="bg-background p-2 rounded">
                            <p className="text-muted-foreground">影响航班</p>
                            <p className="font-medium mt-1">4个</p>
                          </div>
                          <div className="bg-background p-2 rounded">
                            <p className="text-muted-foreground">调整机组</p>
                            <p className="font-medium mt-1">2个</p>
                          </div>
                          <div className="bg-background p-2 rounded">
                            <p className="text-muted-foreground">合规性</p>
                            <p className="font-medium mt-1 text-success">100%</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      fixSolution === 'solution3'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setFixSolution('solution3')}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="solution"
                        className="mt-1"
                        checked={fixSolution === 'solution3'}
                        onChange={() => setFixSolution('solution3')}
                      />
                      <div className="flex-1">
                        <p className="font-medium mb-2">方案3：手动调整</p>
                        <p className="text-sm text-muted-foreground">
                          转至排班管理手动调整相关航班和机组安排
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 备注 */}
              <div>
                <label className="block text-sm font-medium mb-2">处理备注（可选）</label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background resize-none"
                  rows={3}
                  placeholder="记录处理原因、特殊说明等信息"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-border">
                <Button className="flex-1" onClick={() => setShowFixDialog(false)}>
                  确认并执行
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowFixDialog(false)}>
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
