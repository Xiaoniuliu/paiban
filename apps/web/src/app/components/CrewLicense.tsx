import React, { useState } from 'react';
import { Search, Plus, Download, Upload, RefreshCw, Edit, Trash2, Eye, AlertTriangle, X } from 'lucide-react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';

export default function CrewLicense() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<any>(null);
  const [formData, setFormData] = useState({
    crew: '',
    licenseType: '执照',
    licenseNo: '',
    issueDate: '',
    expiryDate: '',
    issuer: '中国民航局',
    qualification: '',
    remarks: ''
  });

  const licenseData = [
    {
      id: 1,
      crew: 'C001',
      name: '张三',
      licenseType: '执照',
      licenseNo: 'CN12345678',
      issueDate: '2020-06-15',
      expiryDate: '2027-06-30',
      daysLeft: 425,
      status: '有效',
      statusColor: 'success',
      issuer: '中国民航局'
    },
    {
      id: 2,
      crew: 'C001',
      name: '张三',
      licenseType: '体检证',
      licenseNo: 'MED2024001',
      issueDate: '2025-12-20',
      expiryDate: '2026-12-31',
      daysLeft: 256,
      status: '有效',
      statusColor: 'success',
      issuer: '民航医院'
    },
    {
      id: 3,
      crew: 'FO1',
      name: '王五',
      licenseType: '执照',
      licenseNo: 'CN87654321',
      issueDate: '2022-03-10',
      expiryDate: '2026-05-15',
      daysLeft: 26,
      status: '即将过期',
      statusColor: 'warning',
      issuer: '中国民航局'
    },
    {
      id: 4,
      crew: 'C002',
      name: '李四',
      licenseType: '英语等级',
      licenseNo: 'ENG-4',
      issueDate: '2023-01-15',
      expiryDate: '2026-01-15',
      daysLeft: 271,
      status: '有效',
      statusColor: 'success',
      issuer: '中国民航局'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">资质证照管理</h1>
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
            新增证照
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">证照总数</p>
          <p className="text-2xl font-semibold mt-1">48</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">有效证照</p>
          <p className="text-2xl font-semibold mt-1 text-success">42</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">即将过期（30天内）</p>
          <p className="text-2xl font-semibold mt-1 text-warning">5</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">已过期</p>
          <p className="text-2xl font-semibold mt-1 text-destructive">1</p>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="搜索工号、姓名或证照号..."
              className="w-full"
            />
          </div>
          <select className="px-3 py-2 rounded-lg border border-border bg-background">
            <option>全部类型</option>
            <option>执照</option>
            <option>体检证</option>
            <option>英语等级</option>
            <option>资质证书</option>
          </select>
          <select className="px-3 py-2 rounded-lg border border-border bg-background">
            <option>全部状态</option>
            <option>有效</option>
            <option>即将过期</option>
            <option>已过期</option>
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
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">证照类型</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">证照号码</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">颁发日期</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">有效期至</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">剩余天数</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">状态</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {licenseData.map((license, idx) => (
                <tr key={license.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                  <td className="py-3 px-4">
                    <input type="checkbox" className="w-4 h-4 rounded border-border" />
                  </td>
                  <td className="py-3 px-4 text-sm">{idx + 1}</td>
                  <td className="py-3 px-4 font-medium">{license.crew}</td>
                  <td className="py-3 px-4">{license.name}</td>
                  <td className="py-3 px-4 text-sm">{license.licenseType}</td>
                  <td className="py-3 px-4 text-sm font-mono">{license.licenseNo}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{license.issueDate}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{license.expiryDate}</td>
                  <td className="py-3 px-4 text-sm">
                    <span className={license.daysLeft < 30 ? 'text-warning font-medium' : ''}>
                      {license.daysLeft}天
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      license.statusColor === 'success'
                        ? 'bg-success/10 text-success'
                        : license.statusColor === 'warning'
                        ? 'bg-warning/10 text-warning'
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {license.statusColor === 'warning' && <AlertTriangle className="w-3 h-3" />}
                      {license.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        className="p-1 hover:bg-accent rounded"
                        onClick={() => {
                          setSelectedLicense(license);
                          setShowViewDialog(true);
                        }}
                      >
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        className="p-1 hover:bg-accent rounded"
                        onClick={() => {
                          setSelectedLicense(license);
                          setFormData({
                            crew: license.crew,
                            licenseType: license.licenseType,
                            licenseNo: license.licenseNo,
                            issueDate: license.issueDate,
                            expiryDate: license.expiryDate,
                            issuer: license.issuer,
                            qualification: '',
                            remarks: ''
                          });
                          setShowEditDialog(true);
                        }}
                      >
                        <Edit className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button className="p-1 hover:bg-accent rounded" onClick={() => window.confirm('确认删除该证照？') && window.alert('删除成功')}>
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
            共 48 条记录
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.alert('已是第一页')}>上一页</Button>
            <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">1</Button>
            <Button variant="outline" size="sm" onClick={() => window.alert('切换到第2页')}>2</Button>
            <Button variant="outline" size="sm" onClick={() => window.alert('切换到下一页')}>下一页</Button>
          </div>
        </div>
      </Card>

      {/* 新增证照对话框 */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowAddDialog(false)}></div>
          <div className="relative bg-card rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">新增证照</h2>
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
                  <label className="block text-sm font-medium mb-2">证照类型 <span className="text-destructive">*</span></label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    value={formData.licenseType}
                    onChange={(e) => setFormData({ ...formData, licenseType: e.target.value })}
                  >
                    <option>执照</option>
                    <option>体检证</option>
                    <option>英语等级</option>
                    <option>资质证书</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">证照号码 <span className="text-destructive">*</span></label>
                  <Input
                    value={formData.licenseNo}
                    onChange={(e) => setFormData({ ...formData, licenseNo: e.target.value })}
                    placeholder="请输入证照号码"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">颁发日期 <span className="text-destructive">*</span></label>
                  <Input
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">有效期至 <span className="text-destructive">*</span></label>
                  <Input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">颁发机构</label>
                  <Input
                    value={formData.issuer}
                    onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                    placeholder="例如: 中国民航局"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">资质说明</label>
                  <Input
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    placeholder="例如: B747/B777机型"
                  />
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

      {/* 查看证照详情对话框 */}
      {showViewDialog && selectedLicense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowViewDialog(false)}></div>
          <div className="relative bg-card rounded-lg shadow-lg max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">证照详情</h2>
              <button onClick={() => setShowViewDialog(false)} className="p-1 hover:bg-accent rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">机组工号</p>
                  <p className="text-lg font-medium">{selectedLicense.crew}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">姓名</p>
                  <p className="text-lg font-medium">{selectedLicense.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">证照类型</p>
                  <p className="text-lg font-medium">{selectedLicense.licenseType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">证照号码</p>
                  <p className="text-lg font-medium font-mono">{selectedLicense.licenseNo}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">颁发日期</p>
                  <p className="text-lg font-medium">{selectedLicense.issueDate}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">有效期至</p>
                  <p className="text-lg font-medium">{selectedLicense.expiryDate}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">剩余天数</p>
                  <p className="text-lg font-medium">{selectedLicense.daysLeft}天</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">颁发机构</p>
                  <p className="text-lg font-medium">{selectedLicense.issuer}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">状态</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedLicense.statusColor === 'success'
                      ? 'bg-success/10 text-success'
                      : selectedLicense.statusColor === 'warning'
                      ? 'bg-warning/10 text-warning'
                      : 'bg-destructive/10 text-destructive'
                  }`}>
                    {selectedLicense.status}
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

      {/* 编辑证照对话框 */}
      {showEditDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowEditDialog(false)}></div>
          <div className="relative bg-card rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">编辑证照</h2>
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
                  <label className="block text-sm font-medium mb-2">证照类型</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    value={formData.licenseType}
                    onChange={(e) => setFormData({ ...formData, licenseType: e.target.value })}
                  >
                    <option>执照</option>
                    <option>体检证</option>
                    <option>英语等级</option>
                    <option>资质证书</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">证照号码</label>
                  <Input
                    value={formData.licenseNo}
                    onChange={(e) => setFormData({ ...formData, licenseNo: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">颁发日期</label>
                  <Input
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">有效期至</label>
                  <Input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">颁发机构</label>
                  <Input
                    value={formData.issuer}
                    onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
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
    </div>
  );
}
