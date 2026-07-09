import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Spin, Space, ColorPicker, Row, Col } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import { getFrontSettings, updateFrontSettings } from '../../api';

const PRESETS = [
  { label: '经典蓝', color: '#3461ff' }, { label: '科技蓝', color: '#1677ff' },
  { label: '翡翠青', color: '#10b981' }, { label: '活力橙', color: '#f97316' },
  { label: '玫红', color: '#ef4444' }, { label: '雅紫', color: '#8b5cf6' },
  { label: '深蓝', color: '#1e40af' }, { label: '墨绿', color: '#059669' },
];

function ColorSwatch({ current, onChange, size = 28 }) {
  return (
    <Space wrap size={6}>
      {PRESETS.map(p => (
        <div key={p.color}
          onClick={() => onChange(p.color)}
          style={{
            width: size, height: size, borderRadius: 6,
            background: p.color, cursor: 'pointer',
            border: current === p.color ? `2px solid #1f2937` : '2px solid transparent',
            transition: 'border 0.15s',
          }}
          title={p.label}
        />
      ))}
      <ColorPicker value={current} onChange={c => onChange(c.toHexString())} />
    </Space>
  );
}

export default function StyleSettings() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [layoutMode, setLayoutMode] = useState('standard');

  useEffect(() => {
    getFrontSettings().then(data => {
      form.setFieldsValue({
        front_primary_color: data.front_primary_color || '#3461ff',
        front_page_bg: data.front_page_bg || '#f5f7fa',
        });

        setLayoutMode(data.front_layout_mode || 'standard');
      })
    .catch(() => {}).finally(() => setLoading(false));
  }, [form]);

  const onFinish = async (values) => {
    setSaving(true);
    try {
      await updateFrontSettings({
        front_primary_color: values.front_primary_color,
        front_page_bg: values.front_page_bg,
      });
      message.success('保存成功，刷新前台查看效果');
    } catch { message.error('保存失败'); }
    finally { setSaving(false); }
  };

 const prim = Form.useWatch('front_primary_color', form) || '#3461ff';
 const pageBg = Form.useWatch('front_page_bg', form) || '#f5f7fa';

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div>
      <div className="page-title-bar"><h2>风格设置</h2><p>配置前台页面的颜色、样式与布局</p></div>
      <Row gutter={24}>
        {/* Left: Settings Form */}
        <Col xs={24} lg={15}>
          <Form form={form} layout="vertical" onFinish={onFinish}>
            {/* Card 1: Color Scheme */}
            <Card title="颜色方案" size="small"
              styles={{ header: { fontWeight: 600, fontSize: 14 } }}
              style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="front_primary_color" label="主题色">
                    <ColorSwatch current={form.getFieldValue('front_primary_color')}
                      onChange={v => form.setFieldsValue({ front_primary_color: v })} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="front_page_bg" label="页面背景色">
                    <Space>
                      <ColorPicker value={form.getFieldValue('front_page_bg')}
                        onChange={c => form.setFieldsValue({ front_page_bg: c.toHexString() })} />
                      <Input style={{ width: 80 }} placeholder="#f5f7fa" />
                    </Space>
                  </Form.Item>
                </Col>
             </Row>
              <Form.Item style={{ marginTop: 8 }}>
                <Button type="primary" htmlType="submit" loading={saving}
                  style={{ minWidth: 160, height: 40, fontSize: 15 }}>
                  保存设置
                </Button>
              </Form.Item>
            </Card>

            {/* Card 2: Layout Settings */}
             <Card title="布局设置" size="small"
               styles={{ header: { fontWeight: 600, fontSize: 14 } }}
               style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>选择布局模式，点击即生效</div>
               <Row gutter={16}>
                 <Col span={12}>
                   <div
                      onClick={async () => { setLayoutMode('standard'); try { await updateFrontSettings({ front_layout_mode: 'standard' }); message.success('布局已切换'); } catch { message.error('保存失败'); } }}
                     style={{
                        border: (layoutMode || 'standard') === 'standard'
                          ? `2px solid #1677ff` : '2px solid #e5e7eb',
                        borderRadius: 10, padding: 14, cursor: 'pointer',
                        background: (layoutMode || 'standard') === 'standard'
                          ? '#f0f5ff' : '#fff',
                        transition: 'all 0.2s', position: 'relative',
                      }}
                    >
                      {(layoutMode || 'standard') === 'standard' && (
                        <CheckCircleFilled style={{ position: 'absolute', top: 6, right: 6, color: '#1677ff', fontSize: 16 }} />
                      )}
                      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                        <div style={{ flex: 1, height: 20, background: '#1677ff', borderRadius: 3 }} />
                        <div style={{ flex: 1, height: 20, background: '#e5e7eb', borderRadius: 3 }} />
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>紧凑双栏</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>字段两栏并排，信息密度高</div>
                    </div>
                  </Col>
                  <Col span={12}>
                   <div
                      onClick={async () => { setLayoutMode('stepper'); try { await updateFrontSettings({ front_layout_mode: 'stepper' }); message.success('布局已切换'); } catch { message.error('保存失败'); } }}
                     style={{
                        border: layoutMode === 'stepper'
                          ? `2px solid #1677ff` : '2px solid #e5e7eb',
                        borderRadius: 10, padding: 14, cursor: 'pointer',
                        background: layoutMode === 'stepper'
                          ? '#f0f5ff' : '#fff',
                        transition: 'all 0.2s', position: 'relative',
                      }}
                    >
                      {layoutMode === 'stepper' && (
                        <CheckCircleFilled style={{ position: 'absolute', top: 6, right: 6, color: '#1677ff', fontSize: 16 }} />
                      )}
                      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#1677ff', fontSize: 10, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</div>
                        <div style={{ width: 16, height: 2, background: '#1677ff', marginTop: 7 }} />
                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#e5e7eb', fontSize: 10, color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</div>
                        <div style={{ width: 16, height: 2, background: '#e5e7eb', marginTop: 7 }} />
                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#e5e7eb', fontSize: 10, color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</div>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>分步式</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>一步一填，引导填表流程</div>
                    </div>
                  </Col>
               </Row>
             </Card>
          </Form>
        </Col>

        {/* Right: Live Preview */}
        <Col xs={24} lg={9}>
          <Card title="预览" size="small" styles={{ header: { fontWeight: 600, fontSize: 14 } }}>
            <div style={{
              background: pageBg, borderRadius: 8, overflow: 'hidden',
              border: '1px solid #e5e7eb', fontSize: 12,
            }}>
              <div style={{
                background: prim, padding: '8px 12px', display: 'flex',
                alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid #e5e7eb',
              }}>
                <div style={{ fontWeight: 600, color: '#fff', fontSize: 13 }}>样品申请系统</div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>查询申请</div>
              </div>
              <div style={{ padding: 12 }}>
                <div style={{
                  background: '#ffffff', borderRadius: 6,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  padding: 12, marginBottom: 8,
                }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, marginBottom: 8,
                    paddingLeft: 8, borderLeft: `3px solid ${prim}`,
                    color: '#374151',
                  }}>基本信息</div>
                  <div style={{ color: '#9ca3af', fontSize: 11, marginBottom: 6 }}>
                    申请标题：XX项目样件申请
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{
                      background: prim, color: '#fff', borderRadius: 4,
                      padding: '3px 12px', fontSize: 11, fontWeight: 500,
                      flex: 1, textAlign: 'center',
                    }}>提交申请</div>
                    <div style={{
                      border: '1px solid #d1d5db', borderRadius: 4,
                      padding: '3px 12px', color: '#374151',
                      fontSize: 11, textAlign: 'center',
                    }}>重置</div>
                  </div>
                </div>
                <div style={{ color: '#9ca3af', fontSize: 10, textAlign: 'center' }}>
                  {'浅色导航 · 卡面阴影 · 主题色 ' + prim}
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
