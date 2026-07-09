import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Spin, Button, Timeline, Space, Modal, Input, message, Empty, Table } from 'antd';
import { ArrowLeftOutlined, CheckOutlined, CloseOutlined, PaperClipOutlined, PhoneOutlined, MailOutlined, EnvironmentOutlined, TeamOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { getRequest, cancelRequest, approvalAction, updateSampleStatus, getSampleTypes } from '../api';
import { StatusTag, UrgencyTag, statusConfig } from '../components/StatusTag';
import dayjs from 'dayjs';

const { TextArea } = Input;

const statusColorMap = {
  '待审批': 'blue', '已批准': 'green', '制作中': 'orange',
  '已完成': 'cyan', '已签收': 'purple', '已驳回': 'red', '已取消': 'default', '草稿': 'default',
};

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approvalModal, setApprovalModal] = useState({ open: false, action: '' });
  const [statusModal, setStatusModal] = useState({ open: false, status: '' });
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const data = await getRequest(id);
      setRequest(data);
    } catch { message.error('加载失败'); navigate('/requests'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [id]);

  const isOperator = ['operator','admin','super_admin'].includes(user?.role);
  const isApprover = ['approver','admin','super_admin'].includes(user?.role);

  const handleApproval = async () => {
    setSubmitting(true);
    try {
      await approvalAction(id, approvalModal.action, comment);
      message.success(`已${approvalModal.action}`);
      setApprovalModal({ open: false, action: '' });
      setComment('');
      loadData();
    } catch (err) { message.error(err.response?.data?.error || '操作失败'); }
    finally { setSubmitting(false); }
  };

  const handleStatusChange = async () => {
    setSubmitting(true);
    try {
      await updateSampleStatus(id, statusModal.status, comment);
      message.success('状态已更新');
      setStatusModal({ open: false, status: '' });
      setComment('');
      loadData();
    } catch (err) { message.error(err.response?.data?.error || '操作失败'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <Spin size="large" style={{ display:'block', margin:'100px auto' }} />;
  if (!request) return <Empty description="申请不存在" />;

  const statusTransitions = {
    '已批准': '制作中',
    '制作中': '已完成',
    '已完成': '已签收',
  };

  // Build fieldLabel map from industryFields
  const fieldLabelMap = {};
  if (request.industryFields) {
    request.industryFields.forEach(f => { fieldLabelMap[f.field_key] = f.field_label; });
  }

  const itemColumns = [
    { title: '序号', width: 50, render: (_, __, i) => i + 1 },
    { title: '样品类型', dataIndex: 'sample_type_name', width: 120 },
    { title: '规格型号', dataIndex: 'specification', ellipsis: true },
    { title: '数量', dataIndex: 'quantity', width: 60, render: (v, r) => `${v}${r.unit}` },
  ];

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 16, padding: 0 }}>返回</Button>

      {/* Header */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, display:'inline' }}>{request.title}</h2>
            <span style={{ marginLeft: 12 }}><StatusTag status={request.status} /></span>
            {request.urgency !== '普通' && <span style={{ marginLeft: 8 }}><UrgencyTag urgency={request.urgency} /></span>}
          </div>
          <Tag style={{ fontFamily:'monospace', fontSize: 13 }} color="blue">{request.request_no}</Tag>
        </div>
      </Card>

      {(request.applicant_company || request.applicant_name || request.applicant_phone || request.applicant_email) && (
        <Card title="申请人信息" style={{ marginBottom: 16 }}>
          <Descriptions column={2} bordered size="small">
            {request.applicant_company && <Descriptions.Item label={<><TeamOutlined /> 公司名称</>}>{request.applicant_company}</Descriptions.Item>}
            <Descriptions.Item label="姓名">{request.applicant_name}</Descriptions.Item>
            {request.applicant_title && <Descriptions.Item label="职务">{request.applicant_title}</Descriptions.Item>}
            {request.applicant_phone && <Descriptions.Item label={<><PhoneOutlined /> 联系方式</>}>{request.applicant_phone}</Descriptions.Item>}
            {request.applicant_email && <Descriptions.Item label={<><MailOutlined /> 邮箱</>}>{request.applicant_email}</Descriptions.Item>}
            {request.applicant_address && <Descriptions.Item label={<><EnvironmentOutlined /> 地址</>} span={2}>{request.applicant_address}</Descriptions.Item>}
          </Descriptions>
        </Card>
      )}

      

{/* Basic Info */}
      <Card title="基本信息" style={{ marginBottom: 16 }}>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="申请编号">
            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{request.request_no}</span>
          </Descriptions.Item>
          <Descriptions.Item label="行业">{request.industry_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="申请目的" span={2}>{request.purpose || '-'}</Descriptions.Item>
          <Descriptions.Item label="期望完成日">{request.expected_date}</Descriptions.Item>
          <Descriptions.Item label="紧急程度">{request.urgency}</Descriptions.Item>
          <Descriptions.Item label="项目编号">{request.project_code || '-'}</Descriptions.Item>
          <Descriptions.Item label="提交时间">{dayjs(request.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          <Descriptions.Item label="备注" span={2}>{request.remark || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Industry-specific fields */}
      {request.industry && (
        <Card title={`行业专属信息 — ${request.industry.name}`} style={{ marginBottom: 16 }}>
          {request.fieldValues && Object.keys(request.fieldValues).length > 0 ? (
            <Descriptions column={2} bordered size="small">
              {Object.entries(request.fieldValues).map(([key, val]) => (
                <Descriptions.Item label={fieldLabelMap[key] || key} key={key}>
                  {String(val || '-')}
                </Descriptions.Item>
              ))}
            </Descriptions>
          ) : (
            <div style={{ color: '#999', padding: 8 }}>该申请未填写行业专属字段</div>
          )}
        </Card>
      )}

      {/* Product Items */}
      {request.items && request.items.length > 0 && (
        <Card title={`产品清单（${request.items.length} 项）`} style={{ marginBottom: 16 }}>
          <Table dataSource={request.items} rowKey="id" size="small" pagination={false} columns={itemColumns} />
        </Card>
      )}

      {/* Applicant Info */}
      {/* Attachments */}
      {request.attachments && request.attachments.length > 0 && (
        <Card title={`附件（${request.attachments.length} 个）`} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {request.attachments.map(a => (
              <Tag key={a.id} icon={<PaperClipOutlined />} style={{ padding: '4px 12px', fontSize: 13 }}>
                {a.filename}
                <span style={{ color: '#999', marginLeft: 8, fontSize: 11 }}>
                  {(a.file_size / 1024).toFixed(1)}KB
                </span>
              </Tag>
            ))}
          </div>
        </Card>
      )}

      {/* Approval Actions */}
      {request.status === '待审批' && isApprover && (
        <Card title="审批操作" style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <TextArea rows={3} placeholder="审批意见（可选）" value={comment} onChange={e => setComment(e.target.value)} />
            <Space>
              <Button type="primary" icon={<CheckOutlined />} onClick={() => setApprovalModal({ open: true, action: '通过' })}>通过</Button>
              <Button danger icon={<CloseOutlined />} onClick={() => setApprovalModal({ open: true, action: '驳回' })}>驳回</Button>
            </Space>
          </Space>
        </Card>
      )}

      {/* Status Change (Operator) */}
      {isOperator && statusTransitions[request.status] && (
        <Card title="状态操作" style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <TextArea rows={2} placeholder="操作备注（可选）" value={comment} onChange={e => setComment(e.target.value)} />
            <Button type="primary" onClick={() => setStatusModal({ open: true, status: statusTransitions[request.status] })}>
              标记为「{statusTransitions[request.status]}」
            </Button>
          </Space>
        </Card>
      )}

      {/* Cancel */}
      {['草稿','待审批'].includes(request.status) && user.id === request.applicant_id && (
        <div style={{ marginBottom: 16 }}>
          <Button danger onClick={() => { Modal.confirm({ title:'确认取消？', content:'取消后无法恢复', onOk: async () => { await cancelRequest(id); message.success('已取消'); loadData(); }}); }}>
            取消申请
          </Button>
        </div>
      )}

      {/* Timeline/Approval History */}
      <Card title="进度追踪" style={{ marginBottom: 16 }}>
        {request.tracking?.length > 0 ? (
          <Timeline items={request.tracking.map(t => ({
            color: statusColorMap[t.to_status] || 'gray',
            children: <div><strong>{t.to_status}</strong> · {t.operator_name}<br /><span style={{ fontSize:12, color:'#999' }}>{dayjs(t.operated_at).format('MM-DD HH:mm')} {t.remark && `— ${t.remark}`}</span></div>
          }))} />
        ) : <Empty description="暂无进度记录" />}
      </Card>

      {/* Approval Records */}
      {request.approvals?.length > 0 && (
        <Card title="审批记录" style={{ marginBottom: 16 }}>
          <Timeline items={request.approvals.map(a => ({
            color: a.action === '通过' ? 'green' : a.action === '驳回' ? 'red' : 'blue',
            children: <div><strong>{a.approver_name}</strong> · {a.action}<br /><span style={{ fontSize:12, color:'#999' }}>{dayjs(a.signed_at).format('MM-DD HH:mm')} {a.comment && `— ${a.comment}`}</span></div>
          }))} />
        </Card>
      )}
    </div>
  );
}
