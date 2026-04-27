import React, { useState } from 'react';
import { Download, FileText, Calendar, CheckCircle, AlertTriangle, Eye, X, Printer } from 'lucide-react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';

export default function ComplianceReports() {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [exportConfig, setExportConfig] = useState({
    reportType: '完整合规报告',
    startDate: '2026-04-14',
    endDate: '2026-04-20',
    includeViolations: true,
    includeCharts: true,
    includeDetails: true,
    format: 'pdf'
  });

  const reportTemplates = [
    {
      id: 1,
      name: '民航局月度合规报告',
      type: '官方报告',
      description: '适用于向民航局提交的月度合规检查报告，包含完整的合规数据和违规处理记录',
      lastGenerated: '2026-04-01',
      frequency: '每月',
      icon: FileText,
      color: 'text-primary'
    },
    {
      id: 2,
      name: '周度合规简报',
      type: '内部报告',
      description: '用于内部管理的周度合规数据简报，包含关键指标和趋势分析',
      lastGenerated: '2026-04-14',
      frequency: '每周',
      icon: Calendar,
      color: 'text-success'
    },
    {
      id: 3,
      name: '违规事件报告',
      type: '专项报告',
      description: '详细记录所有违规事件的处理过程、原因分析和改进措施',
      lastGenerated: '2026-04-10',
      frequency: '按需',
      icon: AlertTriangle,
      color: 'text-warning'
    },
    {
      id: 4,
      name: '机组合规档案',
      type: '数据报告',
      description: '单个机组的完整合规记录，包含飞行时长、休息记录、证照状态等',
      lastGenerated: '2026-04-15',
      frequency: '按需',
      icon: CheckCircle,
      color: 'text-success'
    }
  ];

  const exportHistory = [
    {
      id: 1,
      reportName: '民航局月度合规报告',
      period: '2026年3月',
      generatedBy: '系统管理员',
      generatedAt: '2026-04-01 10:30',
      format: 'PDF',
      fileSize: '2.5 MB',
      status: '已完成',
      downloadUrl: '#'
    },
    {
      id: 2,
      reportName: '周度合规简报',
      period: '2026-04-07 ~ 2026-04-13',
      generatedBy: '张三',
      generatedAt: '2026-04-14 09:15',
      format: 'Excel',
      fileSize: '856 KB',
      status: '已完成',
      downloadUrl: '#'
    },
    {
      id: 3,
      reportName: '违规事件报告',
      period: '2026-04-01 ~ 2026-04-10',
      generatedBy: '李四',
      generatedAt: '2026-04-10 16:20',
      format: 'PDF',
      fileSize: '1.2 MB',
      status: '已完成',
      downloadUrl: '#'
    },
    {
      id: 4,
      reportName: '机组合规档案',
      period: 'C001 - 张三',
      generatedBy: '系统管理员',
      generatedAt: '2026-04-15 14:00',
      format: 'PDF',
      fileSize: '680 KB',
      status: '已完成',
      downloadUrl: '#'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">合规报告导出</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            打印设置
          </Button>
          <Button size="sm" onClick={() => setShowExportDialog(true)}>
            <Download className="w-4 h-4 mr-2" />
            导出新报告
          </Button>
        </div>
      </div>

      {/* 报告模板 */}
      <div>
        <h2 className="text-lg font-semibold mb-4">报告模板</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportTemplates.map((template) => (
            <Card key={template.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className={`${template.color} bg-accent p-3 rounded-lg`}>
                  <template.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{template.name}</h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent">
                        {template.type}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {template.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <span>生成频率：{template.frequency}</span>
                    <span>最近生成：{template.lastGenerated}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedReport(template);
                        setShowExportDialog(true);
                      }}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      生成报告
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.alert('预览模板功能')}>
                      <Eye className="w-3 h-3 mr-1" />
                      预览模板
                    </Button>
                  </div>
                </div>
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
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">报告名称</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">周期/对象</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">生成人</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">生成时间</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">格式</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">大小</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">状态</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {exportHistory.map((record) => (
                <tr key={record.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                  <td className="py-3 px-4 font-medium">{record.reportName}</td>
                  <td className="py-3 px-4 text-sm">{record.period}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{record.generatedBy}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{record.generatedAt}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent">
                      {record.format}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">{record.fileSize}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                      <CheckCircle className="w-3 h-3" />
                      {record.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => window.alert('下载成功')}>
                        <Download className="w-3 h-3 mr-1" />
                        下载
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => window.alert('预览功能')}>
                        <Eye className="w-3 h-3 mr-1" />
                        预览
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
            共 42 条导出记录
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
              <h2 className="text-xl font-semibold">导出报告配置</h2>
              <button onClick={() => setShowExportDialog(false)} className="p-1 hover:bg-accent rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* 报告类型 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  报告类型 <span className="text-destructive">*</span>
                </label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                  value={exportConfig.reportType}
                  onChange={(e) => setExportConfig({ ...exportConfig, reportType: e.target.value })}
                >
                  <option>完整合规报告</option>
                  <option>民航局月度合规报告</option>
                  <option>周度合规简报</option>
                  <option>违规事件报告</option>
                  <option>机组合规档案</option>
                </select>
              </div>

              {/* 时间范围 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  报告周期 <span className="text-destructive">*</span>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                    setExportConfig({
                      ...exportConfig,
                      startDate: weekAgo.toISOString().split('T')[0],
                      endDate: today.toISOString().split('T')[0]
                    });
                  }}
                >
                  最近7天
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                    setExportConfig({
                      ...exportConfig,
                      startDate: monthAgo.toISOString().split('T')[0],
                      endDate: today.toISOString().split('T')[0]
                    });
                  }}
                >
                  最近30天
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.alert('已选择本月')}>本月</Button>
                <Button variant="outline" size="sm" onClick={() => window.alert('已选择上月')}>上月</Button>
              </div>

              {/* 报告内容 */}
              <div>
                <label className="block text-sm font-medium mb-3">报告内容</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 p-3 border border-border rounded-lg hover:bg-accent/50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-border"
                      checked={exportConfig.includeViolations}
                      onChange={(e) => setExportConfig({ ...exportConfig, includeViolations: e.target.checked })}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">包含违规记录</p>
                      <p className="text-xs text-muted-foreground">详细列出所有违规事件及处理情况</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 p-3 border border-border rounded-lg hover:bg-accent/50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-border"
                      checked={exportConfig.includeCharts}
                      onChange={(e) => setExportConfig({ ...exportConfig, includeCharts: e.target.checked })}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">包含图表分析</p>
                      <p className="text-xs text-muted-foreground">趋势图、统计图等可视化内容</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 p-3 border border-border rounded-lg hover:bg-accent/50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-border"
                      checked={exportConfig.includeDetails}
                      onChange={(e) => setExportConfig({ ...exportConfig, includeDetails: e.target.checked })}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">包含详细数据</p>
                      <p className="text-xs text-muted-foreground">每个机组的详细飞行记录和时长统计</p>
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
                      exportConfig.format === 'word'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="format"
                      value="word"
                      checked={exportConfig.format === 'word'}
                      onChange={(e) => setExportConfig({ ...exportConfig, format: e.target.value })}
                      className="sr-only"
                    />
                    <FileText className="w-5 h-5" />
                    <span className="font-medium">Word</span>
                  </label>
                </div>
              </div>

              {/* 预计信息 */}
              <div className="bg-accent/30 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">预计报告信息</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">报告周期</p>
                    <p className="font-medium">{exportConfig.startDate} ~ {exportConfig.endDate}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">预计大小</p>
                    <p className="font-medium">约 1.8 MB</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">包含内容</p>
                    <p className="font-medium">
                      {[
                        exportConfig.includeViolations && '违规记录',
                        exportConfig.includeCharts && '图表',
                        exportConfig.includeDetails && '详细数据'
                      ].filter(Boolean).join('、') || '基础数据'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">生成时间</p>
                    <p className="font-medium">约 30秒</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-border">
                <Button className="flex-1" onClick={() => setShowExportDialog(false)}>
                  <Download className="w-4 h-4 mr-2" />
                  开始生成
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
