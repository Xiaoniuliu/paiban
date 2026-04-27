import React, { useState } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Download, RefreshCw, X } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';

export default function ComplianceCheck() {
  const [showFixDialog, setShowFixDialog] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<any>(null);
  const overviewStats = [
    { label: '合规率', value: '100%', icon: CheckCircle, color: 'text-success' },
    { label: '告警数量', value: '0', icon: AlertTriangle, color: 'text-warning' },
    { label: '违规数量', value: '0', icon: AlertCircle, color: 'text-destructive' }
  ];

  const rules = [
    { id: 1, name: '连续执勤天数 ≤ 6天', total: 11, compliant: 11, violations: 0, warnings: 0, rate: '100%' },
    { id: 2, name: '飞行后休息时长 ≥ 11小时', total: 11, compliant: 11, violations: 0, warnings: 0, rate: '100%' },
    { id: 3, name: '单次执勤期（FDP）≤ 14小时', total: 30, compliant: 30, violations: 0, warnings: 0, rate: '100%' },
    { id: 4, name: '7天内最大执勤时间 ≤ 55小时', total: 11, compliant: 9, violations: 0, warnings: 2, rate: '82%' },
    { id: 5, name: '14天内最大执勤时间 ≤ 95小时', total: 11, compliant: 11, violations: 0, warnings: 0, rate: '100%' },
    { id: 6, name: '28天内最大执勤时间 ≤ 190小时', total: 11, compliant: 11, violations: 0, warnings: 0, rate: '100%' },
    { id: 7, name: '单个航段飞行时间 ≤ 9小时', total: 30, compliant: 30, violations: 0, warnings: 0, rate: '100%' },
    { id: 8, name: '夜间飞行休息 ≥ 12小时', total: 15, compliant: 15, violations: 0, warnings: 0, rate: '100%' },
    { id: 9, name: 'DDO强制休息日（7天内≥1天）', total: 11, compliant: 11, violations: 0, warnings: 0, rate: '100%' },
    { id: 10, name: '跨时区休息 ≥ 14小时', total: 8, compliant: 8, violations: 0, warnings: 0, rate: '100%' },
    { id: 11, name: '年度飞行总时长 ≤ 1000小时', total: 11, compliant: 11, violations: 0, warnings: 0, rate: '100%' },
    { id: 12, name: '年度执勤总时长 ≤ 2000小时', total: 11, compliant: 11, violations: 0, warnings: 0, rate: '100%' },
    { id: 13, name: '连续值班时间 ≤ 18小时', total: 30, compliant: 30, violations: 0, warnings: 0, rate: '100%' },
    { id: 14, name: '机组最低休息天数（28天内≥4天）', total: 11, compliant: 11, violations: 0, warnings: 0, rate: '100%' },
    { id: 15, name: '机组资质与机型匹配', total: 11, compliant: 11, violations: 0, warnings: 0, rate: '100%' },
    { id: 16, name: '执照在有效期内', total: 11, compliant: 11, violations: 0, warnings: 0, rate: '100%' },
    { id: 17, name: '体检证在有效期内', total: 11, compliant: 11, violations: 0, warnings: 0, rate: '100%' },
    { id: 18, name: '英语等级符合要求', total: 11, compliant: 11, violations: 0, warnings: 0, rate: '100%' },
    { id: 19, name: '定期复训完成', total: 11, compliant: 10, violations: 0, warnings: 1, rate: '91%' },
    { id: 20, name: '模拟机训练达标', total: 11, compliant: 11, violations: 0, warnings: 0, rate: '100%' }
  ];

  const violations = [
    {
      id: 1,
      level: 'warning',
      type: '7天飞行超限',
      crew: 'C1',
      flight: '-',
      time: '2026-04-17',
      current: '54h',
      limit: '55h',
      status: '待处理'
    },
    {
      id: 2,
      level: 'warning',
      type: '7天飞行超限',
      crew: 'FO1',
      flight: '-',
      time: '2026-04-17',
      current: '54h',
      limit: '55h',
      status: '待处理'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">合规校验</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.alert('导出报告功能')}>
            <Download className="w-4 h-4 mr-2" />
            导出报告
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
          <Button size="sm" onClick={() => window.alert('全量校验完成，合规率100%')}>
            一键全量校验
          </Button>
        </div>
      </div>

      {/* 合规总览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {overviewStats.map((stat, idx) => (
          <Card key={idx} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <h3 className="text-3xl font-semibold">{stat.value}</h3>
              </div>
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
            </div>
          </Card>
        ))}
      </div>

      {/* 核心合规规则 */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">核心合规规则（系统自动校验）</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">序号</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">校验项</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">总数</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">合规</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">违规</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">告警</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">合规率</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">状态</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule, idx) => (
                <tr key={rule.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                  <td className="py-3 px-4 text-sm">{idx + 1}</td>
                  <td className="py-3 px-4 font-medium">{rule.name}</td>
                  <td className="py-3 px-4 text-sm">{rule.total}</td>
                  <td className="py-3 px-4 text-sm text-success">{rule.compliant}</td>
                  <td className="py-3 px-4 text-sm text-destructive">{rule.violations}</td>
                  <td className="py-3 px-4 text-sm text-warning">{rule.warnings}</td>
                  <td className="py-3 px-4 text-sm font-medium">{rule.rate}</td>
                  <td className="py-3 px-4">
                    {rule.violations === 0 && rule.warnings === 0 ? (
                      <span className="inline-flex items-center gap-1 text-success text-sm">
                        <CheckCircle className="w-4 h-4" />
                        全部合规
                      </span>
                    ) : rule.warnings > 0 ? (
                      <span className="inline-flex items-center gap-1 text-warning text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        {rule.warnings}告警
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-destructive text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {rule.violations}违规
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 违规明细 */}
      {violations.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">违规明细</h3>
          <div className="space-y-4">
            {violations.map((violation) => (
              <div key={violation.id} className="p-4 bg-background rounded-lg border border-border">
                <div className="flex items-start gap-4">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    violation.level === 'danger' ? 'bg-destructive' : 'bg-warning'
                  }`}></div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{violation.crew} - {violation.type}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          违规时间：{violation.time}
                        </p>
                        <p className="text-sm mt-1">
                          当前数值：{violation.current} / 限值：{violation.limit}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        violation.status === '待处理'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-success/10 text-success'
                      }`}>
                        {violation.status}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" size="sm" onClick={() => { setSelectedViolation(violation); setShowFixDialog(true); }}>查看详情</Button>
                      <Button variant="outline" size="sm" onClick={() => window.alert('自动修复方案已应用')}>自动修复</Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="text-sm text-muted-foreground">
        报表生成时间：2026-04-19 12:00:00 | 校验周期：2026-04-14 ~ 2026-04-20 | 整体合规率：100%
      </div>

      {/* 违规详情与修复对话框 */}
      {showFixDialog && selectedViolation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowFixDialog(false)}></div>
          <div className="relative bg-card rounded-lg shadow-lg max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">违规详情与修复方案</h2>
              <button onClick={() => setShowFixDialog(false)} className="p-1 hover:bg-accent rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-accent/30 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">违规信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">机组编号</p>
                    <p className="font-medium mt-1">{selectedViolation.crew}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">违规类型</p>
                    <p className="font-medium mt-1">{selectedViolation.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">当前数值</p>
                    <p className="font-medium mt-1">{selectedViolation.current}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">规则限值</p>
                    <p className="font-medium mt-1">{selectedViolation.limit}</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-3">推荐修复方案</h3>
                <div className="space-y-3">
                  <div className="p-4 border border-border rounded-lg hover:bg-accent/20 cursor-pointer">
                    <div className="flex items-start gap-3">
                      <input type="radio" name="fix" className="mt-1" defaultChecked />
                      <div className="flex-1">
                        <p className="font-medium">方案1：调整后续航班机组</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          将{selectedViolation.crew}未来3天的航班调整给其他机组，确保7天飞行时长不超限
                        </p>
                        <p className="text-xs text-success mt-2">• 影响航班: 2个  • 调整机组: 1个  • 预计合规率: 100%</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border border-border rounded-lg hover:bg-accent/20 cursor-pointer">
                    <div className="flex items-start gap-3">
                      <input type="radio" name="fix" className="mt-1" />
                      <div className="flex-1">
                        <p className="font-medium">方案2：增加休息天数</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          为{selectedViolation.crew}安排2天强制休息，由Standby机组顶替
                        </p>
                        <p className="text-xs text-warning mt-2">• 影响航班: 4个  • 调整机组: 2个  • 预计合规率: 100%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t border-border">
                <Button className="flex-1" onClick={() => { window.alert('修复方案已应用'); setShowFixDialog(false); }}>应用修复方案</Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowFixDialog(false)}>取消</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
