import React, { useState, useEffect } from 'react';
import { Table, Card, Select, Input, Button, Space, Tag, Modal, message, Descriptions, DatePicker, Radio, Typography } from 'antd';
import { SearchOutlined, DownloadOutlined, ReloadOutlined, EyeOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { getSamples, getSample, updateSampleStatus, exportSamples } from '../api';
import { StatusTag } from '../components/StatusTag';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { TextArea } = Input;
const CARRIERS = ['顺丰速运','圆通速递','中通快递','韵达速递','京东物流','德邦物流','DHL','EMS','其他'];
const { Text } = Typography;

 // Status flow: 待审批 → 已批准/已驳回 → 制作中/已发货 → 已完成
 const STATUS_TRANSITIONS = {
   '待审批': ['已批准', '已驳回'],
   '已批准': ['制作中', '已发货'],
   '制作中': ['已发货'],
   '已发货': ['已完成'],
   '已驳回': [],
   '已完成': [],
   '已签收': [],
 };
 
 const ALL_STATUSES = ['待审批', '已批准', '已驳回', '制作中', '已发货', '已完成'];

export default function SampleLedger() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState(undefined);
  const [search, setSearch] = useState('');
  const [applicantCompany, setApplicantCompany] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [detailModal, setDetailModal] = useState({ open: false, data: null });
  const [statusModal, setStatusModal] = useState({ open: false, sample: null });
 const [targetStatus, setTargetStatus] = useState('');
 const [remark, setRemark] = useState('');
  const [trackingNo, setTrackingNo] = useState('');
  const [trackingCarrier, setTrackingCarrier] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const params = { page, pageSize: 20 };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      if (applicantCompany) params.applicant_company = applicantCompany;
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.date_from = dateRange[0].format('YYYY-MM-DD');
        params.date_to = dateRange[1].format('YYYY-MM-DD');
      }
      const res = await getSamples(params);
      setData(res.list);
      setTotal(res.total);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [page, statusFilter, search, applicantCompany, dateRange]);

  const showDetail = async (id) => {
    try {
      const d = await getSample(id);
      setDetailModal({ open: true, data: d });
    } catch { message.error('加载失败'); }
  };

 const openStatusModal = (sample, defaultTarget) => {
   setTargetStatus(defaultTarget || '');
   setRemark('');
    setTrackingNo('');
    setTrackingCarrier('');
   setStatusModal({ open: true, sample });
 };

 const handleStatusChange = async () => {
   if (!targetStatus) { message.warning('请选择目标状态'); return; }
    if (targetStatus === '已发货' && !trackingNo.trim()) { message.warning('请输入物流单号'); return; }
   try {
      const extra = targetStatus === '已发货' ? { tracking_no: trackingNo, carrier: trackingCarrier } : {};
      await updateSampleStatus(statusModal.sample.id, targetStatus, remark, extra);
      message.success('状态已更新');
      setStatusModal({ open: false, sample: null, targetStatus: '' });
      setRemark('');
      setTrackingNo('');
      setTrackingCarrier('');
      loadData();
    } catch (err) { message.error(err.response?.data?.error || '操作失败'); }
  };

  const handleExport = async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const res = await exportSamples(params);
      const blob = new Blob([res], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `样品申请_${dayjs().format('YYYYMMDD')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch { message.error('导出失败'); }
  };

  const columns = [
    { title: '编号', dataIndex: 'request_no', width: 160, render: t => <span style={{fontFamily:'monospace', fontSize:13}}>{t}</span> },
    { title: '名称', dataIndex: 'title', ellipsis: true, width: 140, render: (t, r) => <a onClick={() => showDetail(r.id)}>{t}</a> },
    { title: '申请人', dataIndex: 'applicant_name', width: 75 },
    { title: '公司', dataIndex: 'applicant_company', width: 90, ellipsis: true, render: v => v || '-' },
    { title: '联系', dataIndex: 'applicant_phone', width: 105, render: v => v || '-' },
    { title: '产品数', dataIndex: 'item_count', width: 55, align: 'center', render: v => <Tag color="orange" style={{fontSize:11}}>{v || 1}</Tag> },
    { title: '状态', dataIndex: 'status', width: 68, render: s => <StatusTag status={s} /> },
    { title: '提交时间', dataIndex: 'created_at', width: 130, render: v => v ? dayjs(v).format('MM-DD HH:mm') : '-' },
    { title: '期望日', dataIndex: 'expected_date', width: 88, render: v => v || '-' },
    { title: '操作', width: 80,
      render: (_, r) => {
        const transitions = STATUS_TRANSITIONS[r.status];
        if (!transitions || transitions.length === 0) return <Text type="secondary">—</Text>;
        return <Button type="link" size="small" onClick={() => openStatusModal(r, '')}>操作</Button>;
      }
    },
  ];

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div className="page-title-bar"><h2>样品申请</h2><p>查看和管理所有客户提交的样品申请</p></div>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>导出CSV</Button>
        </Space>
      </div>

      <div className="filter-bar" style={{ display:'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, marginTop: 8 }}>
        <Input prefix={<SearchOutlined />} placeholder="搜索编号/名称/公司" value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: 220 }} allowClear
        />
        <Input placeholder="公司名称" value={applicantCompany}
          onChange={e => { setApplicantCompany(e.target.value); setPage(1); }} style={{ width: 150 }} allowClear
        />
        <Select allowClear placeholder="按状态筛选" value={statusFilter}
          onChange={v => { setStatusFilter(v); setPage(1); }} style={{ width: 120 }}>
          {ALL_STATUSES.map(s =>
            <Select.Option key={s} value={s}>{s}</Select.Option>
          )}
        </Select>
        <RangePicker value={dateRange} onChange={d => { setDateRange(d); setPage(1); }} placeholder={['期望日起', '期望日止']} />
        <Button icon={<ReloadOutlined />} onClick={() => { setSearch(''); setApplicantCompany(''); setStatusFilter(undefined); setDateRange(null); setPage(1); }}>重置</Button>
      </div>

      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} size="middle"
        pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: t => `共 ${t} 条` }}
      />

      {/* Detail Modal */}
      <Modal title="样品详情" open={detailModal.open} onCancel={() => setDetailModal({...detailModal, open: false})} footer={null} width={720}>
        {detailModal.data && (
          <div>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="申请编号">{detailModal.data.request_no}</Descriptions.Item>
              <Descriptions.Item label="名称">{detailModal.data.title}</Descriptions.Item>
              <Descriptions.Item label="状态" span={2}><StatusTag status={detailModal.data.status} /></Descriptions.Item>
              <Descriptions.Item label="申请人">{detailModal.data.applicant_name}</Descriptions.Item>
              <Descriptions.Item label="公司">{detailModal.data.applicant_company || '-'}</Descriptions.Item>
              <Descriptions.Item label="职务">{detailModal.data.applicant_title || '-'}</Descriptions.Item>
              <Descriptions.Item label="联系方式">{detailModal.data.applicant_phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="邮箱">{detailModal.data.applicant_email || '-'}</Descriptions.Item>
              <Descriptions.Item label="地址">{detailModal.data.applicant_address || '-'}</Descriptions.Item>
              <Descriptions.Item label="提交时间">{detailModal.data.created_at ? dayjs(detailModal.data.created_at).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
              <Descriptions.Item label="行业">{detailModal.data.industry_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="期望日">{detailModal.data.expected_date}</Descriptions.Item>
              <Descriptions.Item label="紧急程度">{detailModal.data.urgency}</Descriptions.Item>
              <Descriptions.Item label="用途" span={2}>{detailModal.data.purpose}</Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>{detailModal.data.remark || '-'}</Descriptions.Item>
            </Descriptions>

            {/* Industry-specific fields */}
            {detailModal.data.industry && detailModal.data.fieldValues && Object.keys(detailModal.data.fieldValues).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ marginBottom: 8, fontSize: 14 }}>行业专属信息 — {detailModal.data.industry.name}</h4>
                <Descriptions column={2} bordered size="small">
                  {detailModal.data.industryFields
                    .filter(f => detailModal.data.fieldValues[f.field_key])
                    .map(f => (
                      <Descriptions.Item label={f.field_label} key={f.field_key}>
                        {detailModal.data.fieldValues[f.field_key] || '-'}
                      </Descriptions.Item>
                    ))}
                </Descriptions>
              </div>
            )}

            {/* Product Items */}
            {detailModal.data.items && detailModal.data.items.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ marginBottom: 8 }}>产品清单</h4>
                <Table dataSource={detailModal.data.items} rowKey="id" size="small" pagination={false}
                  columns={[
                    { title: '序号', width: 50, render: (_, __, i) => i + 1 },
                    { title: '样品类型', dataIndex: 'sample_type_name', width: 120 },
                    { title: '规格型号', dataIndex: 'specification', ellipsis: true },
                    { title: '数量', dataIndex: 'quantity', width: 60, render: (v, r) => `${v} ${r.unit}` },
                  ]}
                />
              </div>
            )}

            {/* Attachments */}
            {detailModal.data.attachments && detailModal.data.attachments.length > 0 && (
              <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f5f5f5', borderRadius: 6 }}>
                <span style={{ fontWeight: 500 }}>附件：</span>
                {detailModal.data.attachments.map(a => (
                  <Tag key={a.id} style={{ margin: '2px 4px' }}>{a.filename}</Tag>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Status Change Modal */}
      <Modal title="状态变更" open={statusModal.open}
        onCancel={() => setStatusModal({...statusModal, open: false, sample: null})}
        onOk={handleStatusChange} okText="确认变更">
        {statusModal.sample && (
          <div>
            <p style={{ marginBottom: 12 }}>
              样品：<strong>{statusModal.sample.title}</strong>（{statusModal.sample.request_no}）
            </p>
            <p style={{ marginBottom: 8 }}>
              当前状态：<StatusTag status={statusModal.sample.status} />
            </p>

            {/* Target status selector */}
            {STATUS_TRANSITIONS[statusModal.sample.status]?.length > 1 ? (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>目标状态</div>
                <Radio.Group value={targetStatus} onChange={e => setTargetStatus(e.target.value)}>
                  {STATUS_TRANSITIONS[statusModal.sample.status].map(s => (
                    <Radio.Button key={s} value={s}>
                      {s === '已批准' ? <><CheckCircleOutlined style={{color:'#52c41a'}} /> 已批准</>
                        : s === '已驳回' ? <><CloseCircleOutlined style={{color:'#ff4d4f'}} /> 已驳回</>
                        : s}
                    </Radio.Button>
                  ))}
                </Radio.Group>
              </div>
            ) : (
              <p style={{ marginBottom: 16 }}>
                目标状态：<StatusTag status={targetStatus} />
              </p>
           )}
            {targetStatus === '已发货' && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>物流信息</div>
                <Select placeholder="选择承运商" value={trackingCarrier || undefined}
                  onChange={v => setTrackingCarrier(v)} style={{ width: '100%', marginBottom: 8 }}
                  allowClear>
                  {CARRIERS.map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
                </Select>
                <Input placeholder="输入物流单号" value={trackingNo}
                  onChange={e => setTrackingNo(e.target.value)} />
              </div>
            )}

            <TextArea rows={3}
              placeholder={targetStatus === '已驳回' ? '请填写驳回原因（必填）' : '备注（可选）'}
              value={remark}
              onChange={e => setRemark(e.target.value)}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
