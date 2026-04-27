import React, { useState } from 'react';
import { Search, Plus, Download, Upload, RefreshCw, Edit, Trash2, Eye, X } from 'lucide-react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select } from './ui/select';

export default function CrewManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedCrew, setSelectedCrew] = useState<any>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: '机长',
    qualification: '队长',
    licenseNo: '',
    licenseExpiry: '',
    medicalExpiry: '',
    phone: '',
    email: ''
  });

  const crewData = [
    {
      id: 1,
      code: 'C001',
      name: '张三',
      type: '机长',
      qualification: '队长',
      hours28d: '42h/190h',
      hours7d: '52h/55h',
      sim: '2h',
      ground: '4h',
      duty: '5天',
      status: '飞行执勤',
      lastRest: '12h',
      compliance: '正常',
      complianceColor: 'text-success'
    },
    {
      id: 2,
      code: 'C002',
      name: '李四',
      type: '机长',
      qualification: '队长',
      hours28d: '42h/190h',
      hours7d: '52h/55h',
      sim: '2h',
      ground: '4h',
      duty: '5天',
      status: '飞行执勤',
      lastRest: '12h',
      compliance: '正常',
      complianceColor: 'text-success'
    },
    {
      id: 3,
      code: 'FO1',
      name: '王五',
      type: '副驾',
      qualification: '航线',
      hours28d: '40h/190h',
      hours7d: '50h/55h',
      sim: '3h',
      ground: '5h',
      duty: '5天',
      status: '飞行执勤',
      lastRest: '11h',
      compliance: '告警',
      complianceColor: 'text-warning'
    },
    {
      id: 4,
      code: 'FO5',
      name: '赵六',
      type: '替补',
      qualification: '替补',
      hours28d: '18h/190h',
      hours7d: '0h/55h',
      sim: '0h',
      ground: '2h',
      duty: '0天',
      status: 'Standby',
      lastRest: '24h',
      compliance: '正常',
      complianceColor: 'text-success'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">机组列表</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.alert('导出功能')}>
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
            <Upload className="w-4 h-4 mr-2" />
            导入
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新增机组
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="搜索工号或姓名..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <select className="px-3 py-2 rounded-lg border border-border bg-background">
            <option>全部类型</option>
            <option>机长</option>
            <option>副驾</option>
            <option>替补</option>
          </select>
          <select className="px-3 py-2 rounded-lg border border-border bg-background">
            <option>全部状态</option>
            <option>飞行执勤</option>
            <option>Standby</option>
            <option>休息</option>
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
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">类型</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">资质等级</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">累计飞行(28天)</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">7天执勤</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">模拟机</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">地面培训</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">状态</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">合规状态</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {crewData.map((crew, idx) => (
                <tr key={crew.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                  <td className="py-3 px-4">
                    <input type="checkbox" className="w-4 h-4 rounded border-border" />
                  </td>
                  <td className="py-3 px-4 text-sm">{idx + 1}</td>
                  <td className="py-3 px-4 font-medium">{crew.code}</td>
                  <td className="py-3 px-4">{crew.name}</td>
                  <td className="py-3 px-4 text-sm">{crew.type}</td>
                  <td className="py-3 px-4 text-sm">{crew.qualification}</td>
                  <td className="py-3 px-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span>{crew.hours28d}</span>
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: '22%' }}></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span>{crew.hours7d}</span>
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-warning rounded-full" style={{ width: '95%' }}></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{crew.sim}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{crew.ground}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      crew.status === 'Standby'
                        ? 'bg-warning/10 text-warning'
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {crew.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      crew.compliance === '正常'
                        ? 'bg-success/10 text-success'
                        : 'bg-warning/10 text-warning'
                    }`}>
                      {crew.compliance}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        className="p-1 hover:bg-accent rounded"
                        onClick={() => {
                          setSelectedCrew(crew);
                          setShowViewDialog(true);
                        }}
                      >
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        className="p-1 hover:bg-accent rounded"
                        onClick={() => {
                          setSelectedCrew(crew);
                          setFormData({
                            code: crew.code,
                            name: crew.name,
                            type: crew.type,
                            qualification: crew.qualification,
                            licenseNo: 'CN12345678',
                            licenseExpiry: '2027-06-30',
                            medicalExpiry: '2026-12-31',
                            phone: '13800138000',
                            email: 'crew@example.com'
                          });
                          setShowEditDialog(true);
                        }}
                      >
                        <Edit className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button className="p-1 hover:bg-accent rounded" onClick={() => window.confirm('确认删除该机组？') && window.alert('删除成功')}>
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
            共 4 条记录
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.alert('已是第一页')}>上一页</Button>
            <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">1</Button>
            <Button variant="outline" size="sm" onClick={() => window.alert('切换到第2页')}>2</Button>
            <Button variant="outline" size="sm" onClick={() => window.alert('切换到下一页')}>下一页</Button>
          </div>
        </div>
      </Card>

      {/* 新增机组对话框 */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowAddDialog(false)}></div>
          <div className="relative bg-card rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">新增机组</h2>
              <button onClick={() => setShowAddDialog(false)} className="p-1 hover:bg-accent rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">工号 <span className="text-destructive">*</span></label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="例如: C001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">姓名 <span className="text-destructive">*</span></label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="请输入姓名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">类型 <span className="text-destructive">*</span></label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option>机长</option>
                    <option>副驾</option>
                    <option>替补</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">资质等级</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                  >
                    <option>队长</option>
                    <option>航线</option>
                    <option>替补</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">执照号码</label>
                  <Input
                    value={formData.licenseNo}
                    onChange={(e) => setFormData({ ...formData, licenseNo: e.target.value })}
                    placeholder="例如: CN12345678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">执照有效期</label>
                  <Input
                    type="date"
                    value={formData.licenseExpiry}
                    onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">体检有效期</label>
                  <Input
                    type="date"
                    value={formData.medicalExpiry}
                    onChange={(e) => setFormData({ ...formData, medicalExpiry: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">联系电话</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="请输入手机号"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">邮箱</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="example@email.com"
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

      {/* 查看机组详情对话框 */}
      {showViewDialog && selectedCrew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowViewDialog(false)}></div>
          <div className="relative bg-card rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">机组详情</h2>
              <button onClick={() => setShowViewDialog(false)} className="p-1 hover:bg-accent rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">工号</p>
                  <p className="text-lg font-medium">{selectedCrew.code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">姓名</p>
                  <p className="text-lg font-medium">{selectedCrew.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">类型</p>
                  <p className="text-lg font-medium">{selectedCrew.type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">资质等级</p>
                  <p className="text-lg font-medium">{selectedCrew.qualification}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">28天飞行时长</p>
                  <p className="text-lg font-medium">{selectedCrew.hours28d}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">7天飞行时长</p>
                  <p className="text-lg font-medium">{selectedCrew.hours7d}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">连续执勤天数</p>
                  <p className="text-lg font-medium">{selectedCrew.duty}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">最近休息时长</p>
                  <p className="text-lg font-medium">{selectedCrew.lastRest}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">当前状态</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedCrew.status === 'Standby'
                      ? 'bg-warning/10 text-warning'
                      : 'bg-primary/10 text-primary'
                  }`}>
                    {selectedCrew.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">合规状态</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedCrew.compliance === '正常'
                      ? 'bg-success/10 text-success'
                      : 'bg-warning/10 text-warning'
                  }`}>
                    {selectedCrew.compliance}
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

      {/* 编辑机组对话框 */}
      {showEditDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowEditDialog(false)}></div>
          <div className="relative bg-card rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">编辑机组</h2>
              <button onClick={() => setShowEditDialog(false)} className="p-1 hover:bg-accent rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">工号</label>
                  <Input value={formData.code} disabled className="bg-muted" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">姓名 <span className="text-destructive">*</span></label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">类型</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option>机长</option>
                    <option>副驾</option>
                    <option>替补</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">资质等级</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                  >
                    <option>队长</option>
                    <option>航线</option>
                    <option>替补</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">执照号码</label>
                  <Input
                    value={formData.licenseNo}
                    onChange={(e) => setFormData({ ...formData, licenseNo: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">执照有效期</label>
                  <Input
                    type="date"
                    value={formData.licenseExpiry}
                    onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">体检有效期</label>
                  <Input
                    type="date"
                    value={formData.medicalExpiry}
                    onChange={(e) => setFormData({ ...formData, medicalExpiry: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">联系电话</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">邮箱</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
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

      {/* 导入对话框 */}
      {showImportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowImportDialog(false)}></div>
          <div className="relative bg-card rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">导入机组数据</h2>
              <button onClick={() => setShowImportDialog(false)} className="p-1 hover:bg-accent rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">选择文件</label>
                <input type="file" accept=".xlsx,.xls,.csv" className="w-full px-3 py-2 rounded-lg border border-border bg-background" />
                <p className="text-xs text-muted-foreground mt-2">支持 Excel (.xlsx, .xls) 和 CSV (.csv) 格式</p>
              </div>
              <div className="bg-accent/30 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">导入说明：</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• 请使用标准模板格式</li>
                  <li>• 必填字段：工号、姓名、职位</li>
                  <li>• 重复工号将被跳过</li>
                </ul>
              </div>
            </div>
            <div className="flex gap-2 p-6 border-t border-border">
              <Button className="flex-1" onClick={() => setShowImportDialog(false)}>开始导入</Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowImportDialog(false)}>取消</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
