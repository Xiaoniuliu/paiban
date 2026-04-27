import React, { useState } from 'react';
import { Search, Plus, Download, Upload, RefreshCw, Edit, Trash2, Eye, Calendar, X } from 'lucide-react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';

export default function FlightManagement() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<any>(null);
  const [flightForm, setFlightForm] = useState({
    flightNo: '',
    aircraft: 'AC1',
    route: '澳门→台北',
    departure: '09:00',
    arrival: '19:00',
    date: '2026-04-20',
    crew1: '',
    crew2: '',
    standby: ''
  });

  const flightData = [
    {
      id: 1,
      flightNo: 'CGO01',
      aircraft: 'AC1',
      route: '澳门→台北',
      departure: '09:00',
      arrival: '19:00',
      duration: '10h',
      crew: 'C1+FO1',
      standby: 'FO5',
      status: '已排班',
      statusColor: 'success'
    },
    {
      id: 2,
      flightNo: 'CGO02',
      aircraft: 'AC1',
      route: '台北→澳门',
      departure: '21:00',
      arrival: '07:00',
      duration: '10h',
      crew: 'C3+FO3',
      standby: '-',
      status: '已排班',
      statusColor: 'success'
    },
    {
      id: 3,
      flightNo: 'CGO03',
      aircraft: 'AC1',
      route: '澳门→台北',
      departure: '09:00',
      arrival: '19:00',
      duration: '10h',
      crew: 'C1+FO1',
      standby: '-',
      status: '已排班',
      statusColor: 'success'
    },
    {
      id: 4,
      flightNo: 'CGO04',
      aircraft: 'AC2',
      route: '澳门→首尔',
      departure: '09:00',
      arrival: '19:00',
      duration: '10h',
      crew: 'C2+FO2',
      standby: 'FO6',
      status: '已排班',
      statusColor: 'success'
    },
    {
      id: 5,
      flightNo: 'CGO05',
      aircraft: 'AC2',
      route: '首尔→澳门',
      departure: '21:00',
      arrival: '07:00',
      duration: '10h',
      crew: '-',
      standby: '-',
      status: '计划中',
      statusColor: 'muted'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">航班管理</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.alert('导出功能')}>
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
            新增航班
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex gap-2">
            <Input
              type="date"
              defaultValue="2026-04-14"
              className="w-40"
            />
            <span className="flex items-center">~</span>
            <Input
              type="date"
              defaultValue="2026-04-20"
              className="w-40"
            />
          </div>
          <select className="px-3 py-2 rounded-lg border border-border bg-background">
            <option>全部机号</option>
            <option>AC1</option>
            <option>AC2</option>
          </select>
          <select className="px-3 py-2 rounded-lg border border-border bg-background">
            <option>全部状态</option>
            <option>计划中</option>
            <option>已排班</option>
            <option>已完成</option>
            <option>取消</option>
          </select>
          <select className="px-3 py-2 rounded-lg border border-border bg-background">
            <option>全部航线</option>
            <option>澳门→台北</option>
            <option>台北→澳门</option>
            <option>澳门→首尔</option>
            <option>首尔→澳门</option>
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
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">航班号</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">机号</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">航线</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">起飞</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">降落</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">时长</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">执飞机组</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">替补</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">状态</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {flightData.map((flight, idx) => (
                <tr key={flight.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                  <td className="py-3 px-4">
                    <input type="checkbox" className="w-4 h-4 rounded border-border" />
                  </td>
                  <td className="py-3 px-4 text-sm">{idx + 1}</td>
                  <td className="py-3 px-4 font-medium">{flight.flightNo}</td>
                  <td className="py-3 px-4 text-sm">{flight.aircraft}</td>
                  <td className="py-3 px-4">{flight.route}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{flight.departure}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{flight.arrival}</td>
                  <td className="py-3 px-4 text-sm">{flight.duration}</td>
                  <td className="py-3 px-4 text-sm">{flight.crew}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{flight.standby}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      flight.statusColor === 'success'
                        ? 'bg-success/10 text-success'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {flight.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        className="p-1 hover:bg-accent rounded"
                        onClick={() => {
                          setSelectedFlight(flight);
                          setShowViewDialog(true);
                        }}
                      >
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        className="p-1 hover:bg-accent rounded"
                        onClick={() => {
                          setSelectedFlight(flight);
                          setFlightForm({
                            flightNo: flight.flightNo,
                            aircraft: flight.aircraft,
                            route: flight.route,
                            departure: flight.departure,
                            arrival: flight.arrival,
                            date: '2026-04-20',
                            crew1: flight.crew.split('+')[0] || '',
                            crew2: flight.crew.split('+')[1] || '',
                            standby: flight.standby
                          });
                          setShowEditDialog(true);
                        }}
                      >
                        <Edit className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button className="p-1 hover:bg-accent rounded" onClick={() => window.confirm('确认删除该航班？') && window.alert('删除成功')}>
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
            共 20 条记录
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.alert('已是第一页')}>上一页</Button>
            <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">1</Button>
            <Button variant="outline" size="sm" onClick={() => window.alert('切换到第2页')}>2</Button>
            <Button variant="outline" size="sm" onClick={() => window.alert('切换到下一页')}>下一页</Button>
          </div>
        </div>
      </Card>

      {/* 新增航班对话框 */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowAddDialog(false)}></div>
          <div className="relative bg-card rounded-lg shadow-lg max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">新增航班</h2>
              <button onClick={() => setShowAddDialog(false)} className="p-1 hover:bg-accent rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">航班号 <span className="text-destructive">*</span></label>
                  <Input
                    value={flightForm.flightNo}
                    onChange={(e) => setFlightForm({ ...flightForm, flightNo: e.target.value })}
                    placeholder="例如: CGO01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">机号 <span className="text-destructive">*</span></label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    value={flightForm.aircraft}
                    onChange={(e) => setFlightForm({ ...flightForm, aircraft: e.target.value })}
                  >
                    <option>AC1</option>
                    <option>AC2</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">航线 <span className="text-destructive">*</span></label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    value={flightForm.route}
                    onChange={(e) => setFlightForm({ ...flightForm, route: e.target.value })}
                  >
                    <option>澳门→台北</option>
                    <option>台北→澳门</option>
                    <option>澳门→首尔</option>
                    <option>首尔→澳门</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">起飞时间</label>
                  <Input
                    type="time"
                    value={flightForm.departure}
                    onChange={(e) => setFlightForm({ ...flightForm, departure: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">降落时间</label>
                  <Input
                    type="time"
                    value={flightForm.arrival}
                    onChange={(e) => setFlightForm({ ...flightForm, arrival: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">飞行日期</label>
                  <Input
                    type="date"
                    value={flightForm.date}
                    onChange={(e) => setFlightForm({ ...flightForm, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">机长</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    value={flightForm.crew1}
                    onChange={(e) => setFlightForm({ ...flightForm, crew1: e.target.value })}
                  >
                    <option value="">请选择机长</option>
                    <option>C1</option>
                    <option>C2</option>
                    <option>C3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">副驾驶</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    value={flightForm.crew2}
                    onChange={(e) => setFlightForm({ ...flightForm, crew2: e.target.value })}
                  >
                    <option value="">请选择副驾驶</option>
                    <option>FO1</option>
                    <option>FO2</option>
                    <option>FO3</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">替补机组</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    value={flightForm.standby}
                    onChange={(e) => setFlightForm({ ...flightForm, standby: e.target.value })}
                  >
                    <option value="">无</option>
                    <option>FO5</option>
                    <option>FO6</option>
                  </select>
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

      {/* 查看航班详情对话框 */}
      {showViewDialog && selectedFlight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowViewDialog(false)}></div>
          <div className="relative bg-card rounded-lg shadow-lg max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">航班详情</h2>
              <button onClick={() => setShowViewDialog(false)} className="p-1 hover:bg-accent rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">航班号</p>
                  <p className="text-lg font-medium">{selectedFlight.flightNo}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">机号</p>
                  <p className="text-lg font-medium">{selectedFlight.aircraft}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground mb-1">航线</p>
                  <p className="text-lg font-medium">{selectedFlight.route}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">起飞时间</p>
                  <p className="text-lg font-medium">{selectedFlight.departure}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">降落时间</p>
                  <p className="text-lg font-medium">{selectedFlight.arrival}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">飞行时长</p>
                  <p className="text-lg font-medium">{selectedFlight.duration}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">执飞机组</p>
                  <p className="text-lg font-medium">{selectedFlight.crew}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">替补机组</p>
                  <p className="text-lg font-medium">{selectedFlight.standby}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">状态</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedFlight.statusColor === 'success'
                      ? 'bg-success/10 text-success'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {selectedFlight.status}
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

      {/* 编辑航班对话框 */}
      {showEditDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowEditDialog(false)}></div>
          <div className="relative bg-card rounded-lg shadow-lg max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">编辑航班</h2>
              <button onClick={() => setShowEditDialog(false)} className="p-1 hover:bg-accent rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">航班号</label>
                  <Input value={flightForm.flightNo} disabled className="bg-muted" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">机号</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    value={flightForm.aircraft}
                    onChange={(e) => setFlightForm({ ...flightForm, aircraft: e.target.value })}
                  >
                    <option>AC1</option>
                    <option>AC2</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">航线</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    value={flightForm.route}
                    onChange={(e) => setFlightForm({ ...flightForm, route: e.target.value })}
                  >
                    <option>澳门→台北</option>
                    <option>台北→澳门</option>
                    <option>澳门→首尔</option>
                    <option>首尔→澳门</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">起飞时间</label>
                  <Input
                    type="time"
                    value={flightForm.departure}
                    onChange={(e) => setFlightForm({ ...flightForm, departure: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">降落时间</label>
                  <Input
                    type="time"
                    value={flightForm.arrival}
                    onChange={(e) => setFlightForm({ ...flightForm, arrival: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">机长</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    value={flightForm.crew1}
                    onChange={(e) => setFlightForm({ ...flightForm, crew1: e.target.value })}
                  >
                    <option value="">请选择机长</option>
                    <option>C1</option>
                    <option>C2</option>
                    <option>C3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">副驾驶</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    value={flightForm.crew2}
                    onChange={(e) => setFlightForm({ ...flightForm, crew2: e.target.value })}
                  >
                    <option value="">请选择副驾驶</option>
                    <option>FO1</option>
                    <option>FO2</option>
                    <option>FO3</option>
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
