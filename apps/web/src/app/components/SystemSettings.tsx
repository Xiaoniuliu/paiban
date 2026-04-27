import React, { useState, useEffect } from 'react';
import { Save, Plus, Edit, Trash2, Key, Shield, X } from 'lucide-react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface SystemSettingsProps {
  activeView: string;
}

export default function SystemSettings({ activeView }: SystemSettingsProps) {
  const getInitialTab = (view: string) => {
    if (view === 'settings-account') return 'account';
    if (view === 'settings-rules') return 'rules';
    return 'basic';
  };

  const [activeTab, setActiveTab] = useState(() => getInitialTab(activeView));
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [userDialogMode, setUserDialogMode] = useState<'add' | 'edit'>('add');

  useEffect(() => {
    setActiveTab(getInitialTab(activeView));
  }, [activeView]);

  const users = [
    { id: 1, username: 'admin', name: '管理员', phone: '13800138000', role: '管理员', status: '正常', createTime: '2026-01-01' },
    { id: 2, username: 'roster1', name: '张三', phone: '13900139000', role: '排班员', status: '正常', createTime: '2026-01-15' },
    { id: 3, username: 'crew01', name: '李四', phone: '13700137000', role: '机组', status: '正常', createTime: '2026-02-01' }
  ];

  const roles = [
    { id: 1, name: '管理员', code: 'admin', desc: '全部权限', userCount: 1 },
    { id: 2, name: '排班员', code: 'roster', desc: '排班相关权限', userCount: 2 },
    { id: 3, name: '机组人员', code: 'crew', desc: '个人数据权限', userCount: 8 },
    { id: 4, name: '签派员', code: 'oc', desc: '航班数据权限', userCount: 2 },
    { id: 5, name: '监控员', code: 'monitor', desc: '只读权限', userCount: 1 }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">系统设置</h1>
      </div>

      {/* 标签页 */}
      <div className="flex gap-2 border-b border-border">
        {[
          { id: 'basic', label: '基础配置' },
          { id: 'account', label: '账号管理' },
          { id: 'rules', label: '规则配置' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 基础配置 */}
      {activeTab === 'basic' && (
        <div className="space-y-6">
          {/* 基础信息 */}
          <Card className="p-6">
            <h3 className="font-semibold mb-6">基础信息配置</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">公司名称 *</label>
              <Input defaultValue="全球通货运" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">运行类型 *</label>
              <Input defaultValue="货运航班" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">时区 *</label>
              <select className="w-full px-3 py-2 rounded-lg border border-border bg-background">
                <option>UTC+8</option>
                <option>UTC+9</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">基地机场 *</label>
              <Input defaultValue="澳门" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">机型 *</label>
              <Input defaultValue="全货机" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">运行周期</label>
              <select className="w-full px-3 py-2 rounded-lg border border-border bg-background">
                <option>周</option>
                <option>月</option>
              </select>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <h4 className="font-medium">功能开关</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="autoSchedule" defaultChecked className="w-4 h-4 rounded border-border" />
                <label htmlFor="autoSchedule" className="text-sm">自动排班</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="autoCompliance" defaultChecked className="w-4 h-4 rounded border-border" />
                <label htmlFor="autoCompliance" className="text-sm">自动合规校验</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="qualificationCheck" defaultChecked className="w-4 h-4 rounded border-border" />
                <label htmlFor="qualificationCheck" className="text-sm">资质校验</label>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={() => window.alert('配置已保存')}>
              <Save className="w-4 h-4 mr-2" />
              保存配置
            </Button>
          </div>
        </Card>

          {/* 机组编制 */}
          <Card className="p-6">
            <h3 className="font-semibold mb-6">机组编制配置</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">机长编制人数 *</label>
              <Input type="number" defaultValue="4" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">副驾编制人数 *</label>
              <Input type="number" defaultValue="7" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">默认机组搭配</label>
              <Input defaultValue="1机长+1副驾" disabled />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">替补响应时间</label>
              <select className="w-full px-3 py-2 rounded-lg border border-border bg-background">
                <option>15分钟</option>
                <option>30分钟</option>
                <option>60分钟</option>
              </select>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <h4 className="font-medium">排班设置</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="allowSwap" defaultChecked className="w-4 h-4 rounded border-border" />
                <label htmlFor="allowSwap" className="text-sm">允许机组交换</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="allowTemp" defaultChecked className="w-4 h-4 rounded border-border" />
                <label htmlFor="allowTemp" className="text-sm">允许临时替补</label>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={() => window.alert('配置已保存')}>
              <Save className="w-4 h-4 mr-2" />
              保存配置
            </Button>
          </div>
          </Card>
        </div>
      )}

      {/* 规则配置 */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          {/* 航班规则 */}
          <Card className="p-6">
            <h3 className="font-semibold mb-6">航班运行规则配置</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">每日最多航班</label>
              <Input defaultValue="2架×2班/天" disabled />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">航班最短衔接时间（分钟）*</label>
              <Input type="number" defaultValue="90" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">默认FDP执勤上限（小时）*</label>
              <Input type="number" defaultValue="14" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">夜间航班FDP上限（小时）</label>
              <Input type="number" defaultValue="11" />
              <p className="text-xs text-muted-foreground mt-1">22:00-06:59</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="autoTimezone" defaultChecked className="w-4 h-4 rounded border-border" />
              <label htmlFor="autoTimezone" className="text-sm">跨时区航班自动识别（时差≥6小时）</label>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={() => window.alert('配置已保存')}>
              <Save className="w-4 h-4 mr-2" />
              保存配置
            </Button>
          </div>
          </Card>

          {/* 资质规则 */}
          <Card className="p-6">
            <h3 className="font-semibold mb-6">资质合规规则</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">机长必备资质</label>
              <Input defaultValue="有效执照+体检+签注" disabled />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">副驾必备资质</label>
              <Input defaultValue="有效执照+体检+签注" disabled />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <h4 className="font-medium">预警设置</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="blockNoQual" defaultChecked className="w-4 h-4 rounded border-border" />
                <label htmlFor="blockNoQual" className="text-sm">无资质禁止排班</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="licenseAlert" defaultChecked className="w-4 h-4 rounded border-border" />
                <label htmlFor="licenseAlert" className="text-sm">执照过期提醒</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="medicalAlert" defaultChecked className="w-4 h-4 rounded border-border" />
                <label htmlFor="medicalAlert" className="text-sm">体检过期提醒</label>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={() => window.alert('配置已保存')}>
              <Save className="w-4 h-4 mr-2" />
              保存配置
            </Button>
          </div>
          </Card>
        </div>
      )}

      {/* 账号管理 */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          {/* 用户管理 */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">用户列表</h3>
              <Button size="sm" onClick={() => { setUserDialogMode('add'); setSelectedUser(null); setShowUserDialog(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                新增用户
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">序号</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">用户名</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">姓名</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">手机号</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">角色</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">状态</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">创建时间</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, idx) => (
                    <tr key={user.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                      <td className="py-3 px-4 text-sm">{idx + 1}</td>
                      <td className="py-3 px-4 font-medium">{user.username}</td>
                      <td className="py-3 px-4">{user.name}</td>
                      <td className="py-3 px-4 text-sm">{user.phone}</td>
                      <td className="py-3 px-4 text-sm">{user.role}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                          {user.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{user.createTime}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button className="p-1 hover:bg-accent rounded" onClick={() => { setUserDialogMode('edit'); setSelectedUser(user); setShowUserDialog(true); }}>
                            <Edit className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button className="p-1 hover:bg-accent rounded" onClick={() => { setSelectedUser(user); setShowPasswordDialog(true); }}>
                            <Key className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button className="p-1 hover:bg-accent rounded" onClick={() => window.confirm('确认删除该用户？') && window.alert('删除成功')}>
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

          {/* 角色管理 */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">角色管理</h3>
              <Button size="sm" onClick={() => { setSelectedRole(null); setShowRoleDialog(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                新增角色
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">序号</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">角色名称</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">角色标识</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">备注</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">用户数</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role, idx) => (
                    <tr key={role.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                      <td className="py-3 px-4 text-sm">{idx + 1}</td>
                      <td className="py-3 px-4 font-medium">{role.name}</td>
                      <td className="py-3 px-4 text-sm">{role.code}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{role.desc}</td>
                      <td className="py-3 px-4 text-sm">{role.userCount}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button className="p-1 hover:bg-accent rounded" onClick={() => { setSelectedRole(role); setShowPermissionDialog(true); }}>
                            <Shield className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button className="p-1 hover:bg-accent rounded" onClick={() => { setSelectedRole(role); setShowRoleDialog(true); }}>
                            <Edit className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button className="p-1 hover:bg-accent rounded" onClick={() => window.confirm('确认删除该角色？') && window.alert('删除成功')}>
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
        </div>
      )}

      {/* 新增/编辑用户对话框 */}
      {showUserDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowUserDialog(false)}></div>
          <div className="relative bg-card rounded-lg shadow-lg max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">{userDialogMode === 'add' ? '新增用户' : '编辑用户'}</h2>
              <button onClick={() => setShowUserDialog(false)} className="p-1 hover:bg-accent rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">用户名 *</label>
                  <Input defaultValue={selectedUser?.username || ''} placeholder="请输入用户名" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">姓名 *</label>
                  <Input defaultValue={selectedUser?.name || ''} placeholder="请输入姓名" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">手机号 *</label>
                  <Input defaultValue={selectedUser?.phone || ''} placeholder="请输入手机号" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">角色 *</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-border bg-background" defaultValue={selectedUser?.role || ''}>
                    <option value="">请选择角色</option>
                    <option value="管理员">管理员</option>
                    <option value="排班员">排班员</option>
                    <option value="机组">机组人员</option>
                    <option value="签派员">签派员</option>
                    <option value="监控员">监控员</option>
                  </select>
                </div>
                {userDialogMode === 'add' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">密码 *</label>
                      <Input type="password" placeholder="请输入密码" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">确认密码 *</label>
                      <Input type="password" placeholder="请再次输入密码" />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium mb-2">状态</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-border bg-background" defaultValue={selectedUser?.status || '正常'}>
                    <option value="正常">正常</option>
                    <option value="停用">停用</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-2 p-6 border-t border-border">
              <Button className="flex-1" onClick={() => { window.alert(userDialogMode === 'add' ? '新增成功' : '保存成功'); setShowUserDialog(false); }}>{userDialogMode === 'add' ? '新增' : '保存'}</Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowUserDialog(false)}>取消</Button>
            </div>
          </div>
        </div>
      )}

      {/* 重置密码对话框 */}
      {showPasswordDialog && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowPasswordDialog(false)}></div>
          <div className="relative bg-card rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">重置密码</h2>
              <button onClick={() => setShowPasswordDialog(false)} className="p-1 hover:bg-accent rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-accent/30 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">用户信息</p>
                <p className="font-medium mt-1">{selectedUser.name} ({selectedUser.username})</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">新密码 *</label>
                <Input type="password" placeholder="请输入新密码" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">确认密码 *</label>
                <Input type="password" placeholder="请再次输入新密码" />
              </div>
            </div>
            <div className="flex gap-2 p-6 border-t border-border">
              <Button className="flex-1" onClick={() => { window.alert('密码重置成功'); setShowPasswordDialog(false); }}>确认重置</Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowPasswordDialog(false)}>取消</Button>
            </div>
          </div>
        </div>
      )}

      {/* 新增/编辑角色对话框 */}
      {showRoleDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowRoleDialog(false)}></div>
          <div className="relative bg-card rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">{selectedRole ? '编辑角色' : '新增角色'}</h2>
              <button onClick={() => setShowRoleDialog(false)} className="p-1 hover:bg-accent rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">角色名称 *</label>
                <Input defaultValue={selectedRole?.name || ''} placeholder="请输入角色名称" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">角色标识 *</label>
                <Input defaultValue={selectedRole?.code || ''} placeholder="请输入角色标识（英文）" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">备注</label>
                <Input defaultValue={selectedRole?.desc || ''} placeholder="请输入角色说明" />
              </div>
            </div>
            <div className="flex gap-2 p-6 border-t border-border">
              <Button className="flex-1">{selectedRole ? '保存' : '新增'}</Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowRoleDialog(false)}>取消</Button>
            </div>
          </div>
        </div>
      )}

      {/* 权限配置对话框 */}
      {showPermissionDialog && selectedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowPermissionDialog(false)}></div>
          <div className="relative bg-card rounded-lg shadow-lg max-w-3xl w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">权限配置 - {selectedRole.name}</h2>
              <button onClick={() => setShowPermissionDialog(false)} className="p-1 hover:bg-accent rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto">
              {/* 仪表盘权限 */}
              <div>
                <h3 className="font-medium mb-3">仪表盘</h3>
                <div className="space-y-2 pl-4">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="perm-dashboard-view" defaultChecked className="w-4 h-4 rounded border-border" />
                    <label htmlFor="perm-dashboard-view" className="text-sm">查看仪表盘</label>
                  </div>
                </div>
              </div>

              {/* 机组管理权限 */}
              <div>
                <h3 className="font-medium mb-3">机组管理</h3>
                <div className="space-y-2 pl-4">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="perm-crew-view" defaultChecked className="w-4 h-4 rounded border-border" />
                    <label htmlFor="perm-crew-view" className="text-sm">查看机组信息</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="perm-crew-add" defaultChecked={selectedRole.code === 'admin'} className="w-4 h-4 rounded border-border" />
                    <label htmlFor="perm-crew-add" className="text-sm">新增机组</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="perm-crew-edit" defaultChecked={selectedRole.code === 'admin'} className="w-4 h-4 rounded border-border" />
                    <label htmlFor="perm-crew-edit" className="text-sm">编辑机组</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="perm-crew-delete" defaultChecked={selectedRole.code === 'admin'} className="w-4 h-4 rounded border-border" />
                    <label htmlFor="perm-crew-delete" className="text-sm">删除机组</label>
                  </div>
                </div>
              </div>

              {/* 航班管理权限 */}
              <div>
                <h3 className="font-medium mb-3">航班管理</h3>
                <div className="space-y-2 pl-4">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="perm-flight-view" defaultChecked className="w-4 h-4 rounded border-border" />
                    <label htmlFor="perm-flight-view" className="text-sm">查看航班</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="perm-flight-add" defaultChecked={selectedRole.code === 'admin' || selectedRole.code === 'oc'} className="w-4 h-4 rounded border-border" />
                    <label htmlFor="perm-flight-add" className="text-sm">新增航班</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="perm-flight-edit" defaultChecked={selectedRole.code === 'admin' || selectedRole.code === 'oc'} className="w-4 h-4 rounded border-border" />
                    <label htmlFor="perm-flight-edit" className="text-sm">编辑航班</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="perm-flight-delete" defaultChecked={selectedRole.code === 'admin'} className="w-4 h-4 rounded border-border" />
                    <label htmlFor="perm-flight-delete" className="text-sm">删除航班</label>
                  </div>
                </div>
              </div>

              {/* 排班管理权限 */}
              <div>
                <h3 className="font-medium mb-3">排班管理</h3>
                <div className="space-y-2 pl-4">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="perm-schedule-view" defaultChecked className="w-4 h-4 rounded border-border" />
                    <label htmlFor="perm-schedule-view" className="text-sm">查看排班</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="perm-schedule-edit" defaultChecked={selectedRole.code === 'admin' || selectedRole.code === 'roster'} className="w-4 h-4 rounded border-border" />
                    <label htmlFor="perm-schedule-edit" className="text-sm">编辑排班</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="perm-schedule-auto" defaultChecked={selectedRole.code === 'admin' || selectedRole.code === 'roster'} className="w-4 h-4 rounded border-border" />
                    <label htmlFor="perm-schedule-auto" className="text-sm">一键智能排班</label>
                  </div>
                </div>
              </div>

              {/* 合规校验权限 */}
              <div>
                <h3 className="font-medium mb-3">合规校验</h3>
                <div className="space-y-2 pl-4">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="perm-compliance-view" defaultChecked className="w-4 h-4 rounded border-border" />
                    <label htmlFor="perm-compliance-view" className="text-sm">查看合规报告</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="perm-compliance-check" defaultChecked={selectedRole.code === 'admin' || selectedRole.code === 'roster'} className="w-4 h-4 rounded border-border" />
                    <label htmlFor="perm-compliance-check" className="text-sm">执行合规校验</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="perm-compliance-fix" defaultChecked={selectedRole.code === 'admin' || selectedRole.code === 'roster'} className="w-4 h-4 rounded border-border" />
                    <label htmlFor="perm-compliance-fix" className="text-sm">应用修复方案</label>
                  </div>
                </div>
              </div>

              {/* 报表中心权限 */}
              <div>
                <h3 className="font-medium mb-3">报表中心</h3>
                <div className="space-y-2 pl-4">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="perm-report-view" defaultChecked className="w-4 h-4 rounded border-border" />
                    <label htmlFor="perm-report-view" className="text-sm">查看报表</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="perm-report-export" defaultChecked className="w-4 h-4 rounded border-border" />
                    <label htmlFor="perm-report-export" className="text-sm">导出报表</label>
                  </div>
                </div>
              </div>

              {/* 系统设置权限 */}
              <div>
                <h3 className="font-medium mb-3">系统设置</h3>
                <div className="space-y-2 pl-4">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="perm-settings-view" defaultChecked={selectedRole.code === 'admin'} className="w-4 h-4 rounded border-border" />
                    <label htmlFor="perm-settings-view" className="text-sm">查看系统设置</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="perm-settings-edit" defaultChecked={selectedRole.code === 'admin'} className="w-4 h-4 rounded border-border" />
                    <label htmlFor="perm-settings-edit" className="text-sm">修改系统设置</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="perm-account-manage" defaultChecked={selectedRole.code === 'admin'} className="w-4 h-4 rounded border-border" />
                    <label htmlFor="perm-account-manage" className="text-sm">账号管理</label>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 p-6 border-t border-border">
              <Button className="flex-1">保存权限配置</Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowPermissionDialog(false)}>取消</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
