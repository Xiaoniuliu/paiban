import React, { useState } from 'react';
import { Plus, Edit, Eye, Trash2, X, MapPin } from 'lucide-react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';

export default function FlightRoute() {
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'view' | 'edit'>('add');
  const [selectedRoute, setSelectedRoute] = useState<any>(null);

  const routeList = [
    {
      id: 1,
      routeCode: 'MFM-TPE',
      routeName: '澳门-台北',
      departure: '澳门国际机场',
      departureCode: 'MFM',
      arrival: '桃园国际机场',
      arrivalCode: 'TPE',
      distance: 712,
      estimatedTime: '1h 30m',
      timezone: '+8/+8',
      aircraftType: 'B747-F, B777-F',
      frequency: '每日2班',
      status: '运营中',
      notes: '主要货运航线'
    },
    {
      id: 2,
      routeCode: 'MFM-NRT',
      routeName: '澳门-东京',
      departure: '澳门国际机场',
      departureCode: 'MFM',
      arrival: '成田国际机场',
      arrivalCode: 'NRT',
      distance: 2895,
      estimatedTime: '4h 15m',
      timezone: '+8/+9',
      aircraftType: 'B777-F',
      frequency: '每周5班',
      status: '运营中',
      notes: '跨时区航线'
    },
    {
      id: 3,
      routeCode: 'MFM-ICN',
      routeName: '澳门-首尔',
      departure: '澳门国际机场',
      departureCode: 'MFM',
      arrival: '仁川国际机场',
      arrivalCode: 'ICN',
      distance: 2165,
      estimatedTime: '3h 30m',
      timezone: '+8/+9',
      aircraftType: 'B747-F, B777-F',
      frequency: '每周3班',
      status: '运营中',
      notes: '货运专线'
    },
    {
      id: 4,
      routeCode: 'MFM-SIN',
      routeName: '澳门-新加坡',
      departure: '澳门国际机场',
      departureCode: 'MFM',
      arrival: '樟宜国际机场',
      arrivalCode: 'SIN',
      distance: 2585,
      estimatedTime: '3h 45m',
      timezone: '+8/+8',
      aircraftType: 'B777-F',
      frequency: '每周2班',
      status: '运营中',
      notes: '东南亚线路'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">航线管理</h1>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { setDialogMode('add'); setSelectedRoute(null); setShowDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            新增航线
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">总航线数</p>
              <h3 className="text-3xl font-semibold">4</h3>
            </div>
            <MapPin className="w-8 h-8 text-primary" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">运营中</p>
              <h3 className="text-3xl font-semibold text-success">4</h3>
            </div>
            <MapPin className="w-8 h-8 text-success" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">暂停</p>
              <h3 className="text-3xl font-semibold">0</h3>
            </div>
            <MapPin className="w-8 h-8 text-warning" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">总飞行距离</p>
              <h3 className="text-xl font-semibold">8,357 km</h3>
            </div>
            <MapPin className="w-8 h-8 text-primary" />
          </div>
        </Card>
      </div>

      {/* 航线列表 */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">序号</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">航线代码</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">航线名称</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">起飞机场</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">到达机场</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">距离（km）</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">预计时间</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">适用机型</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">班次频率</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">状态</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {routeList.map((route, idx) => (
                <tr key={route.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                  <td className="py-3 px-4 text-sm">{idx + 1}</td>
                  <td className="py-3 px-4 font-medium">{route.routeCode}</td>
                  <td className="py-3 px-4 font-medium">{route.routeName}</td>
                  <td className="py-3 px-4 text-sm">
                    <div>{route.departure}</div>
                    <div className="text-xs text-muted-foreground">{route.departureCode}</div>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <div>{route.arrival}</div>
                    <div className="text-xs text-muted-foreground">{route.arrivalCode}</div>
                  </td>
                  <td className="py-3 px-4 text-sm">{route.distance}</td>
                  <td className="py-3 px-4 text-sm">{route.estimatedTime}</td>
                  <td className="py-3 px-4 text-sm">{route.aircraftType}</td>
                  <td className="py-3 px-4 text-sm">{route.frequency}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                      {route.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button className="p-1 hover:bg-accent rounded" onClick={() => { setDialogMode('view'); setSelectedRoute(route); setShowDialog(true); }}>
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button className="p-1 hover:bg-accent rounded" onClick={() => { setDialogMode('edit'); setSelectedRoute(route); setShowDialog(true); }}>
                        <Edit className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button className="p-1 hover:bg-accent rounded" onClick={() => window.confirm('确认删除该航线？') && window.alert('删除成功')}>
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
          <div className="relative bg-card rounded-lg shadow-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">
                {dialogMode === 'add' && '新增航线'}
                {dialogMode === 'view' && '航线详情'}
                {dialogMode === 'edit' && '编辑航线'}
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
                      航线代码 <span className="text-destructive">*</span>
                    </label>
                    <Input
                      defaultValue={selectedRoute?.routeCode || ''}
                      placeholder="例如：MFM-TPE"
                      disabled={dialogMode === 'view'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      航线名称 <span className="text-destructive">*</span>
                    </label>
                    <Input
                      defaultValue={selectedRoute?.routeName || ''}
                      placeholder="例如：澳门-台北"
                      disabled={dialogMode === 'view'}
                    />
                  </div>
                </div>
              </div>

              {/* 起飞信息 */}
              <div>
                <h3 className="font-semibold mb-4">起飞机场</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      机场名称 <span className="text-destructive">*</span>
                    </label>
                    <Input
                      defaultValue={selectedRoute?.departure || ''}
                      placeholder="例如：澳门国际机场"
                      disabled={dialogMode === 'view'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      机场代码 <span className="text-destructive">*</span>
                    </label>
                    <Input
                      defaultValue={selectedRoute?.departureCode || ''}
                      placeholder="例如：MFM"
                      disabled={dialogMode === 'view'}
                    />
                  </div>
                </div>
              </div>

              {/* 到达信息 */}
              <div>
                <h3 className="font-semibold mb-4">到达机场</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      机场名称 <span className="text-destructive">*</span>
                    </label>
                    <Input
                      defaultValue={selectedRoute?.arrival || ''}
                      placeholder="例如：桃园国际机场"
                      disabled={dialogMode === 'view'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      机场代码 <span className="text-destructive">*</span>
                    </label>
                    <Input
                      defaultValue={selectedRoute?.arrivalCode || ''}
                      placeholder="例如：TPE"
                      disabled={dialogMode === 'view'}
                    />
                  </div>
                </div>
              </div>

              {/* 航线参数 */}
              <div>
                <h3 className="font-semibold mb-4">航线参数</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      距离（km） <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="number"
                      defaultValue={selectedRoute?.distance || ''}
                      placeholder="公里"
                      disabled={dialogMode === 'view'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">预计飞行时间</label>
                    <Input
                      defaultValue={selectedRoute?.estimatedTime || ''}
                      placeholder="例如：1h 30m"
                      disabled={dialogMode === 'view'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">时区</label>
                    <Input
                      defaultValue={selectedRoute?.timezone || ''}
                      placeholder="例如：+8/+8"
                      disabled={dialogMode === 'view'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">适用机型</label>
                    <Input
                      defaultValue={selectedRoute?.aircraftType || ''}
                      placeholder="例如：B747-F, B777-F"
                      disabled={dialogMode === 'view'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">班次频率</label>
                    <Input
                      defaultValue={selectedRoute?.frequency || ''}
                      placeholder="例如：每日2班"
                      disabled={dialogMode === 'view'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      状态 <span className="text-destructive">*</span>
                    </label>
                    <select
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                      defaultValue={selectedRoute?.status || '运营中'}
                      disabled={dialogMode === 'view'}
                    >
                      <option value="运营中">运营中</option>
                      <option value="暂停">暂停</option>
                      <option value="停运">停运</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 备注 */}
              <div>
                <label className="block text-sm font-medium mb-2">备注</label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background min-h-[80px]"
                  defaultValue={selectedRoute?.notes || ''}
                  placeholder="航线说明信息"
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
