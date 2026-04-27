import React, { useState } from 'react';
import { Plus, Edit, Eye, Trash2, X, Plane, AlertCircle, CheckCircle } from 'lucide-react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';

export default function FlightAircraft() {
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'view' | 'edit'>('add');
  const [selectedAircraft, setSelectedAircraft] = useState<any>(null);

  const aircraftList = [
    {
      id: 1,
      registration: 'B-HUR',
      model: 'B747-400F',
      manufacturer: 'Boeing',
      serialNumber: '25865',
      yearOfManufacture: 2001,
      owner: '全球通货运',
      status: '运营中',
      totalFlightHours: 45823,
      totalCycles: 18456,
      lastMaintenance: '2026-03-15',
      nextMaintenance: '2026-05-15',
      maintenanceStatus: '正常',
      airworthiness: '2027-12-31',
      insurance: '2026-12-31',
      baseAirport: '澳门',
      maxPayload: '112,760 kg',
      maxRange: '7,670 km',
      seats: 0,
      notes: '主力货机，状态良好'
    },
    {
      id: 2,
      registration: 'B-KQW',
      model: 'B777-200F',
      manufacturer: 'Boeing',
      serialNumber: '38775',
      yearOfManufacture: 2008,
      owner: '全球通货运',
      status: '运营中',
      totalFlightHours: 32145,
      totalCycles: 12987,
      lastMaintenance: '2026-04-01',
      nextMaintenance: '2026-06-01',
      maintenanceStatus: '正常',
      airworthiness: '2027-08-30',
      insurance: '2026-10-15',
      baseAirport: '澳门',
      maxPayload: '102,010 kg',
      maxRange: '9,070 km',
      seats: 0,
      notes: '高效货机，适合远程航线'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">飞机档案</h1>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { setDialogMode('add'); setSelectedAircraft(null); setShowDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            新增飞机
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">总飞机数</p>
              <h3 className="text-3xl font-semibold">2</h3>
            </div>
            <Plane className="w-8 h-8 text-primary" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">运营中</p>
              <h3 className="text-3xl font-semibold text-success">2</h3>
            </div>
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">维护中</p>
              <h3 className="text-3xl font-semibold">0</h3>
            </div>
            <AlertCircle className="w-8 h-8 text-warning" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">停用</p>
              <h3 className="text-3xl font-semibold">0</h3>
            </div>
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* 飞机列表 */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">序号</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">注册号</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">机型</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">制造商</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">序列号</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">制造年份</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">飞行小时</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">起落次数</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">维护状态</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">状态</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {aircraftList.map((aircraft, idx) => (
                <tr key={aircraft.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                  <td className="py-3 px-4 text-sm">{idx + 1}</td>
                  <td className="py-3 px-4 font-medium">{aircraft.registration}</td>
                  <td className="py-3 px-4 text-sm">{aircraft.model}</td>
                  <td className="py-3 px-4 text-sm">{aircraft.manufacturer}</td>
                  <td className="py-3 px-4 text-sm">{aircraft.serialNumber}</td>
                  <td className="py-3 px-4 text-sm">{aircraft.yearOfManufacture}</td>
                  <td className="py-3 px-4 text-sm">{aircraft.totalFlightHours.toLocaleString()}h</td>
                  <td className="py-3 px-4 text-sm">{aircraft.totalCycles.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                      {aircraft.maintenanceStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                      {aircraft.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button className="p-1 hover:bg-accent rounded" onClick={() => { setDialogMode('view'); setSelectedAircraft(aircraft); setShowDialog(true); }}>
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button className="p-1 hover:bg-accent rounded" onClick={() => { setDialogMode('edit'); setSelectedAircraft(aircraft); setShowDialog(true); }}>
                        <Edit className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button className="p-1 hover:bg-accent rounded" onClick={() => window.confirm('确认删除该飞机档案？') && window.alert('删除成功')}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 新增/查看/编辑对话框 */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDialog(false)}></div>
          <div className="relative bg-card rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">
                {dialogMode === 'add' && '新增飞机'}
                {dialogMode === 'view' && '飞机详情'}
                {dialogMode === 'edit' && '编辑飞机'}
              </h2>
              <button onClick={() => setShowDialog(false)} className="p-1 hover:bg-accent rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* 基本信息 */}
              <div>
                <h3 className="font-semibold mb-4">基本信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      注册号 <span className="text-destructive">*</span>
                    </label>
                    <Input
                      defaultValue={selectedAircraft?.registration || ''}
                      placeholder="例如：B-HUR"
                      disabled={dialogMode === 'view'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      机型 <span className="text-destructive">*</span>
                    </label>
                    <Input
                      defaultValue={selectedAircraft?.model || ''}
                      placeholder="例如：B747-400F"
                      disabled={dialogMode === 'view'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      制造商 <span className="text-destructive">*</span>
                    </label>
                    <select
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                      defaultValue={selectedAircraft?.manufacturer || ''}
                      disabled={dialogMode === 'view'}
                    >
                      <option value="">请选择制造商</option>
                      <option value="Boeing">Boeing（波音）</option>
                      <option value="Airbus">Airbus（空客）</option>
                      <option value="McDonnell Douglas">McDonnell Douglas（麦道）</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      序列号 <span className="text-destructive">*</span>
                    </label>
                    <Input
                      defaultValue={selectedAircraft?.serialNumber || ''}
                      placeholder="飞机序列号"
                      disabled={dialogMode === 'view'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">制造年份</label>
                    <Input
                      type="number"
                      defaultValue={selectedAircraft?.yearOfManufacture || ''}
                      placeholder="例如：2008"
                      disabled={dialogMode === 'view'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">所有人</label>
                    <Input
                      defaultValue={selectedAircraft?.owner || '全球通货运'}
                      disabled={dialogMode === 'view'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">基地机场</label>
                    <Input
                      defaultValue={selectedAircraft?.baseAirport || '澳门'}
                      disabled={dialogMode === 'view'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      状态 <span className="text-destructive">*</span>
                    </label>
                    <select
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                      defaultValue={selectedAircraft?.status || '运营中'}
                      disabled={dialogMode === 'view'}
                    >
                      <option value="运营中">运营中</option>
                      <option value="维护中">维护中</option>
                      <option value="停用">停用</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 性能参数 */}
              <div>
                <h3 className="font-semibold mb-4">性能参数</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">最大载重</label>
                    <Input
                      defaultValue={selectedAircraft?.maxPayload || ''}
                      placeholder="例如：112,760 kg"
                      disabled={dialogMode === 'view'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">最大航程</label>
                    <Input
                      defaultValue={selectedAircraft?.maxRange || ''}
                      placeholder="例如：7,670 km"
                      disabled={dialogMode === 'view'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">座位数</label>
                    <Input
                      type="number"
                      defaultValue={selectedAircraft?.seats || 0}
                      disabled={dialogMode === 'view'}
                    />
                  </div>
                </div>
              </div>

              {/* 运营数据 */}
              <div>
                <h3 className="font-semibold mb-4">运营数据</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">总飞行小时</label>
                    <Input
                      type="number"
                      defaultValue={selectedAircraft?.totalFlightHours || ''}
                      placeholder="小时"
                      disabled={dialogMode === 'view'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">总起落次数</label>
                    <Input
                      type="number"
                      defaultValue={selectedAircraft?.totalCycles || ''}
                      placeholder="次数"
                      disabled={dialogMode === 'view'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">上次维护日期</label>
                    <Input
                      type="date"
                      defaultValue={selectedAircraft?.lastMaintenance || ''}
                      disabled={dialogMode === 'view'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">下次维护日期</label>
                    <Input
                      type="date"
                      defaultValue={selectedAircraft?.nextMaintenance || ''}
                      disabled={dialogMode === 'view'}
                    />
                  </div>
                </div>
              </div>

              {/* 证件有效期 */}
              <div>
                <h3 className="font-semibold mb-4">证件有效期</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">适航证有效期</label>
                    <Input
                      type="date"
                      defaultValue={selectedAircraft?.airworthiness || ''}
                      disabled={dialogMode === 'view'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">保险到期日</label>
                    <Input
                      type="date"
                      defaultValue={selectedAircraft?.insurance || ''}
                      disabled={dialogMode === 'view'}
                    />
                  </div>
                </div>
              </div>

              {/* 备注 */}
              <div>
                <label className="block text-sm font-medium mb-2">备注</label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background min-h-[80px]"
                  defaultValue={selectedAircraft?.notes || ''}
                  placeholder="其他说明信息"
                  disabled={dialogMode === 'view'}
                />
              </div>
            </div>
            {dialogMode !== 'view' && (
              <div className="flex gap-2 p-6 border-t border-border">
                <Button className="flex-1" onClick={() => { window.alert(dialogMode === 'add' ? '新增成功' : '保存成功'); setShowDialog(false); }}>{dialogMode === 'add' ? '新增' : '保存'}</Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowDialog(false)}>取消</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
