import React, { useState } from 'react';
import { Download, Printer, RefreshCw, FileText, X, Calendar } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';

export default function ReportCenter() {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showDateDialog, setShowDateDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');
  const [exportType, setExportType] = useState('all');
  const crewStats = [
    { code: 'C1', name: '张三', position: '机长', flights: 13, hours28d: '42h/190h', hours7d: '10h/55h', duty: '5天', standby: 0, status: '执勤', compliance: '100%' },
    { code: 'C2', name: '李四', position: '机长', flights: 13, hours28d: '42h/190h', hours7d: '10h/55h', duty: '5天', standby: 0, status: '执勤', compliance: '100%' },
    { code: 'FO1', name: '王五', position: '副驾', flights: 13, hours28d: '42h/190h', hours7d: '10h/55h', duty: '5天', standby: 0, status: '执勤', compliance: '100%' },
    { code: 'FO5', name: '赵六', position: '替补', flights: 0, hours28d: '18h/190h', hours7d: '0h/55h', duty: '0天', standby: 9, status: 'Standby', compliance: '100%' }
  ];

  const aircraftStats = [
    { aircraft: 'AC1', type: 'B747-F', flights: 15, completion: '100%', hours: '150h', compliance: '100%', anomaly: 0, status: '正常' },
    { aircraft: 'AC2', type: 'B777-F', flights: 15, completion: '100%', hours: '150h', compliance: '100%', anomaly: 0, status: '正常' }
  ];

  const complianceStats = [
    { rule: '连续执勤天数≤6天', total: 11, compliant: 11, violations: 0, warnings: 0, rate: '100%' },
    { rule: '飞行后休息≥11小时', total: 11, compliant: 11, violations: 0, warnings: 0, rate: '100%' },
    { rule: 'FDP执勤期≤14小时', total: 30, compliant: 30, violations: 0, warnings: 0, rate: '100%' },
    { rule: '28天飞行时长≤190小时', total: 11, compliant: 11, violations: 0, warnings: 0, rate: '100%' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">报表中心</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setExportFormat('excel'); setShowExportDialog(true); }}>
            <Download className="w-4 h-4 mr-2" />
            导出Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setExportFormat('pdf'); setShowExportDialog(true); }}>
            <Download className="w-4 h-4 mr-2" />
            导出PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            打印
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>
      </div>

      {/* 筛选条件 */}
      <Card className="p-6">
        <div className="flex flex-wrap gap-4">
          <select className="px-3 py-2 rounded-lg border border-border bg-background">
            <option>全部报表</option>
            <option>机组排班统计</option>
            <option>航班执行统计</option>
            <option>合规校验报表</option>
          </select>
          <select className="px-3 py-2 rounded-lg border border-border bg-background">
            <option>2026-04-14 ~ 2026-04-20</option>
            <option>本周</option>
            <option>本月</option>
            <option>自定义</option>
          </select>
          <select className="px-3 py-2 rounded-lg border border-border bg-background">
            <option>全部</option>
            <option>AC1</option>
            <option>AC2</option>
          </select>
          <Button onClick={() => window.alert('报表已生成')}>生成报表</Button>
        </div>
      </Card>

      {/* 机组排班统计 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">1. 机组排班统计表（11名飞行员）</h3>
          <Button variant="outline" size="sm" onClick={() => window.alert('导出成功')}>
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
        </div>

        {/* 汇总 */}
        <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">总机组数</p>
            <p className="text-2xl font-semibold mt-1">11人</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">总飞行次数</p>
            <p className="text-2xl font-semibold mt-1">104次</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">总飞行时长</p>
            <p className="text-2xl font-semibold mt-1">312小时</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">整体合规率</p>
            <p className="text-2xl font-semibold mt-1 text-success">100%</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">序号</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">机组</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">职位</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">飞行次数</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">28天时长</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">7天时长</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">执勤天数</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Standby</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">状态</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">合规率</th>
              </tr>
            </thead>
            <tbody>
              {crewStats.map((crew, idx) => (
                <tr key={idx} className="border-b border-border last:border-0 hover:bg-accent/50">
                  <td className="py-3 px-4 text-sm">{idx + 1}</td>
                  <td className="py-3 px-4 font-medium">{crew.code}</td>
                  <td className="py-3 px-4 text-sm">{crew.position}</td>
                  <td className="py-3 px-4 text-sm">{crew.flights}</td>
                  <td className="py-3 px-4 text-sm">{crew.hours28d}</td>
                  <td className="py-3 px-4 text-sm">{crew.hours7d}</td>
                  <td className="py-3 px-4 text-sm">{crew.duty}</td>
                  <td className="py-3 px-4 text-sm">{crew.standby}</td>
                  <td className="py-3 px-4 text-sm">{crew.status}</td>
                  <td className="py-3 px-4 text-sm text-success font-medium">{crew.compliance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 航班执行报表 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">2. 航班执行报表（2架货机）</h3>
          <Button variant="outline" size="sm" onClick={() => window.alert('导出成功')}>
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">序号</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">机号</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">机型</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">航班数</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">完成率</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">飞行总时长</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">合规率</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">异常次数</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">状态</th>
              </tr>
            </thead>
            <tbody>
              {aircraftStats.map((aircraft, idx) => (
                <tr key={idx} className="border-b border-border last:border-0 hover:bg-accent/50">
                  <td className="py-3 px-4 text-sm">{idx + 1}</td>
                  <td className="py-3 px-4 font-medium">{aircraft.aircraft}</td>
                  <td className="py-3 px-4 text-sm">{aircraft.type}</td>
                  <td className="py-3 px-4 text-sm">{aircraft.flights}班</td>
                  <td className="py-3 px-4 text-sm text-success font-medium">{aircraft.completion}</td>
                  <td className="py-3 px-4 text-sm">{aircraft.hours}</td>
                  <td className="py-3 px-4 text-sm text-success font-medium">{aircraft.compliance}</td>
                  <td className="py-3 px-4 text-sm">{aircraft.anomaly}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                      {aircraft.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 合规报表 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">3. 合规&疲劳报表（民航局检查专用）</h3>
          <Button variant="outline" size="sm" onClick={() => window.alert('导出成功')}>
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
        </div>

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
              </tr>
            </thead>
            <tbody>
              {complianceStats.map((stat, idx) => (
                <tr key={idx} className="border-b border-border last:border-0 hover:bg-accent/50">
                  <td className="py-3 px-4 text-sm">{idx + 1}</td>
                  <td className="py-3 px-4 font-medium">{stat.rule}</td>
                  <td className="py-3 px-4 text-sm">{stat.total}</td>
                  <td className="py-3 px-4 text-sm text-success">{stat.compliant}</td>
                  <td className="py-3 px-4 text-sm text-destructive">{stat.violations}</td>
                  <td className="py-3 px-4 text-sm text-warning">{stat.warnings}</td>
                  <td className="py-3 px-4 text-sm text-success font-medium">{stat.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="text-sm text-muted-foreground">
        报表生成时间：2026-04-19 12:00:00 | 周期：2026-04-14 ~ 2026-04-20 | 整体合规率：100%
      </div>

      {/* 导出配置对话框 */}
      {showExportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowExportDialog(false)}></div>
          <div className="relative bg-card rounded-lg shadow-lg max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">导出报表</h2>
              <button onClick={() => setShowExportDialog(false)} className="p-1 hover:bg-accent rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* 报表类型选择 */}
              <div>
                <label className="block text-sm font-medium mb-3">报表类型 *</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <input type="radio" id="export-all" name="exportType" value="all" defaultChecked onChange={(e) => setExportType(e.target.value)} className="w-4 h-4" />
                    <label htmlFor="export-all" className="text-sm">全部报表（机组统计 + 航班统计 + 合规报表）</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="radio" id="export-crew" name="exportType" value="crew" onChange={(e) => setExportType(e.target.value)} className="w-4 h-4" />
                    <label htmlFor="export-crew" className="text-sm">仅机组排班统计表</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="radio" id="export-flight" name="exportType" value="flight" onChange={(e) => setExportType(e.target.value)} className="w-4 h-4" />
                    <label htmlFor="export-flight" className="text-sm">仅航班执行报表</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="radio" id="export-compliance" name="exportType" value="compliance" onChange={(e) => setExportType(e.target.value)} className="w-4 h-4" />
                    <label htmlFor="export-compliance" className="text-sm">仅合规&疲劳报表</label>
                  </div>
                </div>
              </div>

              {/* 导出格式 */}
              <div>
                <label className="block text-sm font-medium mb-3">导出格式 *</label>
                <div className="flex gap-4">
                  <div className="flex items-center gap-3">
                    <input type="radio" id="format-excel" name="format" value="excel" checked={exportFormat === 'excel'} onChange={(e) => setExportFormat(e.target.value)} className="w-4 h-4" />
                    <label htmlFor="format-excel" className="text-sm">Excel (.xlsx)</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="radio" id="format-pdf" name="format" value="pdf" checked={exportFormat === 'pdf'} onChange={(e) => setExportFormat(e.target.value)} className="w-4 h-4" />
                    <label htmlFor="format-pdf" className="text-sm">PDF (.pdf)</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="radio" id="format-csv" name="format" value="csv" onChange={(e) => setExportFormat(e.target.value)} className="w-4 h-4" />
                    <label htmlFor="format-csv" className="text-sm">CSV (.csv)</label>
                  </div>
                </div>
              </div>

              {/* 导出选项 */}
              <div>
                <label className="block text-sm font-medium mb-3">导出选项</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="include-charts" defaultChecked className="w-4 h-4 rounded border-border" />
                    <label htmlFor="include-charts" className="text-sm">包含图表分析</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="include-summary" defaultChecked className="w-4 h-4 rounded border-border" />
                    <label htmlFor="include-summary" className="text-sm">包含汇总数据</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="include-details" defaultChecked className="w-4 h-4 rounded border-border" />
                    <label htmlFor="include-details" className="text-sm">包含详细数据</label>
                  </div>
                </div>
              </div>

              {/* 预计文件信息 */}
              <div className="bg-accent/30 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">预计文件大小: ~2.5 MB</p>
                <p className="text-sm text-muted-foreground mt-1">包含数据:
                  {exportType === 'all' && ' 机组统计(11人) + 航班统计(30班) + 合规报表(20项)'}
                  {exportType === 'crew' && ' 机组统计(11人)'}
                  {exportType === 'flight' && ' 航班统计(30班)'}
                  {exportType === 'compliance' && ' 合规报表(20项)'}
                </p>
              </div>
            </div>
            <div className="flex gap-2 p-6 border-t border-border">
              <Button className="flex-1" onClick={() => setShowExportDialog(false)}>
                <Download className="w-4 h-4 mr-2" />
                确认导出
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowExportDialog(false)}>取消</Button>
            </div>
          </div>
        </div>
      )}

      {/* 日期选择对话框 */}
      {showDateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDateDialog(false)}></div>
          <div className="relative bg-card rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">选择时间范围</h2>
              <button onClick={() => setShowDateDialog(false)} className="p-1 hover:bg-accent rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">开始日期 *</label>
                <input type="date" defaultValue="2026-04-14" className="w-full px-3 py-2 rounded-lg border border-border bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">结束日期 *</label>
                <input type="date" defaultValue="2026-04-20" className="w-full px-3 py-2 rounded-lg border border-border bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-3">快捷选择</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.alert('已选择本周')}>本周</Button>
                  <Button variant="outline" size="sm" onClick={() => window.alert('已选择本月')}>本月</Button>
                  <Button variant="outline" size="sm" onClick={() => window.alert('已选择最近7天')}>最近7天</Button>
                  <Button variant="outline" size="sm" onClick={() => window.alert('已选择最近30天')}>最近30天</Button>
                </div>
              </div>
            </div>
            <div className="flex gap-2 p-6 border-t border-border">
              <Button className="flex-1" onClick={() => setShowDateDialog(false)}>确定</Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowDateDialog(false)}>取消</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
