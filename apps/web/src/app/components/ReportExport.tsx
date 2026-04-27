import React, { useState } from 'react';
import { Download, FileText, Calendar, TrendingUp, Users, Plane, Eye, X } from 'lucide-react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';

export default function ReportExport() {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportConfig, setExportConfig] = useState({
    reportType: '机组排班统计',
    startDate: '2026-04-14',
    endDate: '2026-04-20',
    format: 'excel',
    includeCharts: true,
    includeDetails: true
  });

  const reportTemplates = [
    {
      id: 1,
      name: '机组排班统计表',
      category: '运营报表',
      description: '包含机组飞行次数、时长统计、执勤天数等详细数据',
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      fields: ['机组信息', '飞行统计', '执勤记录', '合规率']
    },
    {
      id: 2,
      name: '航班执行报表',
      category: '运营报表',
      description: '航班完成率、飞行总时长、合规率等核心运营指标',
      icon: Plane,
      color: 'text-success',
      bgColor: 'bg-success/10',
      fields: ['航班信息', '完成率', '飞行时长', '异常记录']
    },
    {
      id: 3,
      name: '合规校验报表',
      category: '合规报表',
      description: '民航局检查专用，包含所有合规规则的校验结果',
      icon: FileText,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      fields: ['校验规则', '合规率', '违规记录', '处理情况']
    },
    {
      id: 4,
      name: '趋势分析报表',
      category: '分析报表',
      description: '飞行时长趋势、合规率变化、机组利用率等分析数据',
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      fields: ['趋势图表', '对比分析', '预测数据', '建议方案']
    },
    {
      id: 5,
      name: '周期汇总报表',
      category: '汇总报表',
      description: '周度/月度/季度/年度数据汇总统计',
      icon: Calendar,
      color: 'text-success',
      bgColor: 'bg-success/10',
      fields: ['周期统计', '同比环比', '关键指标', '总结分析']
    }
  ];

  const exportHistory = [
    {
      id: 1,
      name: '机组排班统计表',
      period: '2026-04-07 ~ 2026-04-13',
      format: 'Excel',
      size: '1.2 MB',
      createdAt: '2026-04-14 10:30',
      createdBy: '张三',
      status: '已完成'
    },
    {
      id: 2,
      name: '航班执行报表',
      period: '2026-04-01 ~ 2026-04-13',
      format: 'PDF',
      size: '2.8 MB',
      createdAt: '2026-04-14 09:15',
      createdBy: '李四',
      status: '已完成'
    },
    {
      id: 3,
      name: '合规校验报表',
      period: '2026-03-01 ~ 2026-03-31',
      format: 'Excel',
      size: '3.5 MB',
      createdAt: '2026-04-01 14:20',
      createdBy: '系统管理员',
      status: '已完成'
    },
    {
      id: 4,
      name: '趋势分析报表',
      period: '2026-01-01 ~ 2026-03-31',
      format: 'PDF',
      size: '5.2 MB',
      createdAt: '2026-04-01 11:45',
      createdBy: '王五',
      status: '已完成'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">数据导出</h1>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowExportDialog(true)}>
            <Download className="w-4 h-4 mr-2" />
            导出新报表
          </Button>
        </div>
      </div>

      {/* 报表模板 */}
      <div>
        <h2 className="text-lg font-semibold mb-4">报表模板</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportTemplates.map((template) => (
            <Card key={template.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4 mb-4">
                <div className={`${template.bgColor} ${template.color} p-3 rounded-lg`}>
                  <template.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{template.name}</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent">
                    {template.category}
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {template.description}
              </p>
              <div className="mb-4">
                <p className="text-xs font-medium mb-2 text-muted-foreground">包含字段：</p>
                <div className="flex flex-wrap gap-1">
                  {template.fields.map((field, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-accent rounded text-xs">
                      {field}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setExportConfig({ ...exportConfig, reportType: template.name });
                    setShowExportDialog(true);
                  }}
                >
                  <Download className="w-3 h-3 mr-1" />
                  导出
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.alert('预览功能')}>
                  <Eye className="w-3 h-3 mr-1" />
                  预览
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* 导出历史 */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">导出历史</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">报表名称</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">周期</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">格式</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">大小</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">导出时间</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">导出人</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">状态</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {exportHistory.map((record) => (
                <tr key={record.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                  <td className="py-3 px-4 font-medium">{record.name}</td>
                  <td className="py-3 px-4 text-sm">{record.period}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent">
                      {record.format}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">{record.size}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{record.createdAt}</td>
                  <td className="py-3 px-4 text-sm">{record.createdBy}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                      {record.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => window.alert('下载成功')}>
                        <Download className="w-3 h-3 mr-1" />
                        下载
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-muted-foreground">
            共 52 条导出记录
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.alert('已是第一页')}>上一页</Button>
            <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">1</Button>
            <Button variant="outline" size="sm" onClick={() => window.alert('切换到第2页')}>2</Button>
            <Button variant="outline" size="sm" onClick={() => window.alert('切换到下一页')}>下一页</Button>
          </div>
        </div>
      </Card>

      {/* 导出配置对话框 */}
      {showExportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowExportDialog(false)}></div>
          <div className="relative bg-card rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">导出报表配置</h2>
              <button onClick={() => setShowExportDialog(false)} className="p-1 hover:bg-accent rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* 报表类型 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  报表类型 <span className="text-destructive">*</span>
                </label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                  value={exportConfig.reportType}
                  onChange={(e) => setExportConfig({ ...exportConfig, reportType: e.target.value })}
                >
                  <option>机组排班统计</option>
                  <option>航班执行报表</option>
                  <option>合规校验报表</option>
                  <option>趋势分析报表</option>
                  <option>周期汇总报表</option>
                </select>
              </div>

              {/* 时间范围 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  报表周期 <span className="text-destructive">*</span>
                </label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="date"
                    value={exportConfig.startDate}
                    onChange={(e) => setExportConfig({ ...exportConfig, startDate: e.target.value })}
                    className="flex-1"
                  />
                  <span>至</span>
                  <Input
                    type="date"
                    value={exportConfig.endDate}
                    onChange={(e) => setExportConfig({ ...exportConfig, endDate: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* 快捷选择 */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => window.alert('已选择本周')}>本周</Button>
                <Button variant="outline" size="sm" onClick={() => window.alert('已选择本月')}>本月</Button>
                <Button variant="outline" size="sm" onClick={() => window.alert('已选择最近7天')}>最近7天</Button>
                <Button variant="outline" size="sm" onClick={() => window.alert('已选择最近30天')}>最近30天</Button>
              </div>

              {/* 报表选项 */}
              <div>
                <label className="block text-sm font-medium mb-3">报表选项</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-3 border border-border rounded-lg hover:bg-accent/50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-border"
                      checked={exportConfig.includeCharts}
                      onChange={(e) => setExportConfig({ ...exportConfig, includeCharts: e.target.checked })}
                    />
                    <div>
                      <p className="text-sm font-medium">包含图表</p>
                      <p className="text-xs text-muted-foreground">导出趋势图、统计图等可视化内容</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 p-3 border border-border rounded-lg hover:bg-accent/50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-border"
                      checked={exportConfig.includeDetails}
                      onChange={(e) => setExportConfig({ ...exportConfig, includeDetails: e.target.checked })}
                    />
                    <div>
                      <p className="text-sm font-medium">包含明细数据</p>
                      <p className="text-xs text-muted-foreground">导出每条记录的详细信息</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 导出格式 */}
              <div>
                <label className="block text-sm font-medium mb-2">导出格式</label>
                <div className="grid grid-cols-3 gap-3">
                  <label
                    className={`flex items-center justify-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      exportConfig.format === 'excel'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="format"
                      value="excel"
                      checked={exportConfig.format === 'excel'}
                      onChange={(e) => setExportConfig({ ...exportConfig, format: e.target.value })}
                      className="sr-only"
                    />
                    <FileText className="w-5 h-5" />
                    <span className="font-medium">Excel</span>
                  </label>
                  <label
                    className={`flex items-center justify-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      exportConfig.format === 'pdf'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="format"
                      value="pdf"
                      checked={exportConfig.format === 'pdf'}
                      onChange={(e) => setExportConfig({ ...exportConfig, format: e.target.value })}
                      className="sr-only"
                    />
                    <FileText className="w-5 h-5" />
                    <span className="font-medium">PDF</span>
                  </label>
                  <label
                    className={`flex items-center justify-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      exportConfig.format === 'csv'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="format"
                      value="csv"
                      checked={exportConfig.format === 'csv'}
                      onChange={(e) => setExportConfig({ ...exportConfig, format: e.target.value })}
                      className="sr-only"
                    />
                    <FileText className="w-5 h-5" />
                    <span className="font-medium">CSV</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-border">
                <Button className="flex-1" onClick={() => setShowExportDialog(false)}>
                  <Download className="w-4 h-4 mr-2" />
                  开始导出
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowExportDialog(false)}>
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
