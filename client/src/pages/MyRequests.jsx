import React, { useState, useEffect } from 'react';
import { Table, Card, Select, Input, Space, Tag, Button } from 'antd';
import { SearchOutlined, UnorderedListOutlined, FileTextOutlined, PaperClipOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getRequests } from '../api';
import { StatusTag, UrgencyTag } from '../components/StatusTag';
import dayjs from 'dayjs';

export default function MyRequests() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState(undefined);
  const [searchKeyword, setSearchKeyword] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const params = { page, pageSize: 20 };
      if (statusFilter) params.status = statusFilter;
      if (searchKeyword) params.search = searchKeyword;
      const res = await getRequests(params);
      setData(res.list);
      setTotal(res.total);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [page, statusFilter, searchKeyword]);

  const columns = [
    { title: '编号', dataIndex: 'request_no', key: 'request_no', width: 160,
      render: (t, r) => <a onClick={() => navigate(`/requests/${r.id}`)} style={{fontFamily:'monospace', fontSize:13}}>{t}</a>
    },
    { title: '申请标题', dataIndex: 'title', key: 'title', ellipsis: true,
      render: (t, r) => <a onClick={() => navigate(`/requests/${r.id}`)}>{t}</a>
    },
    { title: '申请人', dataIndex: 'applicant_name', key: 'applicant', width: 90,
      render: (n, r) => <span>{n}<br/><small style={{color:'#999'}}>{r.applicant_company || ''}</small></span>
    },
    { title: '行业', dataIndex: 'industry_name', key: 'industry', width: 100,
      render: v => v ? <Tag color="blue" style={{fontSize:11}}>{v}</Tag> : '-'
    },
    { title: '产品', dataIndex: 'item_count', key: 'items', width: 60, align: 'center',
      render: v => <Tag color="orange">{v || 1}</Tag>
    },
    { title: '附件', dataIndex: 'attachment_count', key: 'attachments', width: 60, align: 'center',
      render: v => v ? <span><PaperClipOutlined /> {v}</span> : '-'
    },
    { title: '紧急程度', dataIndex: 'urgency', key: 'urgency', width: 80,
      render: u => <UrgencyTag urgency={u} />
    },
    { title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: s => <StatusTag status={s} />
    },
    { title: '提交时间', dataIndex: 'created_at', key: 'created_at', width: 150,
      render: t => dayjs(t).format('YYYY-MM-DD HH:mm')
    },
    { title: '操作', key: 'action', width: 70,
      render: (_, r) => <Button type="link" onClick={() => navigate(`/requests/${r.id}`)}>详情</Button>
    },
  ];

  return (
    <div>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>样品申请</h2>
        <Space>
          <Input
            placeholder="搜索编号/标题/公司…"
            prefix={<SearchOutlined />}
            value={searchKeyword}
            onChange={e => { setSearchKeyword(e.target.value); setPage(1); }}
            style={{ width: 240 }}
            allowClear
          />
          <Select
            placeholder="状态筛选"
            value={statusFilter}
            onChange={v => { setStatusFilter(v); setPage(1); }}
            style={{ width: 140 }}
            allowClear
          >
            <Select.Option value="待审批">待审批</Select.Option>
            <Select.Option value="已批准">已批准</Select.Option>
            <Select.Option value="制作中">制作中</Select.Option>
            <Select.Option value="已完成">已完成</Select.Option>
            <Select.Option value="已签收">已签收</Select.Option>
            <Select.Option value="已驳回">已驳回</Select.Option>
            <Select.Option value="已取消">已取消</Select.Option>
          </Select>
        </Space>
      </div>

      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: 20,
          total,
          showTotal: t => `共 ${t} 条`,
          onChange: p => setPage(p),
        }}
        locale={{ emptyText: '暂无样品申请记录' }}
        size="middle"
      />
    </div>
  );
}
